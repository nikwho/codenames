import {
  DEFAULT_SETTINGS,
  type Card,
  type CardType,
  type GameRoom,
  type JoinRoomPayload,
  type PlayerDevice,
  type RoomStatus,
  type SanitizedGameState,
  type Settings,
  type SubmitCluePayload,
  type Team
} from "@codenames/shared";
import { pickWords } from "../words.ru.js";

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

const OPPOSITE_TEAM: Record<Team, Team> = {
  red: "blue",
  blue: "red"
};

export function createGame(settingsPatch: Partial<Settings> = {}, roomId = generateRoomId()): GameRoom {
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...settingsPatch });
  const now = Date.now();
  const currentTeam = settings.startingTeam === "random" ? randomTeam() : settings.startingTeam;

  return {
    roomId,
    status: "lobby",
    currentPhase: "lobby",
    cards: [],
    teams: {
      red: { remaining: settings.redCards },
      blue: { remaining: settings.blueCards }
    },
    currentTeam,
    currentClue: null,
    timers: {
      phaseEndsAt: null,
      phaseDurationSeconds: null,
      pausedRemainingMs: null,
      lastStatusBeforePause: null
    },
    players: [],
    settings,
    actionLog: [],
    winner: null,
    keyRevealed: false,
    createdAt: now,
    updatedAt: now
  };
}

export function addPlayer(room: GameRoom, payload: JoinRoomPayload): PlayerDevice {
  if (payload.role === "spectator" && !room.settings.allowSpectators) {
    throw new GameError("Наблюдатели отключены в настройках комнаты");
  }

  const now = Date.now();
  const existing = findPlayer(room, payload.deviceId);
  if (existing) {
    const previousRole = existing.role;
    existing.name = normalizeName(payload.name, existing.name);
    if (payload.role === "spymaster" && previousRole !== "spymaster" && getSpymasters(room).length >= room.settings.maxSpymasters) {
      throw new GameError(`Максимум загадывающих: ${room.settings.maxSpymasters}`);
    }
    existing.role = payload.role;
    existing.connected = true;
    existing.lastSeenAt = now;
    if (payload.role === "guesser" && !existing.isBaseGuesser && existing.team === "both") {
      existing.team = null;
    }
    if (payload.role === "spectator") {
      existing.team = null;
      existing.isBaseGuesser = false;
    }
    if (payload.role === "spymaster") {
      normalizeSpymasterAssignments(room);
    } else if (previousRole === "spymaster") {
      normalizeSpymasterAssignments(room);
    }
    touch(room);
    addLog(room, `${existing.name} переподключился`);
    return existing;
  }

  if (payload.role === "spymaster" && getSpymasters(room).length >= room.settings.maxSpymasters) {
    throw new GameError(`Максимум загадывающих: ${room.settings.maxSpymasters}`);
  }

  const isBaseGuesser =
    payload.role === "guesser" && !room.players.some((player) => player.role === "guesser" && player.isBaseGuesser);

  const player: PlayerDevice = {
    deviceId: payload.deviceId,
    name: isBaseGuesser ? "Стол" : normalizeName(payload.name, defaultName(payload.role)),
    role: payload.role,
    team: getInitialTeam(room, payload.role, isBaseGuesser),
    isBaseGuesser,
    connected: true,
    joinedAt: now,
    lastSeenAt: now
  };

  room.players.push(player);
  normalizeSpymasterAssignments(room);
  addLog(room, `${player.name} вошел в комнату`);
  touch(room);
  return player;
}

export function markDisconnected(room: GameRoom, deviceId: string): PlayerDevice | null {
  const player = findPlayer(room, deviceId);
  if (!player) {
    return null;
  }

  player.connected = false;
  player.lastSeenAt = Date.now();
  touch(room);
  return player;
}

