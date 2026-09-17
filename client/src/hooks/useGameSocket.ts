import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DisplayView,
  PlayerRole,
  SanitizedGameState,
  Settings,
  SubmitCluePayload,
  Team
} from "@codenames/shared";
import {
  getDeviceId,
  getStoredName,
  getStoredRole,
  setStoredName,
  setStoredRole,
  socket
} from "../socket";

export type ConnectionStatus = "loading" | "connected" | "disconnected" | "reconnecting";

export function useGameSocket(roomId: string) {
  const [state, setState] = useState<SanitizedGameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [nextRoomId, setNextRoomId] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);

  const deviceId = useMemo(() => getDeviceId(), []);

  const joinAs = useCallback(
    (name: string, role: PlayerRole) => {
      setStoredName(name);
      setStoredRole(role);
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit("joinRoom", {
        roomId,
        deviceId,
        name,
        role,
        updateProfile: true
      });
    },
    [deviceId, roomId]
  );

  useEffect(() => {
    setState(null);
    setKicked(false);
    setError(null);
    setRemainingSeconds(null);
    setNextRoomId(null);
    let removed = false;
    let heartbeatPending = false;
    let disposed = false;
    const onConnect = () => {
      if (removed) return;
      setConnectionStatus("connected");
      socket.emit("joinRoom", { roomId, deviceId, name: getStoredName(), role: getStoredRole() });
    };
    const onDisconnect = () => setConnectionStatus("disconnected");
    const onReconnectAttempt = () => setConnectionStatus("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on("gameState", ({ stateForCurrentPlayer }) => {
      setState(stateForCurrentPlayer);
      setRemainingSeconds(stateForCurrentPlayer.remainingSeconds);
      if (stateForCurrentPlayer.currentPlayer) setStoredRole(stateForCurrentPlayer.currentPlayer.role);
    });
    socket.on("timerTick", ({ remainingSeconds: nextRemaining }) => {
      setRemainingSeconds(nextRemaining);
    });
    socket.on("errorMessage", ({ message }) => {
      setError(message);
    });
    socket.on("newGameCreated", ({ roomId: createdRoomId }) => {
      setNextRoomId(createdRoomId);
    });
    socket.on("kicked", () => {
      removed = true;
      setKicked(true);
      setState(null);
      setError("Администратор удалил вас из комнаты");
    });
    const onConnectError = () => setConnectionStatus("disconnected");
    socket.on("connect_error", onConnectError);
    const heartbeat = window.setInterval(() => {
      if (!socket.connected || heartbeatPending || removed) return;
      heartbeatPending = true;
      socket.timeout(7000).emit("heartbeat", (error: Error | null) => {
        heartbeatPending = false;
        if (disposed || removed) return;
        if (error) {
          setConnectionStatus("reconnecting");
          socket.disconnect().connect();
        }
      });
    }, 5000);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off("gameState");
      socket.off("timerTick");
      socket.off("errorMessage");
      socket.off("newGameCreated");
      socket.off("kicked");
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [joinAs]);

  return {
    state,
    connectionStatus,
    error,
    remainingSeconds,
    nextRoomId,
    kicked,
    deviceId,
    joinAs,
    chooseTeam: (team: Team) => socket.emit("chooseTeam", { team }),
    chooseSpymasterTeam: (team: Team) => socket.emit("chooseSpymasterTeam", { team }),
    startGame: () => socket.emit("startGame"),
    submitClue: (payload: SubmitCluePayload): Promise<{ ok: boolean; message?: string }> => {
      if (!socket.connected) return Promise.resolve({ ok: false, message: "Нет связи с сервером. Дождитесь подключения" });
      setError(null);
      return new Promise((resolve) => socket.timeout(7000).emit("submitClue", payload, (error: Error | null, result: { ok: boolean; message?: string }) => {
        resolve(error ? { ok: false, message: "Сервер не подтвердил подсказку. Проверьте текущий ход перед повтором" } : result);
      }));
    },
    revealCard: (cardId: string) => socket.emit("revealCard", { cardId }),
    endGuessing: () => socket.emit("endGuessing"),
    pauseGame: () => socket.emit("pauseGame"),
    resumeGame: () => socket.emit("resumeGame"),
    newGame: (onCreated?: (roomId: string) => void) =>
      socket.emit("newGame", ({ roomId: createdRoomId }) => {
        setNextRoomId(createdRoomId);
        onCreated?.(createdRoomId);
      }),
    restartRound: () => socket.emit("restartRound"),
    revealKeyAfterGame: () => socket.emit("revealKeyAfterGame"),
    resetPlayers: () => socket.emit("resetPlayers"),
    updateSettings: (settingsPatch: Partial<Settings>) => socket.emit("updateSettings", { settingsPatch }),
    setDisplayView: (view: DisplayView) => socket.emit("setDisplayView", { view })
  };
}
