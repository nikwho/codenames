import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, PlayerRole, ServerToClientEvents } from "@codenames/shared";

function resolveApiUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_SERVER_PORT ?? "3001";
    return `http://${window.location.hostname}:${port}`;
  }
  return "/";
}

// Dev: same host as Vite (localhost or LAN IP). Prod: same origin via nginx.
const API_URL = resolveApiUrl();
const DEVICE_KEY = "codenames.deviceId";
const NAME_KEY = "codenames.name";
const ROLE_KEY = "codenames.role";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(API_URL, {
  path: "/socket.io",
  autoConnect: false,
  reconnection: true
});

function createDeviceId(): string {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const id = createDeviceId();
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