export function chooseTeam(room: GameRoom, deviceId: string, team: Team): PlayerDevice {
  const player = requirePlayer(room, deviceId);
  if (player.role !== "guesser") {
    throw new GameError("Команду отгадывающих может выбрать только отгадывающий");
  }
  if (player.isBaseGuesser) {
    player.team = "both";
  } else {
    player.team = team;
  }
  addLog(room, `${player.name} теперь за команду ${teamLabel(room, team)}`, deviceId);
  touch(room);
  return player;
}

export function chooseSpymasterTeam(room: GameRoom, deviceId: string, team: Team): PlayerDevice {
  const player = requirePlayer(room, deviceId);
  if (player.role !== "spymaster") {
    throw new GameError("Команду загадывающих может выбрать только загадывающий");
  }

  const spymasters = getSpymasters(room);
  if (spymasters.length === 1) {
    player.team = "both";
    addLog(room, `${player.name} может загадывать за обе команды`, deviceId);
    touch(room);
    return player;
  }

  player.team = team;
  const other = spymasters.find((spymaster) => spymaster.deviceId !== deviceId);
  if (other && (other.team === "both" || other.team === null || other.team === team)) {
    other.team = OPPOSITE_TEAM[team];
    addLog(room, `${other.name} закреплен за командой ${teamLabel(room, other.team)}`, other.deviceId);
  }
  addLog(room, `${player.name} закреплен за командой ${teamLabel(room, team)}`, deviceId);
  touch(room);
  return player;
}

export function startGame(room: GameRoom): GameRoom {
  requireStatus(room, ["lobby", "game_over"]);
  const currentTeam = resolveStartingTeam(room.settings);
  const cardCounts = resolveTeamCardCounts(room.settings, currentTeam);
  room.cards = generateCards(room.settings, cardCounts);
  room.winner = null;
  room.keyRevealed = false;
  room.currentClue = null;
  room.currentTeam = currentTeam;
  room.teams = {
    red: { remaining: cardCounts.red },
    blue: { remaining: cardCounts.blue }
  };
  // Familiarization is merged into the first clue phase: longer timer, no separate phase.
  const firstClueSeconds = room.settings.clueSeconds + room.settings.familiarizationSeconds;
  setPhase(room, "clue_phase", firstClueSeconds);
  addLog(
    room,
    `Игра началась. Первой ходит команда ${teamLabel(room, room.currentTeam)} (${cardCounts[currentTeam]} карточек). Время первой подсказки: ${firstClueSeconds} сек.`
  );
  touch(room);
  return room;
}

export function restartRound(room: GameRoom): GameRoom {
  const players = room.players;
  const actionLog = room.actionLog;
  const roomId = room.roomId;
  const settings = room.settings;
  const createdAt = room.createdAt;
  const fresh = createGame(settings, roomId);
  Object.assign(room, fresh, { players, actionLog, createdAt });
  addLog(room, "Раунд перезапущен");
  return startGame(room);
}

export function newGame(room: GameRoom): GameRoom {
  return restartRound(room);
}

export function submitClue(room: GameRoom, deviceId: string, payload: SubmitCluePayload): GameRoom {
  requireStatus(room, ["clue_phase"]);
  const player = requirePlayer(room, deviceId);
  if (player.role !== "spymaster") {
    throw new GameError("Подсказку может дать только загадывающий");
  }
  if (!canSpymasterAct(player, room.currentTeam)) {
    throw new GameError("Этот загадывающий не может давать подсказку за активную команду");
  }

  const text = payload.text.trim();
  if (!text) {
    throw new GameError("Подсказка не может быть пустой");
  }

  room.currentClue = {
    text,
    givenByDeviceId: deviceId,
    givenAt: Date.now()
  };
  setPhase(room, "guessing_phase", room.settings.guessingSeconds);
  addLog(room, `${player.name} дал подсказку: ${text}`, deviceId);
  touch(room);
  return room;
}

