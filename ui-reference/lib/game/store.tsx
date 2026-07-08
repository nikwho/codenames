"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react"
import {
  countRemaining,
  createCards,
  createInitialState,
  makeLog,
} from "./mock"
import type {
  GameSettings,
  GameState,
  Team,
  ViewMode,
} from "./types"

type Action =
  | { type: "REVEAL_CARD"; id: number }
  | { type: "SUBMIT_CLUE"; word: string; count: number }
  | { type: "END_GUESSING" }
  | { type: "NEW_GAME" }
  | { type: "RESTART_ROUND" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_PHASE"; phase: GameState["phase"] }
  | { type: "SET_ACTIVE_TEAM"; team: Team }
  | { type: "UPDATE_SETTINGS"; patch: Partial<GameSettings> }
  | { type: "SET_KEY_REVEALED"; value: boolean }
  | { type: "RESET_PLAYERS" }
  | { type: "DEMO_GAMEOVER"; winner: Team }
  | { type: "TICK" }

const other = (t: Team): Team => (t === "red" ? "blue" : "red")

function checkWinner(state: GameState): Team | null {
  if (countRemaining(state.cards, "red") === 0) return "red"
  if (countRemaining(state.cards, "blue") === 0) return "blue"
  return null
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "REVEAL_CARD": {
      if (state.phase !== "guessing" || state.paused) return state
      const card = state.cards.find((c) => c.id === action.id)
      if (!card || card.revealed) return state
      const cards = state.cards.map((c) =>
        c.id === action.id ? { ...c, revealed: true } : c,
      )
      const log = [
        makeLog(
          "reveal",
          `Открыто «${card.word}» — ${
            card.color === "red"
              ? "красная"
              : card.color === "blue"
                ? "синяя"
                : card.color === "neutral"
                  ? "нейтральная"
                  : "убийца"
          }`,
          card.color === "red" || card.color === "blue" ? card.color : undefined,
        ),
        ...state.log,
      ]

      // Assassin
      if (card.color === "assassin" && state.settings.endOnAssassin) {
        return {
          ...state,
          cards,
          phase: "gameover",
          winner: other(state.activeTeam),
          log: [
            makeLog("system", "Открыта карточка-убийца. Игра окончена."),
            ...log,
          ],
        }
      }

      let activeTeam = state.activeTeam
      let turn = state.turn
      let guessesRemaining = state.guessesRemaining
      let phase = state.phase
      let clue = state.clue
      const extraLog = []

      if (card.color === state.activeTeam) {
        guessesRemaining -= 1
        if (guessesRemaining <= 0) {
          activeTeam = other(state.activeTeam)
          turn = activeTeam
          phase = "clue"
          clue = null
          extraLog.push(
            makeLog("turn", `Ход переходит к ${activeTeam === "red" ? "красным" : "синим"}`, activeTeam),
          )
        }
      } else {
        // neutral or opponent's card -> pass turn
        if (card.color === "neutral" && !state.settings.autoPassOnNeutral) {
          // stay, but lose a guess
          guessesRemaining -= 1
        } else {
          activeTeam = other(state.activeTeam)
          turn = activeTeam
          phase = "clue"
          clue = null
          extraLog.push(
            makeLog("turn", `Ход переходит к ${activeTeam === "red" ? "красным" : "синим"}`, activeTeam),
          )
        }
      }

      const next: GameState = {
        ...state,
        cards,
        activeTeam,
        turn,
        guessesRemaining: Math.max(0, guessesRemaining),
        phase,
        clue,
        log: [...extraLog, ...log],
      }

      const winner = checkWinner(next)
      if (winner) {
        return {
          ...next,
          phase: "gameover",
          winner,
          log: [
            makeLog(
              "system",
              `${winner === "red" ? "Красные" : "Синие"} открыли все свои карточки. Победа!`,
              winner,
            ),
            ...next.log,
          ],
        }
      }
      return next
    }

    case "SUBMIT_CLUE": {
      if (!action.word.trim()) return state
      return {
        ...state,
        clue: {
          id: Math.random().toString(36).slice(2),
          team: state.activeTeam,
          word: action.word.trim().toUpperCase(),
          count: action.count,
        },
        phase: "guessing",
        guessesRemaining: action.count + 1,
        timeLeft: state.settings.guessSeconds,
        log: [
          makeLog(
            "clue",
            `${state.activeTeam === "red" ? "Красные" : "Синие"} загадали: «${action.word.trim().toUpperCase()} ${action.count}»`,
            state.activeTeam,
          ),
          ...state.log,
        ],
      }
    }

    case "END_GUESSING": {
      const activeTeam = other(state.activeTeam)
      return {
        ...state,
        activeTeam,
        turn: activeTeam,
        phase: "clue",
        clue: null,
        guessesRemaining: 0,
        timeLeft: state.settings.clueSeconds,
        log: [
          makeLog(
            "turn",
            `${state.activeTeam === "red" ? "Красные" : "Синие"} завершили отгадывание`,
            state.activeTeam,
          ),
          ...state.log,
        ],
      }
    }

    case "NEW_GAME": {
      const first: Team =
        state.settings.firstTurn === "random"
          ? Math.random() > 0.5
            ? "red"
            : "blue"
          : state.settings.firstTurn
      return {
        ...state,
        cards: createCards(),
        phase: "intro",
        activeTeam: first,
        turn: first,
        clue: null,
        guessesRemaining: 0,
        winner: null,
        keyRevealed: false,
        paused: false,
        timeLeft: state.settings.introSeconds,
        log: [makeLog("system", "Новая игра создана")],
      }
    }

    case "RESTART_ROUND": {
      return {
        ...state,
        cards: state.cards.map((c) => ({ ...c, revealed: false })),
        phase: "clue",
        clue: null,
        guessesRemaining: 0,
        winner: null,
        timeLeft: state.settings.clueSeconds,
        log: [makeLog("system", "Раунд перезапущен"), ...state.log],
      }
    }

    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused }

    case "SET_PHASE": {
      const timeLeft =
        action.phase === "intro"
          ? state.settings.introSeconds
          : action.phase === "clue"
            ? state.settings.clueSeconds
            : action.phase === "guessing"
              ? state.settings.guessSeconds
              : state.timeLeft
      return { ...state, phase: action.phase, timeLeft }
    }

    case "SET_ACTIVE_TEAM":
      return { ...state, activeTeam: action.team, turn: action.team }

    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } }

    case "SET_KEY_REVEALED":
      return { ...state, keyRevealed: action.value }

    case "RESET_PLAYERS":
      return {
        ...state,
        players: state.players.map((p) =>
          p.isTable ? p : { ...p, online: false },
        ),
        log: [makeLog("system", "Подключения игроков сброшены"), ...state.log],
      }

    case "DEMO_GAMEOVER": {
      // Reveal the assassin for the losing team to make the board look final.
      return {
        ...state,
        phase: "gameover",
        winner: action.winner,
        paused: false,
        log: [
          makeLog(
            "system",
            `${action.winner === "red" ? "Красные" : "Синие"} победили`,
            action.winner,
          ),
          ...state.log,
        ],
      }
    }

    case "TICK": {
      if (state.paused || state.phase === "gameover") return state
      if (state.timeLeft <= 0) return state
      return { ...state, timeLeft: state.timeLeft - 1 }
    }

    default:
      return state
  }
}

interface GameContextValue {
  state: GameState
  dispatch: Dispatch<Action>
  view: ViewMode
  setView: (v: ViewMode) => void
  /** Team perspective for a non-base spymaster / guesser device */
  perspective: Team
  setPerspective: (t: Team) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const [view, setView] = useState<ViewMode>("lobby")
  const [perspective, setPerspective] = useState<Team>("red")

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000)
    return () => clearInterval(id)
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, view, setView, perspective, setPerspective }),
    [state, view, perspective],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
