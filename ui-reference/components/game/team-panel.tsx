"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import { countRemaining } from "@/lib/game/mock"
import type { Team } from "@/lib/game/types"
import { Crown, Eye, User, WifiOff } from "lucide-react"

interface TeamPanelProps {
  team: Team
  /** compact = mobile top card */
  compact?: boolean
}

export function TeamPanel({ team, compact = false }: TeamPanelProps) {
  const { state } = useGame()
  const remaining = countRemaining(state.cards, team)
  const name = team === "red" ? state.settings.redName : state.settings.blueName
  const isActive = state.activeTeam === team && state.phase !== "gameover"
  const players = state.players.filter((p) => p.team === team)

  return (
    <section
      aria-label={`Команда ${name}`}
      className={cn(
        "flex flex-col rounded-2xl border p-3 transition-all sm:p-4",
        team === "red"
          ? "border-team-red/40 bg-team-red/10"
          : "border-team-blue/40 bg-team-blue/10",
        isActive &&
          (team === "red"
            ? "ring-2 ring-team-red shadow-[0_0_30px_-8px_var(--team-red)]"
            : "ring-2 ring-team-blue shadow-[0_0_30px_-8px_var(--team-blue)]"),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-3 rounded-full",
              team === "red" ? "bg-team-red" : "bg-team-blue",
            )}
          />
          <h2 className="truncate text-sm font-bold uppercase tracking-wide sm:text-base">
            {name}
          </h2>
        </div>
        {isActive && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
              team === "red"
                ? "bg-team-red text-team-red-foreground"
                : "bg-team-blue text-team-blue-foreground",
            )}
          >
            Ходит
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-4xl font-bold leading-none sm:text-5xl",
            team === "red" ? "text-team-red" : "text-team-blue",
          )}
        >
          {remaining}
        </span>
        <span className="text-xs text-muted-foreground">осталось</span>
      </div>

      {!compact && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {players.length === 0 && (
            <li className="text-xs text-muted-foreground">Нет игроков</li>
          )}
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg bg-background/40 px-2 py-1 text-sm"
            >
              {p.role === "spymaster" ? (
                <Crown className="size-3.5 text-primary" />
              ) : p.role === "spectator" ? (
                <Eye className="size-3.5 text-muted-foreground" />
              ) : (
                <User className="size-3.5 text-muted-foreground" />
              )}
              <span className="truncate">{p.name}</span>
              {p.role === "spymaster" && (
                <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                  ведущий
                </span>
              )}
              {!p.online && (
                <WifiOff className="ml-auto size-3.5 text-destructive" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
