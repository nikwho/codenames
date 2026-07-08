import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, PlayerRole, ServerToClientEvents } from "@codenames/shared";

// Dev: separate Vite origin → localhost backend. Prod build: same origin via nginx.
const API_URL =
  import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "/");
const DEVICE_KEY = "codenames.deviceId";
const NAME_KEY = "codenames.name";
const ROLE_KEY = "codenames.role";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(API_URL, {
  path: "/socket.io",
  autoConnect: false,
  reconnection: true
});

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function getStoredName(): string {
  return localStorage.getItem(NAME_KEY) ?? "Игрок";
}

export function setStoredName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim() || "Игрок");
}

export function getStoredRole(): PlayerRole {
  const role = localStorage.getItem(ROLE_KEY);
  if (role === "spymaster" || role === "spectator" || role === "guesser") {
    return role;
  }
  return "guesser";
}

export function setStoredRole(role: PlayerRole): void {
  localStorage.setItem(ROLE_KEY, role);
}
