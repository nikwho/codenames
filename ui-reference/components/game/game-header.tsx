"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { Phase } from "@/lib/game/types"
import { Pause } from "lucide-react"

const phaseLabel: Record<Phase, string> = {
  intro: "Ознакомление",
  clue: "Ожидание подсказки",
  guessing: "Отгадывание",
  gameover: "Игра окончена",
}

function fmt(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60)
  const sec = Math.max(0, s) % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export function GameHeader() {
  const { state } = useGame()
  const { activeTeam, phase, timeLeft, settings, paused, winner } = state

  const total =
    phase === "intro"
      ? settings.introSeconds
      : phase === "clue"
        ? settings.clueSeconds
        : settings.guessSeconds
  const pct = total > 0 ? Math.max(0, Math.min(100, (timeLeft / total) * 100)) : 0
  const low = timeLeft <= 15 && phase !== "gameover"

  const turnName =
    winner || phase === "gameover"
      ? "—"
      : activeTeam === "red"
        ? settings.redName
        : settings.blueName

  return (
    <header className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur sm:flex-row sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Сейчас ходит
          </span>
          <span className="flex items-center gap-2 text-lg font-bold">
            <span
              className={cn(
                "size-2.5 rounded-full",
                phase === "gameover"
                  ? "bg-muted-foreground"
                  : activeTeam === "red"
                    ? "bg-team-red"
                    : "bg-team-blue",
              )}
            />
            {turnName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            phase === "gameover"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {phaseLabel[phase]}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex flex-col items-end">
          <span
            className={cn(
              "font-mono text-3xl font-bold tabular-nums sm:text-4xl",
              low ? "text-destructive" : "text-foreground",
              paused && "opacity-50",
            )}
          >
            {fmt(timeLeft)}
          </span>
          <span className="h-1 w-24 overflow-hidden rounded-full bg-border">
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-500",
                low ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
        {paused && (
          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">
            <Pause className="size-3" />
            Пауза
          </span>
        )}
      </div>
    </header>
  )
}
