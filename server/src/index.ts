import cors from "cors";
import express, { type Request, type Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { Server, type Socket } from "socket.io";
import type {
  ClientToServerEvents,
  DisplayView,
  GameRoom,
  JoinRoomPayload,
  ServerToClientEvents
} from "@codenames/shared";
import {
  addPlayer,
  chooseSpymasterTeam,
  chooseTeam,
  endTurn,
  GameError,
  isBaseAdmin,
  markDisconnected,
  pauseGame,
  requireAdmin,
  restartRound,
  resumeGame,
  revealCard,
  revealKeyAfterGame,
  sanitizeStateForPlayer,
  startGame,
  submitClue,
  updateSettings,
  resetPlayers
} from "./engine/game.js";
import { RoomStore } from "./rooms.js";

type ServerSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Load KEY=VALUE pairs from .env without overriding existing process.env. */
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }
  for (const rawLine of readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const startedAt = Date.now();

const allowedOrigins = CLIENT_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  try {
    return isPrivateLanHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  },
  methods: ["GET", "POST"]
};

const app = express();
app.use(cors(corsOptions));

function health(_req: Request, res: Response): void {
  res.json({
    ok: true,
    uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
    time: new Date().toISOString()
  });
}

app.get("/health", health);
app.get("/api/health", health);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: "/socket.io/",
  cors: corsOptions
});

const roomStore = new RoomStore(
  (room) => broadcastGameState(room),
  (room, remainingSeconds) => io.to(room.roomId).emit("timerTick", { remainingSeconds })
);