export function revealCard(room: GameRoom, deviceId: string, cardId: string): GameRoom {
  requireStatus(room, ["guessing_phase"]);
  const player = requirePlayer(room, deviceId);
  if (player.role === "spymaster") {
    throw new GameError("Загадывающий не может открывать карточки");
  }
  if (player.role === "spectator") {
    throw new GameError("Наблюдатель не может открывать карточки");
  }
  if (!canGuesserReveal(player, room.currentTeam)) {
    throw new GameError("Нельзя открывать карточки за чужую команду или не в свой ход");
  }

  const card = room.cards.find((item) => item.id === cardId);
  if (!card) {
    throw new GameError("Карточка не найдена");
  }
  if (card.revealed) {
    throw new GameError("Карточка уже открыта");
  }

  card.revealed = true;
  card.revealedByDeviceId = deviceId;
  card.revealedAt = Date.now();
  addLog(room, `${player.name} открыл карточку "${card.word}" (${cardTypeLabel(room, card.type)})`, deviceId);

  if (card.type === "red" || card.type === "blue") {
    room.teams[card.type].remaining = Math.max(0, room.teams[card.type].remaining - 1);
  }

  if (card.type === "assassin" && room.settings.endGameOnAssassin) {
    room.winner = OPPOSITE_TEAM[room.currentTeam];
    setPhase(room, "game_over", null);
    addLog(room, `Открыт убийца. Победила команда ${teamLabel(room, room.winner)}`);
    touch(room);
    return room;
  }

  if (checkWinCondition(room)) {
    touch(room);
    return room;
  }

  if (card.type === room.currentTeam) {
    touch(room);
    return room;
  }

  endTurn(room, card.type === "neutral" ? "Нейтральная карточка завершила ход" : "Карточка соперников завершила ход");
  touch(room);
  return room;
}

export function endTurn(room: GameRoom, reason = "Ход завершен"): GameRoom {
  if (room.status === "game_over") {
    return room;
  }
  room.currentTeam = OPPOSITE_TEAM[room.currentTeam];
  room.currentClue = null;
  setPhase(room, "clue_phase", room.settings.clueSeconds);
  addLog(room, `${reason}. Теперь ходит команда ${teamLabel(room, room.currentTeam)}`);
  touch(room);
  return room;
}

export function checkWinCondition(room: GameRoom): Team | null {
  const redRemaining = room.cards.filter((card) => card.type === "red" && !card.revealed).length;
  const blueRemaining = room.cards.filter((card) => card.type === "blue" && !card.revealed).length;
  room.teams.red.remaining = redRemaining;
  room.teams.blue.remaining = blueRemaining;

  if (redRemaining === 0) {
    room.winner = "red";
  } else if (blueRemaining === 0) {
    room.winner = "blue";
  }

  if (room.winner) {
    setPhase(room, "game_over", null);
    addLog(room, `Победила команда ${teamLabel(room, room.winner)}`);
  }

  return room.winner;
}

export function sanitizeStateForPlayer(room: GameRoom, deviceId: string, options: { revealKeyForDebugView?: boolean } = {}): SanitizedGameState {
  const currentPlayer = room.players.find((player) => player.deviceId === deviceId) ?? null;
  const showKey = room.status === "game_over" || room.keyRevealed || currentPlayer?.role === "spymaster" || options.revealKeyForDebugView;

  return {
    ...room,
    cards: room.cards.map((card) => {
      if (showKey || card.revealed) {
        return { ...card };
      }
      const { type: _type, ...rest } = card;
      return rest;
    }),
    players: room.players.map((player) => ({ ...player })),
    actionLog: [...room.actionLog],
    settings: { ...room.settings, teamNames: { ...room.settings.teamNames } },
    teams: {
      red: { ...room.teams.red },
      blue: { ...room.teams.blue }
    },
    timers: { ...room.timers },
    currentPlayer: currentPlayer ? { ...currentPlayer } : null,
    remainingSeconds: getRemainingSeconds(room)
  };
}

