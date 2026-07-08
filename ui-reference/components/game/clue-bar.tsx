"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import { Hand, Hourglass, Lightbulb } from "lucide-react"

export function ClueBar() {
  const { state, dispatch } = useGame()
  const { clue, phase, activeTeam, guessesRemaining, settings } = state

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            activeTeam === "red"
              ? "bg-team-red/20 text-team-red"
              : "bg-team-blue/20 text-team-blue",
          )}
        >
          <Lightbulb className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Текущая подсказка
          </span>
          {phase === "guessing" && clue ? (
            <span className="flex items-baseline gap-2">
              <span className="text-xl font-bold uppercase tracking-wide">
                {clue.word}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-sm font-bold",
                  activeTeam === "red"
                    ? "bg-team-red text-team-red-foreground"
                    : "bg-team-blue text-team-blue-foreground",
                )}
              >
                {clue.count}
              </span>
              <span className="text-xs text-muted-foreground">
                осталось попыток: {guessesRemaining}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hourglass className="size-3.5" />
              {phase === "intro"
                ? "Команды знакомятся со словами"
                : phase === "gameover"
                  ? "Игра завершена"
                  : `Ждём подсказку от ведущего ${activeTeam === "red" ? settings.redName : settings.blueName}`}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="secondary"
        size="lg"
        disabled={phase !== "guessing"}
        onClick={() => dispatch({ type: "END_GUESSING" })}
        className="gap-2"
      >
        <Hand className="size-4" />
        Завершить отгадывание
      </Button>
    </div>
  )
}
