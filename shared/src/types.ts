export type Team = "red" | "blue";
export type TeamSelection = Team | "both" | null;
export type CardType = Team | "neutral" | "assassin";
export type PlayerRole = "guesser" | "spymaster" | "spectator";
export type DisplayView = "lobby" | "guesser" | "spymaster" | "table";
export type RoomStatus =
  | "lobby"
  | "familiarization"
  | "clue_phase"
  | "guessing_phase"
  | "paused"
  | "game_over";
/** Cumulative Russian word difficulty: easy ⊂ standard ⊂ advanced. */
export type WordDifficulty = "easy" | "standard" | "advanced";
export type WordTheme = "military" | "politics" | "religion" | "soviet" | "nationalities";

export const WORD_THEMES: readonly WordTheme[] = [
  "military",
  "politics",
  "religion",
  "soviet",
  "nationalities"
] as const;

export const WORD_THEME_LABELS: Record<WordTheme, string> = {
  military: "Военная тема",
  politics: "Политика",
  religion: "Религия",
  soviet: "СССР",
  nationalities: "Национальности"
};

export const WORD_DIFFICULTY_LABELS: Record<WordDifficulty, string> = {
  easy: "Лёгкий",
  standard: "Обычный",
  advanced: "Сложный"
};

export interface Card {
  id: string;
  word: string;
  type: CardType;
  revealed: boolean;
  revealedByDeviceId?: string;
  revealedAt?: number;
}

export interface SanitizedCard extends Omit<Card, "type"> {
  type?: CardType;
}

export interface PlayerDevice {
  deviceId: string;
  name: string;
  role: PlayerRole;
  team: TeamSelection;
  isBaseGuesser: boolean;
  connected: boolean;
  joinedAt: number;
  lastSeenAt: number;
}

export interface Clue {
  id: string;
  text: string;
  team: Team;
  givenByDeviceId: string;
  givenAt: number;
}

export interface TeamNames {
  red: string;
  blue: string;
}

export interface Settings {
  familiarizationSeconds: number;
  clueSeconds: number;
  guessingSeconds: number;
  boardSize: number;
  redCards: number;
  blueCards: number;
  neutralCards: number;
  assassinCards: number;
  startingTeam: "random" | Team;
  teamNames: TeamNames;
  wordPack: "ru";
  wordDifficulty: WordDifficulty;
  /** Optional adult lexicon on top of the difficulty pool. */
  includeAdultWords: boolean;
  /** Optional thematic packs mixed into the pool. */
  wordThemes: WordTheme[];
  allowSpectators: boolean;
  enableSounds: boolean;
  showActionLog: boolean;
  autoEndTurnOnNeutral: boolean;
  endGameOnAssassin: boolean;
  maxSpymasters: number;
  holdToConfirmMs: number;
}

export interface ActionLogEntry {
  id: string;
  at: number;
  message: string;
  deviceId?: string;
}

export interface Timers {
  phaseEndsAt: number | null;
  phaseDurationSeconds: number | null;
  pausedRemainingMs: number | null;
  lastStatusBeforePause: Exclude<RoomStatus, "paused"> | null;
}

export interface GameRoom {
  roomId: string;
  status: RoomStatus;
  currentPhase: RoomStatus;
  cards: Card[];
  teams: Record<Team, { remaining: number }>;
  currentTeam: Team;
  currentClue: Clue | null;
  clueHistory: Clue[];
  timers: Timers;
  players: PlayerDevice[];
  settings: Settings;
  actionLog: ActionLogEntry[];
  winner: Team | null;
  keyRevealed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SanitizedGameState extends Omit<GameRoom, "cards"> {
  cards: SanitizedCard[];
  currentPlayer: PlayerDevice | null;
  remainingSeconds: number | null;
}

export interface CreateRoomPayload {
  deviceId?: string;
  name?: string;
  role?: PlayerRole;
}

export interface JoinRoomPayload {
  roomId: string;
  deviceId: string;
  name: string;
  role: PlayerRole;
}

export interface ChooseTeamPayload {
  team: Team;
}

export interface ChooseSpymasterTeamPayload {
  team: Team;
}

export interface SubmitCluePayload {
  text: string;
}

export interface RevealCardPayload {
  cardId: string;
}

export interface UpdateSettingsPayload {
  settingsPatch: Partial<Settings>;
}

export interface SetDisplayViewPayload {
  view: DisplayView;
}

export interface RoomCreatedPayload {
  roomId: string;
}

export interface NewGamePayload {
  roomId: string;
}

export interface ErrorMessagePayload {
  message: string;
}

export interface ClientToServerEvents {
  createRoom: (payload: CreateRoomPayload | undefined, ack?: (payload: RoomCreatedPayload) => void) => void;
  joinRoom: (payload: JoinRoomPayload) => void;
  chooseTeam: (payload: ChooseTeamPayload) => void;
  chooseSpymasterTeam: (payload: ChooseSpymasterTeamPayload) => void;
  startGame: () => void;
  submitClue: (payload: SubmitCluePayload) => void;
  revealCard: (payload: RevealCardPayload) => void;
  endGuessing: () => void;
  updateSettings: (payload: UpdateSettingsPayload) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  newGame: (ack?: (payload: NewGamePayload) => void) => void;
  restartRound: () => void;
  revealKeyAfterGame: () => void;
  resetPlayers: () => void;
  setDisplayView: (payload: SetDisplayViewPayload) => void;
}

export interface ServerToClientEvents {
  roomCreated: (payload: RoomCreatedPayload) => void;
  newGameCreated: (payload: NewGamePayload) => void;
  gameState: (payload: { stateForCurrentPlayer: SanitizedGameState }) => void;
  playerJoined: (payload: { player: PlayerDevice }) => void;
  playerUpdated: (payload: { player: PlayerDevice }) => void;
  actionLogUpdated: (payload: { actionLog: ActionLogEntry[] }) => void;
  timerTick: (payload: { remainingSeconds: number | null }) => void;
  errorMessage: (payload: ErrorMessagePayload) => void;
  gameOver: (payload: { winner: Team }) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  familiarizationSeconds: 120,
  clueSeconds: 120,
  guessingSeconds: 180,
  boardSize: 25,
  redCards: 9,
  blueCards: 8,
  neutralCards: 7,
  assassinCards: 1,
  startingTeam: "random",
  teamNames: {
    red: "Красные",
    blue: "Синие"
  },
  wordPack: "ru",
  wordDifficulty: "standard",
  includeAdultWords: false,
  wordThemes: [],
  allowSpectators: true,
  enableSounds: true,
  showActionLog: true,
  autoEndTurnOnNeutral: true,
  endGameOnAssassin: true,
  maxSpymasters: 2,
  holdToConfirmMs: 2000
};
