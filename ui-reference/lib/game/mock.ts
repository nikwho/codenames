import type {
  CardColor,
  GameSettings,
  GameState,
  LogEntry,
  Player,
  WordCard,
} from "./types"

export const WORD_POOL = [
  "КОМЕТА",
  "ЯКОРЬ",
  "МОСТ",
  "ТИГР",
  "ОРБИТА",
  "ЗЕРКАЛО",
  "ПУСТЫНЯ",
  "МАЯК",
  "КОРЕНЬ",
  "ГРОЗА",
  "ПЕРО",
  "КЛЮЧ",
  "ВУЛКАН",
  "КАРТА",
  "ФАКЕЛ",
  "СЕВЕР",
  "СТРЕЛА",
  "ОСТРОВ",
  "ЛАБИРИНТ",
  "МОНЕТА",
  "ПАРУС",
  "ЭХО",
  "КРИСТАЛЛ",
  "ТУННЕЛЬ",
  "ФЕНИКС",
]

/** Fixed layout so the demo is stable: 9 red, 8 blue, 7 neutral, 1 assassin */
const COLOR_LAYOUT: CardColor[] = [
  "red",
  "blue",
  "neutral",
  "red",
  "blue",
  "neutral",
  "red",
  "assassin",
  "blue",
  "red",
  "neutral",
  "blue",
  "red",
  "neutral",
  "blue",
  "red",
  "blue",
  "neutral",
  "red",
  "blue",
  "neutral",
  "red",
  "blue",
  "neutral",
  "red",
]

export function createCards(): WordCard[] {
  return WORD_POOL.map((word, i) => ({
    id: i,
    word,
    color: COLOR_LAYOUT[i],
    revealed: false,
  }))
}

export const defaultSettings: GameSettings = {
  introSeconds: 120,
  clueSeconds: 120,
  guessSeconds: 180,
  redName: "Красные",
  blueName: "Синие",
  firstTurn: "red",
  wordTheme: "Классика",
  timerSounds: true,
  showLog: true,
  allowSpectators: true,
  autoPassOnNeutral: true,
  endOnAssassin: true,
}

export const mockPlayers: Player[] = [
  {
    id: "p1",
    name: "Стол",
    role: "guesser",
    team: null,
    online: true,
    isTable: true,
  },
  { id: "p2", name: "Аня", role: "guesser", team: "red", online: true },
  { id: "p3", name: "Максим", role: "spymaster", team: "red", online: true },
  { id: "p4", name: "Лера", role: "guesser", team: "blue", online: true },
  { id: "p5", name: "Дима", role: "spymaster", team: "blue", online: false },
  { id: "p6", name: "Соня", role: "spectator", team: null, online: true },
  { id: "p7", name: "Кирилл", role: "guesser", team: "blue", online: true },
]

const now = () =>
  new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })

export const mockLog: LogEntry[] = [
  { id: "l1", kind: "system", text: "Игра началась", time: "20:41" },
  {
    id: "l2",
    kind: "clue",
    team: "red",
    text: "Красные загадали: «НЕБО 2»",
    time: "20:42",
  },
  {
    id: "l3",
    kind: "reveal",
    team: "red",
    text: "Открыто «КОМЕТА» — красная",
    time: "20:42",
  },
  {
    id: "l4",
    kind: "reveal",
    team: "red",
    text: "Открыто «ОРБИТА» — красная",
    time: "20:43",
  },
  {
    id: "l5",
    kind: "turn",
    team: "blue",
    text: "Ход переходит к синим",
    time: "20:43",
  },
]

export function createInitialState(): GameState {
  const cards = createCards()
  // Pre-reveal a couple of cards so the board looks mid-game in the demo.
  cards[0].revealed = true // КОМЕТА - red
  cards[4].revealed = true // blue
  return {
    roomName: "Пятничный стол",
    roomCode: "K7Q2M",
    cards,
    players: mockPlayers,
    phase: "guessing",
    activeTeam: "red",
    turn: "red",
    clue: { id: "c1", team: "red", word: "КОСМОС", count: 3 },
    guessesRemaining: 3,
    log: mockLog,
    settings: defaultSettings,
    timeLeft: 96,
    paused: false,
    winner: null,
    keyRevealed: false,
  }
}

export function makeLog(
  kind: LogEntry["kind"],
  text: string,
  team?: LogEntry["team"],
): LogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    kind,
    text,
    team,
    time: now(),
  }
}

export function countRemaining(cards: WordCard[], color: CardColor): number {
  return cards.filter((c) => c.color === color && !c.revealed).length
}

export function countTotal(cards: WordCard[], color: CardColor): number {
  return cards.filter((c) => c.color === color).length
}