export function updateSettings(room: GameRoom, patch: Partial<Settings>): GameRoom {
  if (room.status !== "lobby") {
    throw new GameError("Настройки можно менять только в лобби");
  }
  room.settings = normalizeSettings({
    ...room.settings,
    ...patch,
    teamNames: {
      ...room.settings.teamNames,
      ...(patch.teamNames ?? {})
    }
  });
  room.teams.red.remaining = room.settings.redCards;
  room.teams.blue.remaining = room.settings.blueCards;
  addLog(room, "Настройки обновлены");
  touch(room);
  return room;
}

export function pauseGame(room: GameRoom): GameRoom {
  if (room.status === "paused" || room.status === "lobby" || room.status === "game_over") {
    throw new GameError("Сейчас нельзя поставить игру на паузу");
  }
  room.timers.pausedRemainingMs = room.timers.phaseEndsAt ? Math.max(0, room.timers.phaseEndsAt - Date.now()) : null;
  room.timers.lastStatusBeforePause = room.status;
  room.status = "paused";
  addLog(room, "Игра поставлена на паузу");
  touch(room);
  return room;
}

export function resumeGame(room: GameRoom): GameRoom {
  if (room.status !== "paused" || !room.timers.lastStatusBeforePause) {
    throw new GameError("Игра не на паузе");
  }
  room.status = room.timers.lastStatusBeforePause;
  room.currentPhase = room.timers.lastStatusBeforePause;
  if (room.timers.pausedRemainingMs !== null) {
    room.timers.phaseEndsAt = Date.now() + room.timers.pausedRemainingMs;
  }
  room.timers.pausedRemainingMs = null;
  room.timers.lastStatusBeforePause = null;
  addLog(room, "Игра продолжена");
  touch(room);
  return room;
}

export function revealKeyAfterGame(room: GameRoom): GameRoom {
  if (room.status !== "game_over") {
    throw new GameError("Ключ можно открыть только после окончания игры");
  }
  room.keyRevealed = true;
  addLog(room, "Ключ открыт для всех игроков");
  touch(room);
  return room;
}

export function resetPlayers(room: GameRoom): GameRoom {
  room.players = [];
  addLog(room, "Список игроков очищен");
  touch(room);
  return room;
}

export function getRemainingSeconds(room: GameRoom): number | null {
  if (room.status === "paused") {
    return room.timers.pausedRemainingMs === null ? null : Math.ceil(room.timers.pausedRemainingMs / 1000);
  }
  if (!room.timers.phaseEndsAt) {
    return null;
  }
  return Math.max(0, Math.ceil((room.timers.phaseEndsAt - Date.now()) / 1000));
}

export function isBaseAdmin(room: GameRoom, deviceId: string): boolean {
  return Boolean(room.players.find((player) => player.deviceId === deviceId && player.isBaseGuesser));
}

export function requireAdmin(room: GameRoom, deviceId: string): void {
  if (!isBaseAdmin(room, deviceId)) {
    throw new GameError("Команда доступна только базовому устройству");
  }
}

export function addLog(room: GameRoom, message: string, deviceId?: string): void {
  room.actionLog.unshift({
    id: cryptoRandomId("log"),
    at: Date.now(),
    message,
    deviceId
  });
  room.actionLog = room.actionLog.slice(0, 80);
}

function resolveStartingTeam(settings: Settings): Team {
  if (settings.startingTeam === "random") {
    return randomTeam();
  }
  return settings.startingTeam;
}

function resolveTeamCardCounts(settings: Settings, startingTeam: Team): Record<Team, number> {
  const majority = Math.max(settings.redCards, settings.blueCards);
  const minority = Math.min(settings.redCards, settings.blueCards);
  return {
    red: startingTeam === "red" ? majority : minority,
    blue: startingTeam === "blue" ? majority : minority
  };
}

