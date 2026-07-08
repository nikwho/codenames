export type Team = "red" | "blue"

export type CardColor = "red" | "blue" | "neutral" | "assassin"

export type Role = "guesser" | "spymaster" | "spectator"

export type Phase = "intro" | "clue" | "guessing" | "gameover"

export type ViewMode = "lobby" | "guesser" | "spymaster" | "table"

export interface WordCard {
  id: number
  word: string
  color: CardColor
  revealed: boolean
}

export interface Player {
  id: string
  name: string
  role: Role
  team: Team | null
  online: boolean
  /** Base / main guessing device that controls both teams */
  isTable?: boolean
}

export interface Clue {
  id: string
  team: Team
  word: string
  count: number
}

export interface LogEntry {
  id: string
  kind: "reveal" | "clue" | "turn" | "system"
  team?: Team
  text: string
  time: string
}

export interface GameSettings {
  introSeconds: number
  clueSeconds: number
  guessSeconds: number
  redName: string
  blueName: string
  firstTurn: "random" | "red" | "blue"
  wordTheme: string
  timerSounds: boolean
  showLog: boolean
  allowSpectators: boolean
  autoPassOnNeutral: boolean
  endOnAssassin: boolean
}

export interface GameState {
  roomName: string
  roomCode: string
  cards: WordCard[]
  players: Player[]
  phase: Phase
  activeTeam: Team
  turn: Team
  clue: Clue | null
  guessesRemaining: number
  log: LogEntry[]
  settings: GameSettings
  timeLeft: number
  paused: boolean
  winner: Team | null
  keyRevealed: boolean
}
