"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { Team } from "@/lib/game/types"
import { AlertTriangle, Send } from "lucide-react"
import { useState } from "react"

interface ClueInputProps {
  /** which team this spymaster device is responsible for */
  perspective: Team
  /** true if this device is the only spymaster (controls both teams) */
  single: boolean
}

export function ClueInput({ perspective, single }: ClueInputProps) {
  const { state, dispatch } = useGame()
  const [word, setWord] = useState("")
  const [count, setCount] = useState(2)

  // When single spymaster, they always act for the active team.
  const actingTeam: Team = single ? state.activeTeam : perspective
  const isMyTurn =
    state.activeTeam === actingTeam &&
    state.phase === "clue" &&
    !state.winner &&
    !state.paused
  const teamName =
    actingTeam === "red" ? state.settings.redName : state.settings.blueName

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim() || !isMyTurn) return
    dispatch({ type: "SUBMIT_CLUE", word, count })
    setWord("")
    setCount(2)
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4",
        actingTeam === "red"
          ? "border-team-red/40 bg-team-red/10"
          : "border-team-blue/40 bg-team-blue/10",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              "size-2.5 rounded-full",
              actingTeam === "red" ? "bg-team-red" : "bg-team-blue",
            )}
          />
          Загадываете за: {teamName}
          {single && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-secondary-foreground">
              обе команды
            </span>
          )}
        </span>
      </div>

      {!isMyTurn && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm text-primary">
          <AlertTriangle className="size-4 shrink-0" />
          {state.phase === "guessing"
            ? `Сейчас команда отгадывает. Дождитесь своего хода.`
            : state.winner
              ? "Игра завершена."
              : `Сейчас не ход вашей команды (${teamName}).`}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Слово-подсказка
          </span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            disabled={!isMyTurn}
            placeholder="например, КОСМОС"
            className="h-11 rounded-xl border border-border bg-background px-3 text-base font-semibold uppercase tracking-wide outline-none placeholder:font-normal placeholder:normal-case placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 sm:w-28">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Число
          </span>
          <input
            type="number"
            min={0}
            max={9}
            value={count}
            onChange={(e) => setCount(Math.max(0, Number(e.target.value) || 0))}
            disabled={!isMyTurn}
            className="h-11 rounded-xl border border-border bg-background px-3 text-center font-mono text-lg font-bold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          />
        </label>
      </div>

      <Button type="submit" size="lg" disabled={!isMyTurn || !word.trim()} className="gap-2">
        <Send className="size-4" />
        Отправить подсказку
      </Button>
    </form>
  )
}
