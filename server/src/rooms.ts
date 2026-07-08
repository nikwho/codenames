import type { GameRoom } from "@codenames/shared";
import { createGame, endTurn, getRemainingSeconds } from "./engine/game.js";

type RoomChangedCallback = (room: GameRoom) => void;
type TimerTickCallback = (room: GameRoom, remainingSeconds: number | null) => void;

export class RoomStore {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly interval: NodeJS.Timeout;

  constructor(
    private readonly onRoomChanged: RoomChangedCallback,
    private readonly onTimerTick: TimerTickCallback
  ) {
    this.interval = setInterval(() => this.tick(), 1000);
  }

  createRoom(): GameRoom {
    let room = createGame();
    while (this.rooms.has(room.roomId)) {
      room = createGame();
    }
    this.rooms.set(room.roomId, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  setRoom(room: GameRoom): void {
    this.rooms.set(room.roomId, room);
  }

  allRooms(): GameRoom[] {
    return [...this.rooms.values()];
  }

  dispose(): void {
    clearInterval(this.interval);
  }

  private tick(): void {
    for (const room of this.rooms.values()) {
      const remainingSeconds = getRemainingSeconds(room);
      if (room.status !== "lobby" && room.status !== "game_over") {
        this.onTimerTick(room, remainingSeconds);
      }

      if (room.status === "paused" || room.status === "lobby" || room.status === "game_over") {
        continue;
      }
      if (remainingSeconds !== 0) {
        continue;
      }

      if (room.status === "clue_phase") {
        endTurn(room, "Время на подсказку вышло");
      } else if (room.status === "guessing_phase") {
        endTurn(room, "Время на отгадывание вышло");
      }

      this.onRoomChanged(room);
    }
  }
}
