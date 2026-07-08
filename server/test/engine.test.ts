import { describe, expect, it } from "vitest";
import type { GameRoom, PlayerRole, Team } from "@codenames/shared";
import {
  addPlayer,
  chooseSpymasterTeam,
  chooseTeam,
  createGame,
  revealCard,
  sanitizeStateForPlayer,
  startGame,
  submitClue
} from "../src/engine/game.js";

describe("game engine", () => {
  it("generates 25 cards", () => {
    const room = startedRoom();
    expect(room.cards).toHaveLength(25);
    expect(new Set(room.cards.map((card) => card.word)).size).toBe(25);
  });

  it("gives 9 cards to starting team and 8 to the other", () => {
    const redFirst = startedRoom("red");
    expect(count(redFirst, "red")).toBe(9);
    expect(count(redFirst, "blue")).toBe(8);
    expect(redFirst.currentTeam).toBe("red");
    expect(redFirst.status).toBe("clue_phase");

    const blueFirst = startedRoom("blue");
    expect(count(blueFirst, "blue")).toBe(9);
    expect(count(blueFirst, "red")).toBe(8);
    expect(blueFirst.currentTeam).toBe("blue");
    expect(blueFirst.status).toBe("clue_phase");

    expect(count(redFirst, "neutral")).toBe(7);
    expect(count(redFirst, "assassin")).toBe(1);
  });

  it("merges familiarization into the first clue phase timer", () => {
    const room = createGame(
      {
        startingTeam: "red",
        clueSeconds: 120,
        familiarizationSeconds: 60
      },
      "TEST"
    );
    startGame(room);

    expect(room.status).toBe("clue_phase");
    expect(room.timers.phaseEndsAt).not.toBeNull();
    const remainingMs = (room.timers.phaseEndsAt ?? 0) - Date.now();
    expect(remainingMs).toBeGreaterThan(170_000);
    expect(remainingMs).toBeLessThanOrEqual(180_000);
  });

  it("lets spymaster see hidden colors", () => {
    const room = startedRoom();
    add(room, "spy", "spymaster");

    const state = sanitizeStateForPlayer(room, "spy");

    expect(state.cards.every((card) => card.type)).toBe(true);
  });

  it("hides unrevealed colors from guesser", () => {
    const room = startedRoom();
    add(room, "guess", "guesser");

    const state = sanitizeStateForPlayer(room, "guess");

    expect(state.cards.every((card) => card.type === undefined)).toBe(true);
  });

  it("does not allow reveal outside guessing phase", () => {
    const room = startedRoom();
    add(room, "base", "guesser");

    expect(() => revealCard(room, "base", room.cards[0].id)).toThrow(/Недопустимая фаза/);
  });

  it("does not allow normal guesser to reveal in another team's turn", () => {
    const room = guessingRoom("blue");
    add(room, "base", "guesser");
    add(room, "red-guess", "guesser");
    chooseTeam(room, "red-guess", "red");

    expect(() => revealCard(room, "red-guess", room.cards[0].id)).toThrow(/чужую команду/);
  });

  it("allows base guesser to reveal in either team's turn", () => {
    const room = guessingRoom("blue");
    add(room, "base", "guesser");

    expect(() => revealCard(room, "base", room.cards[0].id)).not.toThrow();
  });

  it("ends game when assassin is revealed", () => {
    const room = guessingRoom("red");
    add(room, "base", "guesser");
    const assassin = room.cards.find((card) => card.type === "assassin");

    revealCard(room, "base", assassin!.id);

    expect(room.status).toBe("game_over");
    expect(room.winner).toBe("blue");
  });

  it("wins when all team's cards are revealed", () => {
    const room = guessingRoom("red");
    add(room, "base", "guesser");
    const redCards = room.cards.filter((card) => card.type === "red");
    for (const card of redCards.slice(0, -1)) {
      card.revealed = true;
    }

    revealCard(room, "base", redCards.at(-1)!.id);

    expect(room.status).toBe("game_over");
    expect(room.winner).toBe("red");
  });

  it("locks first spymaster to opposite team when second chooses a team", () => {
    const room = createGame();
    add(room, "spy-1", "spymaster");
    add(room, "spy-2", "spymaster");

    chooseSpymasterTeam(room, "spy-2", "red");

    expect(room.players.find((player) => player.deviceId === "spy-1")?.team).toBe("blue");
    expect(room.players.find((player) => player.deviceId === "spy-2")?.team).toBe("red");
  });

  it("lets the only spymaster give clues for both teams after switching roles", () => {
    const room = startedRoom();
    room.currentTeam = "blue";
    add(room, "device", "guesser");
    chooseTeam(room, "device", "red");

    const spymaster = add(room, "device", "spymaster");

    expect(spymaster.team).toBe("both");
    expect(() => submitClue(room, "device", { text: "река 2" })).not.toThrow();
  });

  it("base guesser is named table automatically", () => {
    const room = createGame();
    const player = add(room, "first", "guesser", "Alice");

    expect(player.name).toBe("Стол");
    expect(player.isBaseGuesser).toBe(true);
    expect(player.team).toBe("both");
  });
});

function startedRoom(startingTeam: Team = "red"): GameRoom {
  const room = createGame({ startingTeam }, "TEST");
  startGame(room);
  return room;
}

function guessingRoom(team: Team): GameRoom {
  const room = startedRoom();
  room.status = "guessing_phase";
  room.currentPhase = "guessing_phase";
  room.currentTeam = team;
  return room;
}

function add(room: GameRoom, deviceId: string, role: PlayerRole, name = deviceId) {
  return addPlayer(room, {
    roomId: room.roomId,
    deviceId,
    name,
    role
  });
}

function count(room: GameRoom, type: "red" | "blue" | "neutral" | "assassin"): number {
  return room.cards.filter((card) => card.type === type).length;
}
