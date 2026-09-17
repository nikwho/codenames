import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { io, type Socket } from "socket.io-client";
import WebSocket from "ws";
import type { SanitizedGameState } from "@codenames/shared";

let child: ChildProcess;
let url: string;
const clients: Socket[] = [];
const rawClients: WebSocket[] = [];
beforeAll(async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  url = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "test" }, stdio: "pipe" });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 10000);
    child.once("error", reject);
    child.stdout!.on("data", (data) => { if (String(data).includes("listening")) { clearTimeout(timeout); resolve(); } });
    child.stderr!.on("data", (data) => process.stderr.write(data));
  });
}, 15000);
afterAll(async () => {
  clients.forEach((socket) => socket.disconnect());
  rawClients.forEach((socket) => socket.close());
  if (child && child.exitCode === null) await new Promise<void>((resolve) => { child.once("exit", () => resolve()); child.kill(); });
});

async function connect() {
  const socket = io(url, { autoConnect: false, reconnection: false, transports: ["websocket"] });
  clients.push(socket);
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); socket.connect(); });
  return socket;
}
function state(socket: Socket, predicate: (state: SanitizedGameState) => boolean = () => true): Promise<SanitizedGameState> {
  return new Promise((resolve, reject) => {
    const listener = ({ stateForCurrentPlayer }: { stateForCurrentPlayer: SanitizedGameState }) => {
      if (predicate(stateForCurrentPlayer)) { clearTimeout(timer); socket.off("gameState", listener); resolve(stateForCurrentPlayer); }
    };
    const timer = setTimeout(() => { socket.off("gameState", listener); reject(new Error("State timeout")); }, 20000);
    socket.on("gameState", listener);
  });
}
async function act(socket: Socket, event: string, payload?: unknown) {
  const next = state(socket); socket.emit(event, payload); return next;
}
async function create() {
  const admin = await connect();
  const { roomId } = await admin.timeout(5000).emitWithAck("createRoom", { deviceId: `admin-${admin.id}`, name: "Admin" });
  const adminId = `admin-${admin.id}`;
  await act(admin, "joinRoom", { roomId, deviceId: adminId, name: "Admin", role: "guesser" });
  return { admin, roomId, adminId };
}

describe("Socket.IO multiplayer integration", () => {
  it("acknowledges clues, enforces voting, broadcasts taps and preserves admin permissions", async () => {
    const { admin, roomId, adminId } = await create();
    await act(admin, "chooseTeam", { team: "red" });
    const guesser = await connect();
    await act(guesser, "joinRoom", { roomId, deviceId: "g2", name: "Guesser", role: "guesser" });
    await act(guesser, "chooseTeam", { team: "red" });
    const spy = await connect();
    await act(spy, "joinRoom", { roomId, deviceId: "spy", name: "Spy", role: "spymaster" });
    await act(admin, "updateSettings", { settingsPatch: { startingTeam: "red" } });
    let view = await act(admin, "startGame");
    expect(view.cards.every((card) => card.type === undefined)).toBe(true);
    view = await act(admin, "setDisplayView", { view: "spymaster" });
    expect(view.cards.every((card) => card.type === undefined)).toBe(true);
    const badClue = await spy.timeout(5000).emitWithAck("submitClue", { text: "" });
    expect(badClue.ok).toBe(false); expect(badClue.message).toContain("пустой");
    expect((await spy.timeout(5000).emitWithAck("submitClue", { text: "абракадабра 2" })).ok).toBe(true);
    view = await act(admin, "revealCard", { cardId: view.cards[0].id });
    expect(view.cards[0].revealed).toBe(false); expect(view.pendingReveal).toBeNull();
    const tapped = new Promise<{ cardId: string }>((resolve) => spy.once("cardTapped", resolve));
    guesser.emit("tapCard", { cardId: view.cards[0].id }); expect((await tapped).cardId).toBe(view.cards[0].id);
    view = await act(guesser, "revealCard", { cardId: view.cards[0].id }); expect(view.pendingReveal).not.toBeNull();
    view = await act(guesser, "revealCard", { cardId: view.cards[0].id }); expect(view.pendingReveal).toBeNull();
    const revealed = state(admin, (s) => s.cards[0].revealed);
    await act(guesser, "revealCard", { cardId: view.cards[0].id }); await revealed;
    view = await act(admin, "updatePlayer", { deviceId: adminId, role: "spymaster", team: "red" });
    expect(view.currentPlayer?.isBaseGuesser).toBe(true);
    view = await act(admin, "updateSettings", { settingsPatch: { clueSeconds: 42 } }); expect(view.settings.clueSeconds).toBe(42);
    const kicked = new Promise<void>((resolve) => guesser.once("kicked", resolve));
    await act(admin, "kickPlayer", { deviceId: "g2" }); await kicked;
    const rejected = new Promise<{ message: string }>((resolve) => guesser.once("errorMessage", resolve));
    guesser.emit("joinRoom", { roomId, deviceId: "g2", name: "Guesser", role: "guesser" }); expect((await rejected).message).toContain("удалены");
  }, 15000);

  it("detects a silent spymaster via heartbeat, marks offline and pauses", async () => {
    const { admin, roomId } = await create();
    const raw = new WebSocket(`${url.replace("http", "ws")}/socket.io/?EIO=4&transport=websocket`);
    rawClients.push(raw);
    const joined = state(admin, (s) => s.players.some((p) => p.deviceId === "silent-spy"));
    raw.on("message", (bytes) => {
      const packet = String(bytes);
      if (packet.startsWith("0")) raw.send("40");
      if (packet.startsWith("40")) raw.send(`42${JSON.stringify(["joinRoom", { roomId, deviceId: "silent-spy", name: "Silent spy", role: "spymaster" }])}`);
      // Deliberately omit Engine.IO pong: simulates a silent broken connection.
    });
    await joined;
    await act(admin, "startGame");
    const paused = await state(admin, (s) => s.status === "paused");
    expect(paused.players.find((p) => p.deviceId === "silent-spy")?.connected).toBe(false);
    const returned = await connect();
    const view = await act(returned, "joinRoom", { roomId, deviceId: "silent-spy", name: "Silent spy", role: "guesser" });
    expect(view.currentPlayer?.role).toBe("spymaster"); expect(view.status).toBe("paused");
    expect((await act(admin, "resumeGame")).status).toBe("clue_phase");
  }, 25000);
});
