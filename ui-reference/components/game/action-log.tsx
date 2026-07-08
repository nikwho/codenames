"use client"

import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import { ScrollText } from "lucide-react"

export function ActionLog({ className }: { className?: string }) {
  const { state } = useGame()
  if (!state.settings.showLog) return null

  return (
    <section
      aria-label="Лог действий"
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card/60 p-3",
        className,
      )}
    >
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ScrollText className="size-3.5" />
        Лог действий
      </h3>
      <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1 text-sm">
        {state.log.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {entry.time}
            </span>
            <span
              className={cn(
                "size-2 shrink-0 translate-y-1.5 rounded-full",
                entry.team === "red"
                  ? "bg-team-red"
                  : entry.team === "blue"
                    ? "bg-team-blue"
                    : "bg-muted-foreground/50",
              )}
            />
            <span className="leading-snug text-foreground/90">{entry.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
