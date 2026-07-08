"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import { Trophy } from "lucide-react"

export function GameOver() {
  const { state, dispatch } = useGame()
  if (state.phase !== "gameover" || !state.winner) return null

  const winner = state.winner
  const name = winner === "red" ? state.settings.redName : state.settings.blueName

  return (
    <div className="flex min-h-[70dvh] items-center justify-center p-4">
      <div className="absolute inset-0 -z-10 bg-black/40" />
      <div
        className={cn(
          "relative flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border-2 p-8 text-center shadow-2xl",
          winner === "red"
            ? "border-team-red bg-team-red/15"
            : "border-team-blue bg-team-blue/15",
        )}
      >
        <span
          className={cn(
            "flex size-20 items-center justify-center rounded-full",
            winner === "red"
              ? "bg-team-red text-team-red-foreground"
              : "bg-team-blue text-team-blue-foreground",
          )}
        >
          <Trophy className="size-10" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Игра окончена
          </p>
          <h2
            className={cn(
              "text-balance text-3xl font-bold",
              winner === "red" ? "text-team-red" : "text-team-blue",
            )}
          >
            Победа команды {name}!
          </h2>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="flex-1"
            onClick={() => dispatch({ type: "NEW_GAME" })}
          >
            Новая игра
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => dispatch({ type: "RESTART_ROUND" })}
          >
            Перезапустить раунд
          </Button>
        </div>
      </div>
    </div>
  )
}
