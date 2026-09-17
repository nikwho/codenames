import {
  DEFAULT_SETTINGS,
  WORD_THEMES,
  type Card,
  type CardType,
  type Clue,
  type GameRoom,
  type JoinRoomPayload,
  type PlayerDevice,
  type RoomStatus,
  type SanitizedGameState,
  type Settings,
  type SubmitCluePayload,
  type Team,
  type PlayerRole,
  type TeamSelection,
  type WordDifficulty,
  type WordTheme
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
    votes: {},
    pendingReveal: null,
    kickedDeviceIds: [],
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
    clueHistory: [],
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

export function createContinuationGame(source: GameRoom, roomId = generateRoomId()): GameRoom {
  const fresh = createGame(source.settings, roomId);
  const now = Date.now();
  fresh.players = source.players.map((player) => ({
    ...player,
    connected: player.connected,
    lastSeenAt: now
  }));
  addLog(fresh, "Создана новая игра с теми же игроками");
  return fresh;
}

export function addPlayer(room: GameRoom, payload: JoinRoomPayload): PlayerDevice {
  if (room.kickedDeviceIds.includes(payload.deviceId)) throw new GameError("Вы удалены из этой комнаты");
  if (!["guesser", "spymaster", "spectator"].includes(payload.role)) throw new GameError("Неизвестная роль");
  const now = Date.now();
  const existing = findPlayer(room, payload.deviceId);
  if (existing) {
    if (payload.updateProfile) {
      if (payload.role !== existing.role) {
        if (room.status !== "lobby" && !existing.isBaseGuesser) throw new GameError("Во время игры роль меняет администратор");
        assignPlayer(room, existing, payload.role, payload.role === "spymaster" ? null : existing.team);
      }
      existing.name = normalizeName(payload.name, existing.name);
    }
    if (!existing.connected) clearVotes(room);
    existing.connected = true;
    existing.lastSeenAt = now;
    touch(room);
    addLog(room, `${existing.name} переподключился`);
    return existing;
  }

  if (payload.role === "spectator" && !room.settings.allowSpectators) throw new GameError("Наблюдатели отключены");
  if (payload.role === "spymaster" && getSpymasters(room).length >= room.settings.maxSpymasters) {
    throw new GameError(`Максимум загадывающих: ${room.settings.maxSpymasters}`);
  }

  // First device in an empty room always becomes the table/admin guesser.
  const isFirstPlayer = room.players.length === 0;
  const role = isFirstPlayer ? "guesser" : payload.role;
  const isBaseGuesser =
    isFirstPlayer ||
    (role === "guesser" && !room.players.some((player) => player.isBaseGuesser));

  const player: PlayerDevice = {
    deviceId: payload.deviceId,
    name: normalizeName(payload.name, isBaseGuesser ? "Стол" : defaultName(role)),
    role,
    team: getInitialTeam(room, role, isBaseGuesser),
    isBaseGuesser,
    connected: true,
    joinedAt: now,
    lastSeenAt: now
  };

  room.players.push(player);
  clearVotes(room);
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
  clearVotes(room);
  if (player.role === "spymaster" && !["paused", "lobby", "game_over"].includes(room.status)) {
    pauseGame(room);
    addLog(room, `${player.name} офлайн. Игра приостановлена`);
  }
  player.lastSeenAt = Date.now();
  touch(room);
  return player;
}

export function chooseTeam(room: GameRoom, deviceId: string, team: Team): PlayerDevice {
  const player = requirePlayer(room, deviceId);
  if (team !== "red" && team !== "blue") throw new GameError("Неизвестная команда");
  if (room.status !== "lobby" && !player.isBaseGuesser) throw new GameError("Во время игры команду меняет администратор");
  if (player.role !== "guesser") {
    throw new GameError("Команду отгадывающих может выбрать только отгадывающий");
  }
  player.team = team;
  clearVotes(room);
  addLog(room, `${player.name} теперь за команду ${teamLabel(room, team)}`, deviceId);
  touch(room);
  return player;
}

export function chooseSpymasterTeam(room: GameRoom, deviceId: string, team: Team): PlayerDevice {
  const player = requirePlayer(room, deviceId);
  if (team !== "red" && team !== "blue") throw new GameError("Неизвестная команда");
  if (room.status !== "lobby" && !player.isBaseGuesser) throw new GameError("Во время игры команду меняет администратор");
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
  if (room.players.some((player) => player.role === "spymaster" && !player.connected)) throw new GameError("Загадывающий офлайн");
  const currentTeam = resolveStartingTeam(room.settings);
  const cardCounts = resolveTeamCardCounts(room.settings, currentTeam);
  room.cards = generateCards(room.settings, cardCounts);
  room.winner = null;
  room.keyRevealed = false;
  room.currentClue = null;
  room.clueHistory = [];
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

export function submitClue(room: GameRoom, deviceId: string, payload: SubmitCluePayload): GameRoom {
  requireStatus(room, ["clue_phase", "guessing_phase"]);
  const player = requirePlayer(room, deviceId);
  if (!player.connected || player.role !== "spymaster") {
    throw new GameError("Подсказку может дать только загадывающий");
  }
  if (!canSpymasterAct(player, room.currentTeam)) {
    throw new GameError("Этот загадывающий не может давать подсказку за активную команду");
  }
  if (room.currentClue) {
    throw new GameError("Подсказка для этого хода уже задана");
  }

  const text = payload.text.trim();
  if (!text) {
    throw new GameError("Подсказка не может быть пустой");
  }
  validateClueText(room, text);

  const clue: Clue = {
    id: cryptoRandomId("clue"),
    text,
    team: room.currentTeam,
    givenByDeviceId: deviceId,
    givenAt: Date.now()
  };
  room.currentClue = clue;
  room.clueHistory.unshift(clue);
  if (room.status === "clue_phase") {
    setPhase(room, "guessing_phase", room.settings.guessingSeconds);
  }
  addLog(room, `${player.name} дал подсказку: ${text}`, deviceId);
  touch(room);
  return room;
}

export function startGuessingWithoutClue(room: GameRoom): GameRoom {
  requireStatus(room, ["clue_phase"]);
  setPhase(room, "guessing_phase", room.settings.guessingSeconds);
  addLog(room, `Время на подсказку вышло. Команда ${teamLabel(room, room.currentTeam)} может отгадывать без подсказки`);
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
  clearVotes(room);
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

  if (card.type === room.currentTeam || (card.type === "neutral" && !room.settings.autoEndTurnOnNeutral)) {
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

export function sanitizeStateForPlayer(room: GameRoom, deviceId: string): SanitizedGameState {
  const currentPlayer = room.players.find((player) => player.deviceId === deviceId) ?? null;
  const showKey = room.status === "game_over" || room.keyRevealed || currentPlayer?.role === "spymaster";
  const { kickedDeviceIds: _kicked, ...publicRoom } = room;

  return {
    ...publicRoom,
    votes: { ...room.votes },
    pendingReveal: room.pendingReveal ? { ...room.pendingReveal } : null,
    cards: room.cards.map((card) => {
      if (showKey || card.revealed) {
        return { ...card };
      }
      const { type: _type, ...rest } = card;
      return rest;
    }),
    players: room.players.map((player) => ({ ...player })),
    actionLog: [...room.actionLog],
    clueHistory: room.clueHistory.map((clue) => ({ ...clue })),
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
  const previous = room.settings;
  room.settings = normalizeSettings({
    ...room.settings,
    ...patch,
    teamNames: {
      ...room.settings.teamNames,
      ...(patch.teamNames ?? {})
    }
  });
  if (room.status === "lobby") {
    room.teams.red.remaining = room.settings.redCards;
    room.teams.blue.remaining = room.settings.blueCards;
  }
  const phase = room.status === "paused" ? room.timers.lastStatusBeforePause : room.status;
  let delta = 0;
  if (phase === "guessing_phase") delta = room.settings.guessingSeconds - previous.guessingSeconds;
  if (phase === "clue_phase") {
    delta = room.settings.clueSeconds - previous.clueSeconds;
    if (room.timers.phaseDurationSeconds === previous.clueSeconds + previous.familiarizationSeconds) delta += room.settings.familiarizationSeconds - previous.familiarizationSeconds;
  }
  if (room.timers.phaseDurationSeconds !== null) room.timers.phaseDurationSeconds += delta;
  if (room.timers.phaseEndsAt !== null) room.timers.phaseEndsAt += delta * 1000;
  if (room.timers.pausedRemainingMs !== null) room.timers.pausedRemainingMs = Math.max(0, room.timers.pausedRemainingMs + delta * 1000);
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
  clearVotes(room);
  addLog(room, "Игра поставлена на паузу");
  touch(room);
  return room;
}

export function resumeGame(room: GameRoom): GameRoom {
  if (room.players.some((player) => player.role === "spymaster" && !player.connected)) {
    throw new GameError("Загадывающий офлайн. Дождитесь подключения или измените состав игроков");
  }
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
  room.players = room.players.filter((player) => player.isBaseGuesser);
  clearVotes(room);
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

  const words = pickWords(settings.boardSize, {
    difficulty: settings.wordDifficulty,
    includeAdult: settings.includeAdultWords,
    themes: settings.wordThemes
  });
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
  clearVotes(room);
  room.status = status;
  room.currentPhase = status;
  room.timers.phaseEndsAt = seconds === null ? null : Date.now() + seconds * 1000;
  room.timers.phaseDurationSeconds = seconds;
  room.timers.pausedRemainingMs = null;
  room.timers.lastStatusBeforePause = null;
}

function canGuesserReveal(player: PlayerDevice, currentTeam: Team): boolean {
  return player.connected && player.role === "guesser" && (player.team === "both" || player.team === currentTeam);
}

function canSpymasterAct(player: PlayerDevice, currentTeam: Team): boolean {
  return player.team === "both" || player.team === currentTeam;
}

function validateClueText(room: GameRoom, text: string): void {
  const match = text.match(/^([а-яёa-z-]+)\s+(\d+)(?:\+\d+|\(\d+\))?$/iu);
  if (!match) {
    throw new GameError("Формат подсказки: слово 2, слово 2+1 или слово 2(1)");
  }

  const clueWord = normalizeClueWord(match[1] ?? "");
  if (clueWord.length < 2) {
    throw new GameError("Подсказка должна содержать слово");
  }

  const clueStem = clueRoot(clueWord);
  for (const card of room.cards) {
    const boardWord = normalizeClueWord(card.word);
    if (clueWord === boardWord) {
      throw new GameError(`Подсказка не может совпадать со словом на поле: ${card.word}`);
    }
    const boardStem = clueRoot(boardWord);
    if (clueStem.length >= 4 && boardStem.length >= 4 && (clueStem.startsWith(boardStem) || boardStem.startsWith(clueStem))) {
      throw new GameError(`Подсказка слишком близка к слову на поле: ${card.word}`);
    }
  }
}

function normalizeClueWord(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^а-яa-z-]/g, "")
    .replace(/^-+|-+$/g, "");
}

function clueRoot(word: string): string {
  const normalized = word.replace(/-/g, "");
  const endings = [
    "иями",
    "ями",
    "ами",
    "ого",
    "ему",
    "ыми",
    "ими",
    "ая",
    "яя",
    "ое",
    "ее",
    "ые",
    "ие",
    "ый",
    "ий",
    "ой",
    "ам",
    "ям",
    "ах",
    "ях",
    "ов",
    "ев",
    "ей",
    "ом",
    "ем",
    "ой",
    "ою",
    "ею",
    "а",
    "я",
    "о",
    "е",
    "ы",
    "и",
    "у",
    "ю"
  ];
  for (const ending of endings) {
    if (normalized.length - ending.length >= 4 && normalized.endsWith(ending)) {
      return normalized.slice(0, -ending.length);
    }
  }
  return normalized;
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
  } else if (spymasters.length === 2) {
    const [first, second] = spymasters;
    if (first.team !== "red" && first.team !== "blue") first.team = second.team === "red" ? "blue" : "red";
    if (second.team !== "red" && second.team !== "blue" || second.team === first.team) second.team = OPPOSITE_TEAM[first.team];
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
  const normalized = {
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
    holdToConfirmMs: Number(settings.holdToConfirmMs),
    wordDifficulty: normalizeWordDifficulty(settings.wordDifficulty),
    includeAdultWords: Boolean(settings.includeAdultWords),
    wordThemes: normalizeWordThemes(settings.wordThemes)
  };
  for (const key of ["boardSize", "redCards", "blueCards", "neutralCards", "assassinCards", "familiarizationSeconds", "clueSeconds", "guessingSeconds", "maxSpymasters"] as const) {
    const value = normalized[key];
    if (!Number.isInteger(value) || value < 0 || value > 86400) throw new GameError(`Некорректное значение настройки: ${key}`);
  }
  if (normalized.redCards < 1 || normalized.blueCards < 1 || normalized.boardSize > 100 || normalized.maxSpymasters < 1 || normalized.maxSpymasters > 16) throw new GameError("Проверьте количество карточек и загадывающих");
  if (normalized.redCards + normalized.blueCards + normalized.neutralCards + normalized.assassinCards !== normalized.boardSize) throw new GameError("Сумма карточек должна совпадать с размером поля");
  if (!["random", "red", "blue"].includes(normalized.startingTeam)) throw new GameError("Некорректная стартовая команда");
  normalized.teamNames = { red: String(normalized.teamNames.red).trim() || "Красные", blue: String(normalized.teamNames.blue).trim() || "Синие" };
  return normalized;
}

function normalizeWordDifficulty(value: Settings["wordDifficulty"] | undefined): WordDifficulty {
  if (value === "easy" || value === "standard" || value === "advanced") {
    return value;
  }
  return DEFAULT_SETTINGS.wordDifficulty;
}

function normalizeWordThemes(value: Settings["wordThemes"] | undefined): WordTheme[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(WORD_THEMES);
  return [...new Set(value.filter((theme): theme is WordTheme => allowed.has(theme)))];
}

function normalizeName(name: string, fallback: string): string {
  return name.trim() || fallback;
}

export function clearVotes(room: GameRoom): void {
  room.votes = {};
  room.pendingReveal = null;
}

export function voteCard(room: GameRoom, deviceId: string, cardId: string): void {
  requireStatus(room, ["guessing_phase"]);
  const player = requirePlayer(room, deviceId);
  if (!canGuesserReveal(player, room.currentTeam)) throw new GameError("Голосует только активная команда онлайн");
  if (getRemainingSeconds(room) === 0) throw new GameError("Время отгадывания истекло");
  const card = room.cards.find((item) => item.id === cardId);
  if (!card || card.revealed) throw new GameError("Карточка недоступна для голосования");
  if (room.votes[deviceId] === cardId) delete room.votes[deviceId];
  else room.votes[deviceId] = cardId;
  const voters = room.players.filter((item) => canGuesserReveal(item, room.currentTeam));
  const unanimous = voters.length > 0 && voters.every((item) => room.votes[item.deviceId] === cardId);
  room.pendingReveal = unanimous ? { cardId, endsAt: Date.now() + 3000 } : null;
  touch(room);
}

export function resolveVotes(room: GameRoom): boolean {
  const pending = room.pendingReveal;
  if (!pending || room.status !== "guessing_phase" || Date.now() < pending.endsAt) return false;
  const voters = room.players.filter((item) => canGuesserReveal(item, room.currentTeam));
  if (getRemainingSeconds(room) === 0 || !voters.length || !voters.every((item) => room.votes[item.deviceId] === pending.cardId)) {
    clearVotes(room);
    return true;
  }
  revealCard(room, voters[0].deviceId, pending.cardId);
  return true;
}

function assignPlayer(room: GameRoom, player: PlayerDevice, role: PlayerRole, team: TeamSelection): void {
  if (!["guesser", "spymaster", "spectator"].includes(role) || !["red", "blue", "both", null].includes(team)) {
    throw new GameError("Некорректная роль или команда");
  }
  if (role === "spymaster" && player.role !== role && getSpymasters(room).length >= room.settings.maxSpymasters) {
    throw new GameError(`Максимум загадывающих: ${room.settings.maxSpymasters}`);
  }
  const oldRole = player.role;
  player.role = role;
  player.team = role === "spectator" ? null : team;
  if (oldRole !== role) normalizeSpymasterAssignments(room);
  if (role !== "spectator" && team !== null) player.team = team;
  clearVotes(room);
  if (role === "spymaster" && !player.connected && !["paused", "lobby", "game_over"].includes(room.status)) pauseGame(room);
  touch(room);
}

export function updatePlayer(room: GameRoom, adminId: string, deviceId: string, role: PlayerRole, team: TeamSelection): void {
  requireAdmin(room, adminId);
  const player = requirePlayer(room, deviceId);
  assignPlayer(room, player, role, team);
  addLog(room, `Администратор изменил роль и команду игрока ${player.name}`, adminId);
}

export function kickPlayer(room: GameRoom, adminId: string, deviceId: string): void {
  requireAdmin(room, adminId);
  const player = requirePlayer(room, deviceId);
  if (player.isBaseGuesser) throw new GameError("Нельзя удалить управляющего игрока");
  markDisconnected(room, deviceId);
  room.players = room.players.filter((item) => item.deviceId !== deviceId);
  room.kickedDeviceIds.push(deviceId);
  normalizeSpymasterAssignments(room);
  clearVotes(room);
  addLog(room, `${player.name} удалён из комнаты`, adminId);
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