io.on("connection", (socket) => {
  socket.on("createRoom", (_payload, ack) => {
    const room = roomStore.createRoom();
    socket.emit("roomCreated", { roomId: room.roomId });
    ack?.({ roomId: room.roomId });
  });

  socket.on("joinRoom", (payload) => {
    run(socket, () => {
      const room = getRequiredRoom(payload.roomId);
      const normalizedPayload: JoinRoomPayload = {
        ...payload,
        roomId: payload.roomId.toUpperCase()
      };
      for (const joinedRoom of socket.rooms) {
        if (joinedRoom !== socket.id) {
          socket.leave(joinedRoom);
        }
      }
      socket.join(room.roomId);
      socket.data.roomId = room.roomId;
      socket.data.deviceId = payload.deviceId;
      socket.data.displayView ??= defaultDisplayView(payload.role);
      const player = addPlayer(room, normalizedPayload);
      io.to(room.roomId).emit("playerJoined", { player });
      broadcastGameState(room);
    });
  });

  socket.on("setDisplayView", ({ view }) => {
    withCurrentRoom(socket, (room) => {
      socket.data.displayView = view;
      emitGameState(socket, room);
    });
  });

  socket.on("chooseTeam", ({ team }) => {
    withCurrentRoom(socket, (room, deviceId) => {
      const player = chooseTeam(room, deviceId, team);
      io.to(room.roomId).emit("playerUpdated", { player });
      broadcastGameState(room);
    });
  });

  socket.on("chooseSpymasterTeam", ({ team }) => {
    withCurrentRoom(socket, (room, deviceId) => {
      const player = chooseSpymasterTeam(room, deviceId, team);
      io.to(room.roomId).emit("playerUpdated", { player });
      broadcastGameState(room);
    });
  });

  socket.on("startGame", () => {
    withCurrentRoom(socket, (room, deviceId) => {
      requireAdmin(room, deviceId);
      startGame(room);
      broadcastGameState(room);
    });
  });

  socket.on("submitClue", (payload) => {
    withCurrentRoom(socket, (room, deviceId) => {
      submitClue(room, deviceId, payload);
      broadcastGameState(room);
    });
  });

  socket.on("revealCard", ({ cardId }) => {
    withCurrentRoom(socket, (room, deviceId) => {
      revealCard(room, deviceId, cardId);
      broadcastGameState(room);
      if (room.winner) {
        io.to(room.roomId).emit("gameOver", { winner: room.winner });
      }
    });
  });

  socket.on("endGuessing", () => {
    withCurrentRoom(socket, (room, deviceId) => {
      const player = room.players.find((item) => item.deviceId === deviceId);
      if (!player || player.role !== "guesser") {
        throw new GameError("Завершить отгадывание может только отгадывающий");
      }
      if (!player.isBaseGuesser && player.team !== room.currentTeam) {
        throw new GameError("Завершить ход может только активная команда");
      }
      if (room.status !== "guessing_phase") {
        throw new GameError("Сейчас не фаза отгадывания");
      }
      endTurn(room, "Команда завершила отгадывание");
      broadcastGameState(room);
    });
  });

  socket.on("updateSettings", ({ settingsPatch }) => {
    withAdminRoom(socket, (room) => {
      updateSettings(room, settingsPatch);
      broadcastGameState(room);
    });
  });

  socket.on("pauseGame", () => {
    withAdminRoom(socket, (room) => {
      pauseGame(room);
      broadcastGameState(room);
    });
  });

  socket.on("resumeGame", () => {
    withAdminRoom(socket, (room) => {
      resumeGame(room);
      broadcastGameState(room);
    });
  });

  socket.on("newGame", (ack) => {
    withAdminRoom(socket, (room) => {
      const nextRoom = roomStore.createContinuationRoom(room);
      moveSocketsToRoom(room.roomId, nextRoom);
      io.to(nextRoom.roomId).emit("newGameCreated", { roomId: nextRoom.roomId });
      broadcastGameState(nextRoom);
      ack?.({ roomId: nextRoom.roomId });
    });
  });

  socket.on("restartRound", () => {
    withAdminRoom(socket, (room) => {
      restartRound(room);
      broadcastGameState(room);
    });
  });

  socket.on("revealKeyAfterGame", () => {
    withAdminRoom(socket, (room) => {
      revealKeyAfterGame(room);
      broadcastGameState(room);
    });
  });

  socket.on("resetPlayers", () => {
    withAdminRoom(socket, (room) => {
      resetPlayers(room);
      broadcastGameState(room);
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    const deviceId = socket.data.deviceId as string | undefined;
    if (!roomId || !deviceId) {
      return;
    }
    const room = roomStore.getRoom(roomId);
    if (!room) {
      return;
    }
    const player = markDisconnected(room, deviceId);
    if (player) {
      io.to(room.roomId).emit("playerUpdated", { player });
      broadcastGameState(room);
    }
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Codenames server listening on http://${HOST}:${PORT}`);
  if (HOST === "0.0.0.0") {
    console.log(`  LAN clients: http://<this-machine-ip>:${PORT}`);
  }
});

function withAdminRoom(socket: ServerSocket, callback: (room: GameRoom, deviceId: string) => void): void {
  withCurrentRoom(socket, (room, deviceId) => {
    if (!isBaseAdmin(room, deviceId)) {
      throw new GameError("Команда доступна только базовому устройству");
    }
    callback(room, deviceId);
  });
}

function withCurrentRoom(socket: ServerSocket, callback: (room: GameRoom, deviceId: string) => void): void {
  run(socket, () => {
    const roomId = socket.data.roomId as string | undefined;
    const deviceId = socket.data.deviceId as string | undefined;
    if (!roomId || !deviceId) {
      throw new GameError("Сначала подключитесь к комнате");
    }
    callback(getRequiredRoom(roomId), deviceId);
  });
}

function getRequiredRoom(roomId: string): GameRoom {
  const room = roomStore.getRoom(roomId);
  if (!room) {
    throw new GameError("Комната не найдена");
  }
  return room;
}

function broadcastGameState(room: GameRoom): void {
  const socketIds = io.sockets.adapter.rooms.get(room.roomId);
  if (!socketIds) {
    return;
  }

  for (const socketId of socketIds) {
    const roomSocket = io.sockets.sockets.get(socketId) as ServerSocket | undefined;
    const deviceId = roomSocket?.data.deviceId as string | undefined;
    if (!roomSocket || !deviceId) {
      continue;
    }
    emitGameState(roomSocket, room);
    roomSocket.emit("actionLogUpdated", { actionLog: room.actionLog });
  }
}

function moveSocketsToRoom(previousRoomId: string, nextRoom: GameRoom): void {
  const socketIds = io.sockets.adapter.rooms.get(previousRoomId);
  if (!socketIds) {
    return;
  }

  for (const socketId of [...socketIds]) {
    const roomSocket = io.sockets.sockets.get(socketId) as ServerSocket | undefined;
    if (!roomSocket) {
      continue;
    }
    roomSocket.leave(previousRoomId);
    roomSocket.join(nextRoom.roomId);
    roomSocket.data.roomId = nextRoom.roomId;
    roomSocket.data.displayView = "lobby";
  }
}

function emitGameState(socket: ServerSocket, room: GameRoom): void {
  const deviceId = socket.data.deviceId as string | undefined;
  const displayView = socket.data.displayView as DisplayView | undefined;
  if (!deviceId) {
    return;
  }
  socket.emit("gameState", {
    stateForCurrentPlayer: sanitizeStateForPlayer(room, deviceId, {
      revealKeyForDebugView: displayView === "spymaster" || displayView === "table"
    })
  });
}

function defaultDisplayView(role: "guesser" | "spymaster" | "spectator"): DisplayView {
  if (role === "spymaster") {
    return "spymaster";
  }
  return "guesser";
}

function run(socket: ServerSocket, callback: () => void): void {
  try {
    callback();
  } catch (error) {
    const message = error instanceof GameError ? error.message : "Неожиданная ошибка сервера";
    if (!(error instanceof GameError)) {
      console.error(error);
    }
    socket.emit("errorMessage", { message });
  }
}
