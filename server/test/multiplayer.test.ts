import { afterEach, describe, expect, it, vi } from "vitest";
import { addPlayer, chooseTeam, createGame, endTurn, isBaseAdmin, kickPlayer, markDisconnected, pauseGame, resolveVotes, resumeGame, sanitizeStateForPlayer, startGame, startGuessingWithoutClue, submitClue, updatePlayer, updateSettings, voteCard } from "../src/engine/game.js";
import { RoomStore } from "../src/rooms.js";

function setup() {
  vi.useFakeTimers();
  const room = createGame({ startingTeam: "red" });
  for (const id of ["admin", "g2", "spy"]) addPlayer(room, { roomId: room.roomId, deviceId: id, name: id, role: id === "spy" ? "spymaster" : "guesser" });
  chooseTeam(room, "admin", "red"); chooseTeam(room, "g2", "red");
  startGame(room); startGuessingWithoutClue(room);
  const card = room.cards.find((item) => item.type === "red")!;
  return { room, card };
}
afterEach(() => vi.useRealTimers());

describe("multiplayer voting and roles", () => {
  it("requires every online guesser and a full countdown", () => {
    const { room, card } = setup();
    voteCard(room, "admin", card.id);
    vi.advanceTimersByTime(4000); resolveVotes(room);
    expect(card.revealed).toBe(false);
    voteCard(room, "g2", card.id);
    vi.advanceTimersByTime(2999); resolveVotes(room); expect(card.revealed).toBe(false);
    vi.advanceTimersByTime(1); resolveVotes(room); expect(card.revealed).toBe(true);
    expect(room.votes).toEqual({}); expect(room.pendingReveal).toBeNull();
  });
  it("cancels at the last moment and restarts the full countdown", () => {
    const { room, card } = setup();
    voteCard(room, "admin", card.id); voteCard(room, "g2", card.id);
    vi.advanceTimersByTime(2999); voteCard(room, "g2", card.id);
    vi.advanceTimersByTime(10); resolveVotes(room); expect(card.revealed).toBe(false);
    voteCard(room, "g2", card.id);
    expect(room.pendingReveal?.endsAt).toBe(Date.now() + 3000);
  });
  it("moves one player's vote instead of adding a second", () => {
    const { room, card } = setup();
    const other = room.cards.find((item) => item.id !== card.id)!;
    voteCard(room, "admin", card.id); voteCard(room, "g2", card.id); voteCard(room, "g2", other.id);
    expect(Object.keys(room.votes)).toHaveLength(2); expect(room.pendingReveal).toBeNull();
  });
  it("excludes disconnected voters, requiring fresh agreement after roster changes", () => {
    const { room, card } = setup();
    voteCard(room, "admin", card.id); voteCard(room, "g2", card.id);
    markDisconnected(room, "g2"); expect(room.votes).toEqual({});
    expect(() => voteCard(room, "g2", card.id)).toThrow();
    voteCard(room, "admin", card.id); vi.advanceTimersByTime(3000); resolveVotes(room);
    expect(card.revealed).toBe(true);
  });
  it("rejects spymaster and opposing team votes, including admin", () => {
    const { room, card } = setup();
    expect(() => voteCard(room, "spy", card.id)).toThrow();
    chooseTeam(room, "admin", "blue"); expect(() => voteCard(room, "admin", card.id)).toThrow();
    expect(isBaseAdmin(room, "admin")).toBe(true);
  });
  it("preserves admin rights and server assigned roles through reconnect", () => {
    const { room } = setup();
    updatePlayer(room, "admin", "admin", "spymaster", "red");
    expect(isBaseAdmin(room, "admin")).toBe(true);
    addPlayer(room, { roomId: room.roomId, deviceId: "admin", name: "old", role: "guesser" });
    expect(room.players[0].role).toBe("spymaster");
    updateSettings(room, { clueSeconds: 90 });
  });
  it("does not allow a non-admin to change players or kick", () => {
    const { room } = setup();
    expect(() => updatePlayer(room, "g2", "admin", "spectator", null)).toThrow();
    expect(() => kickPlayer(room, "g2", "spy")).toThrow();
  });
  it("kicks players permanently for that room and clears votes", () => {
    const { room, card } = setup(); voteCard(room, "g2", card.id);
    kickPlayer(room, "admin", "g2"); expect(room.votes).toEqual({});
    expect(() => addPlayer(room, { roomId: room.roomId, deviceId: "g2", name: "g2", role: "guesser" })).toThrow(/удалены/);
    expect(() => kickPlayer(room, "admin", "admin")).toThrow();
  });
  it("pauses when a spymaster goes offline and resumes only after return", () => {
    const { room, card } = setup(); voteCard(room, "admin", card.id); voteCard(room, "g2", card.id);
    markDisconnected(room, "spy"); expect(room.status).toBe("paused");
    expect(() => resumeGame(room)).toThrow(/офлайн/);
    vi.advanceTimersByTime(10000); resolveVotes(room); expect(card.revealed).toBe(false);
    addPlayer(room, { roomId: room.roomId, deviceId: "spy", name: "spy", role: "guesser" });
    expect(room.status).toBe("paused"); resumeGame(room); expect(room.status).toBe("guessing_phase");
    expect(room.votes).toEqual({});
  });
  it("clears votes on pause and turn change", () => {
    const { room, card } = setup(); voteCard(room, "admin", card.id); pauseGame(room);
    expect(room.votes).toEqual({}); resumeGame(room); voteCard(room, "admin", card.id); endTurn(room);
    expect(room.votes).toEqual({});
  });
  it("expires the phase before opening a card at the deadline", () => {
    const { room, card } = setup();
    room.timers.phaseEndsAt = Date.now() + 3000;
    voteCard(room, "admin", card.id); voteCard(room, "g2", card.id);
    const store = new RoomStore(() => {}, () => {}); store.setRoom(room);
    vi.advanceTimersByTime(3000); store.dispose();
    expect(card.revealed).toBe(false); expect(room.currentTeam).toBe("blue");
  });
  it("RoomStore resolves unanimous votes without further client messages", () => {
    const { room, card } = setup();
    const changed = vi.fn(); const store = new RoomStore(changed, () => {}); store.setRoom(room);
    voteCard(room, "admin", card.id); voteCard(room, "g2", card.id); vi.advanceTimersByTime(3000); store.dispose();
    expect(card.revealed).toBe(true); expect(changed).toHaveBeenCalled();
  });
  it("preserves board and updates a live timer by the settings delta", () => {
    const { room } = setup(); const cards = room.cards; const deadline = room.timers.phaseEndsAt!;
    updateSettings(room, { guessingSeconds: 200, redCards: 8, blueCards: 9 });
    expect(room.timers.phaseEndsAt).toBe(deadline + 20000); expect(room.cards).toBe(cards);
    expect(room.teams.red.remaining).toBe(9);
    pauseGame(room); const remaining = room.timers.pausedRemainingMs!;
    updateSettings(room, { guessingSeconds: 210 }); expect(room.timers.pausedRemainingMs).toBe(remaining + 10000);
  });
  it("rejects invalid settings without corrupting the room", () => {
    const { room } = setup(); const settings = room.settings;
    for (const patch of [{ clueSeconds: NaN }, { redCards: -1 }, { redCards: 100 }, { maxSpymasters: 0 }]) expect(() => updateSettings(room, patch)).toThrow();
    expect(room.settings).toBe(settings);
  });
  it("assigns the second spymaster automatically and accepts their clue", () => {
    const { room } = setup();
    addPlayer(room, { roomId: room.roomId, deviceId: "spy2", name: "spy2", role: "spymaster" });
    expect(room.players.find((p) => p.deviceId === "spy")?.team).toBe("red");
    expect(room.players.find((p) => p.deviceId === "spy2")?.team).toBe("blue");
    endTurn(room); submitClue(room, "spy2", { text: "абракадабра 2" }); expect(room.currentClue?.team).toBe("blue");
  });
  it("keeps hidden cards private for admin and spectators", () => {
    const { room } = setup();
    expect(sanitizeStateForPlayer(room, "admin").cards.every((card) => card.type === undefined)).toBe(true);
    updatePlayer(room, "admin", "g2", "spectator", null);
    expect(sanitizeStateForPlayer(room, "g2").cards.every((card) => card.type === undefined)).toBe(true);
  });
});