function generateCards(settings: Settings, cardCounts: Record<Team, number>): Card[] {
  const total = cardCounts.red + cardCounts.blue + settings.neutralCards + settings.assassinCards;
  if (total !== settings.boardSize) {
    throw new GameError("Сумма карточек в настройках должна совпадать с размером поля");
  }

  const words = pickWords(settings.boardSize);
  const types: CardType[] = [
    ...Array.from<CardType>({ length: cardCounts.red }).fill("red"),
    ...Array.from<CardType>({ length: cardCounts.blue }).fill("blue"),
    ...Array.from<CardType>({ length: settings.neutralCards }).fill("neutral"),
    ...Array.from<CardType>({ length: settings.assassinCards }).fill("assassin")
  ].sort(() => Math.random() - 0.5);

  return words.map((word, index) => ({
    id: `card-${index + 1}`,
    word,
    type: types[index],
    revealed: false
  }));
}

function setPhase(room: GameRoom, status: RoomStatus, seconds: number | null): void {
  room.status = status;
  room.currentPhase = status;
  room.timers.phaseEndsAt = seconds === null ? null : Date.now() + seconds * 1000;
  room.timers.phaseDurationSeconds = seconds;
  room.timers.pausedRemainingMs = null;
  room.timers.lastStatusBeforePause = null;
}

function canGuesserReveal(player: PlayerDevice, currentTeam: Team): boolean {
  if (player.isBaseGuesser) {
    return true;
  }
  return player.team === currentTeam;
}

function canSpymasterAct(player: PlayerDevice, currentTeam: Team): boolean {
  return player.team === "both" || player.team === currentTeam;
}

function requireStatus(room: GameRoom, statuses: RoomStatus[]): void {
  if (!statuses.includes(room.status)) {
    throw new GameError(`Недопустимая фаза: ${room.status}`);
  }
}

function requirePlayer(room: GameRoom, deviceId: string): PlayerDevice {
  const player = findPlayer(room, deviceId);
  if (!player) {
    throw new GameError("Игрок не найден в комнате");
  }
  return player;
}

function findPlayer(room: GameRoom, deviceId: string): PlayerDevice | undefined {
  return room.players.find((player) => player.deviceId === deviceId);
}

function getSpymasters(room: GameRoom): PlayerDevice[] {
  return room.players.filter((player) => player.role === "spymaster");
}

function normalizeSpymasterAssignments(room: GameRoom): void {
  const spymasters = getSpymasters(room);
  if (spymasters.length === 1) {
    spymasters[0].team = "both";
  }
}

function getInitialTeam(room: GameRoom, role: PlayerDevice["role"], isBaseGuesser: boolean): PlayerDevice["team"] {
  if (role === "spectator") {
    return null;
  }
  if (role === "guesser") {
    return isBaseGuesser ? "both" : null;
  }
  return getSpymasters(room).length === 0 ? "both" : null;
}

function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    boardSize: Number(settings.boardSize),
    redCards: Number(settings.redCards),
    blueCards: Number(settings.blueCards),
    neutralCards: Number(settings.neutralCards),
    assassinCards: Number(settings.assassinCards),
    familiarizationSeconds: Number(settings.familiarizationSeconds),
    clueSeconds: Number(settings.clueSeconds),
    guessingSeconds: Number(settings.guessingSeconds),
    maxSpymasters: Number(settings.maxSpymasters),
    holdToConfirmMs: Number(settings.holdToConfirmMs)
  };
}

function normalizeName(name: string, fallback: string): string {
  return name.trim() || fallback;
}

function defaultName(role: PlayerDevice["role"]): string {
  if (role === "spymaster") {
    return "Загадывающий";
  }
  if (role === "spectator") {
    return "Наблюдатель";
  }
  return "Игрок";
}

function teamLabel(room: GameRoom, team: Team): string {
  return room.settings.teamNames[team];
}

function cardTypeLabel(room: GameRoom, type: CardType): string {
  if (type === "red" || type === "blue") {
    return teamLabel(room, type);
  }
  if (type === "assassin") {
    return "убийца";
  }
  return "нейтральная";
}

function randomTeam(): Team {
  return Math.random() < 0.5 ? "red" : "blue";
}

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function cryptoRandomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function touch(room: GameRoom): void {
  room.updatedAt = Date.now();
}
