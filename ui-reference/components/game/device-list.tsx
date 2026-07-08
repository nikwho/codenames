"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { Player } from "@/lib/game/types"
import { Crown, Eye, MonitorSpeaker, User } from "lucide-react"

function roleLabel(p: Player): string {
  if (p.isTable) return "Стол"
  if (p.role === "spymaster") return "Загадывающий"
  if (p.role === "spectator") return "Наблюдатель"
  return "Отгадывающий"
}

export function DeviceList() {
  const { state } = useGame()

  return (
    <section
      aria-label="Подключенные устройства"
      className="flex flex-col rounded-2xl border border-border bg-card/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          Устройства
        </h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {state.players.filter((p) => p.online).length} онлайн
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {state.players.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl bg-background/50 px-3 py-2"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                p.isTable
                  ? "bg-primary/20 text-primary"
                  : p.team === "red"
                    ? "bg-team-red/20 text-team-red"
                    : p.team === "blue"
                      ? "bg-team-blue/20 text-team-blue"
                      : "bg-secondary text-muted-foreground",
              )}
            >
              {p.isTable ? (
                <MonitorSpeaker className="size-4" />
              ) : p.role === "spymaster" ? (
                <Crown className="size-4" />
              ) : p.role === "spectator" ? (
                <Eye className="size-4" />
              ) : (
                <User className="size-4" />
              )}
            </span>

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {roleLabel(p)}
                {p.team &&
                  ` · ${p.team === "red" ? state.settings.redName : state.settings.blueName}`}
              </span>
            </div>

            <span className="ml-auto flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "size-2 rounded-full",
                  p.online ? "bg-emerald-400" : "bg-muted-foreground/40",
                )}
              />
              <span
                className={p.online ? "text-emerald-400" : "text-muted-foreground"}
              >
                {p.online ? "online" : "offline"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
