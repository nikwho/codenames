"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { ViewMode } from "@/lib/game/types"
import {
  Crown,
  Flag,
  Home,
  MonitorSpeaker,
  SlidersHorizontal,
  User,
} from "lucide-react"
import { useState } from "react"

const views: { value: ViewMode; label: string; icon: typeof Home }[] = [
  { value: "lobby", label: "Лобби", icon: Home },
  { value: "guesser", label: "Отгадывающий", icon: User },
  { value: "spymaster", label: "Загадывающий", icon: Crown },
  { value: "table", label: "Стол", icon: MonitorSpeaker },
]

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function DemoSwitcher() {
  const { view, setView, state, dispatch } = useGame()
  const [open, setOpen] = useState(true)

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flag className="size-4" />
            </span>
            <span className="text-sm font-bold">Кодовое Поле</span>
            <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
              демо-прототип
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            {open ? "Скрыть сцены" : "Сцены"}
          </button>
        </div>

        {open && (
          <div className="flex flex-col gap-2 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Экран
              </span>
              {views.map((v) => {
                const Icon = v.icon
                return (
                  <Chip
                    key={v.value}
                    active={view === v.value}
                    onClick={() => setView(v.value)}
                  >
                    <Icon className="size-3.5" />
                    {v.label}
                  </Chip>
                )
              })}
            </div>

            {view !== "lobby" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Сцена
                </span>
                <Chip
                  active={state.activeTeam === "red" && state.phase !== "gameover"}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TEAM", team: "red" })}
                >
                  Ход красных
                </Chip>
                <Chip
                  active={state.activeTeam === "blue" && state.phase !== "gameover"}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TEAM", team: "blue" })}
                >
                  Ход синих
                </Chip>
                <Chip
                  active={state.phase === "clue"}
                  onClick={() => dispatch({ type: "SET_PHASE", phase: "clue" })}
                >
                  Фаза подсказки
                </Chip>
                <Chip
                  active={state.phase === "guessing"}
                  onClick={() => dispatch({ type: "SET_PHASE", phase: "guessing" })}
                >
                  Фаза отгадывания
                </Chip>
                <Chip
                  active={state.phase === "intro"}
                  onClick={() => dispatch({ type: "SET_PHASE", phase: "intro" })}
                >
                  Ознакомление
                </Chip>
                <Chip
                  active={state.phase === "gameover"}
                  onClick={() => dispatch({ type: "DEMO_GAMEOVER", winner: state.activeTeam })}
                >
                  Игра окончена
                </Chip>
                <Chip onClick={() => dispatch({ type: "NEW_GAME" })}>Сброс</Chip>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
