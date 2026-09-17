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
  startGuessingWithoutClue,
  submitClue
} from "../src/engine/game.js";
import { updatePlayer } from "../src/engine/game.js";

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
    add(room, "table", "guesser");
    add(room, "spy", "spymaster");
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
    updatePlayer(room, "table", "red-guess", "guesser", "red");

    expect(() => revealCard(room, "red-guess", room.cards[0].id)).toThrow(/чужую команду/);
  });

  it("allows base guesser to reveal in either team's turn", () => {
    const room = guessingRoom("blue");

    expect(() => revealCard(room, "table", room.cards[0].id)).not.toThrow();
  });

  it("ends game when assassin is revealed", () => {
    const room = guessingRoom("red");
    const assassin = room.cards.find((card) => card.type === "assassin");

    revealCard(room, "table", assassin!.id);

    expect(room.status).toBe("game_over");
    expect(room.winner).toBe("blue");
  });

  it("wins when all team's cards are revealed", () => {
    const room = guessingRoom("red");
    const redCards = room.cards.filter((card) => card.type === "red");
    for (const card of redCards.slice(0, -1)) {
      card.revealed = true;
    }

    revealCard(room, "table", redCards.at(-1)!.id);

    expect(room.status).toBe("game_over");
    expect(room.winner).toBe("red");
  });

  it("lets the only spymaster give clues for both teams after switching roles", () => {
    const room = startedRoom();
    room.currentTeam = "blue";
    const spymaster = room.players.find((player) => player.deviceId === "spy")!;

    expect(spymaster.team).toBe("both");
    expect(() => submitClue(room, "spy", { text: "река 2" })).not.toThrow();
  });

  it("requires a guesser and a spymaster for both teams before starting", () => {
    const room = createGame();
    add(room, "table", "guesser");
    expect(() => startGame(room)).toThrow(/ведущий/);

    add(room, "spy", "spymaster");
    expect(() => startGame(room)).not.toThrow();
  });

  it("does not allow two spymasters to serve one team", () => {
    const room = createGame();
    add(room, "table", "guesser");
    add(room, "red-spy", "spymaster");
    add(room, "candidate", "guesser");
    updatePlayer(room, "table", "red-spy", "spymaster", "red");

    expect(() => updatePlayer(room, "table", "candidate", "spymaster", "red")).toThrow(/уже назначен ведущий/);
    expect(room.players.find((player) => player.deviceId === "candidate")?.role).toBe("guesser");
  });

  it("starts guessing without ending turn when clue timer expires", () => {
    const room = startedRoom("red");

    startGuessingWithoutClue(room);

    expect(room.status).toBe("guessing_phase");
    expect(room.currentTeam).toBe("red");
    expect(room.currentClue).toBeNull();
  });

  it("allows one late clue during guessing if no clue was given yet", () => {
    const room = startedRoom("red");
    add(room, "spy", "spymaster");
    startGuessingWithoutClue(room);

    submitClue(room, "spy", { text: "река 2" });

    expect(room.status).toBe("guessing_phase");
    expect(room.currentClue?.text).toBe("река 2");
    expect(room.currentClue?.team).toBe("red");
    expect(room.clueHistory).toHaveLength(1);
  });

  it("rejects duplicate clues for the same turn", () => {
    const room = startedRoom("red");
    add(room, "spy", "spymaster");

    submitClue(room, "spy", { text: "река 2" });

    expect(() => submitClue(room, "spy", { text: "мост 1" })).toThrow(/уже задана/);
  });

  it("validates clue format", () => {
    const room = startedRoom("red");
    add(room, "spy", "spymaster");

    expect(() => submitClue(room, "spy", { text: "река" })).toThrow(/Формат подсказки/);
    expect(() => submitClue(room, "spy", { text: "валидатор 2+1" })).not.toThrow();
  });

  it("rejects clue matching a board word", () => {
    const room = startedRoom("red");
    add(room, "spy", "spymaster");
    room.cards[0].word = "мост";

    expect(() => submitClue(room, "spy", { text: "мост 2" })).toThrow(/совпадать/);
  });

  it("rejects clue close to a board word root", () => {
    const room = startedRoom("red");
    add(room, "spy", "spymaster");
    room.cards[0].word = "машина";

    expect(() => submitClue(room, "spy", { text: "машины 2" })).toThrow(/слишком близка/);
  });

  it("rejects late clue from the other team's spymaster", () => {
    const room = startedRoom("red");
    updatePlayer(room, "table", "spy", "spymaster", "blue");
    startGuessingWithoutClue(room);

    expect(() => submitClue(room, "spy", { text: "мост 1" })).toThrow(/активную команду/);
  });

  it("base guesser keeps a custom name and table flag", () => {
    const room = createGame();
    const player = add(room, "first", "guesser", "Alice");

    expect(player.name).toBe("Alice");
    expect(player.isBaseGuesser).toBe(true);
    expect(player.team).toBe("both");
  });

  it("makes the first joining device the table and the common spymaster", () => {
    const room = createGame();
    const player = add(room, "creator", "spymaster", "Host");

    expect(player.role).toBe("spymaster");
    expect(player.team).toBe("both");
    expect(player.isBaseGuesser).toBe(true);
    expect(player.name).toBe("Host");
  });

  it("automatically fills the smallest playable composition as players join", () => {
    const room = createGame();
    const first = addPlayer(room, { roomId: room.roomId, deviceId: "first", name: "First", role: "guesser" });
    const second = addPlayer(room, { roomId: room.roomId, deviceId: "second", name: "Second", role: "spymaster" });
    const third = addPlayer(room, { roomId: room.roomId, deviceId: "third", name: "Third", role: "spymaster" });

    expect([first.role, first.team]).toEqual(["spymaster", "both"]);
    expect([second.role, second.team]).toEqual(["guesser", "both"]);
    expect([third.role, third.team]).toEqual(["guesser", "both"]);
  });

  it("fills a missing team role before adding another general guesser", () => {
    const room = createGame();
    const first = addPlayer(room, { roomId: room.roomId, deviceId: "first", name: "First", role: "guesser" });
    updatePlayer(room, first.deviceId, first.deviceId, "spymaster", "red");
    const second = addPlayer(room, { roomId: room.roomId, deviceId: "second", name: "Second", role: "guesser" });

    expect([second.role, second.team]).toEqual(["spymaster", "blue"]);
  });
});

function startedRoom(startingTeam: Team = "red"): GameRoom {
  const room = createGame({ startingTeam }, "TEST");
  add(room, "table", "guesser");
  add(room, "spy", "spymaster");
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
  const player = addPlayer(room, {
    roomId: room.roomId,
    deviceId,
    name,
    role
  });
  if (player.role !== role) {
    updatePlayer(room, room.players[0]!.deviceId, deviceId, role, role === "spectator" ? null : "both");
  }
  return room.players.find((item) => item.deviceId === deviceId)!;
}

function count(room: GameRoom, type: "red" | "blue" | "neutral" | "assassin"): number {
  return room.cards.filter((card) => card.type === type).length;
}
