"use client"

import { ActionLog } from "../action-log"
import { ClueInput } from "../clue-input"
import { GameBoard } from "../game-board"
import { GameHeader } from "../game-header"
import { TeamPanel } from "../team-panel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"

/**
 * Spymaster device: sees the whole key. Controlled by `perspective` (which
 * team this device represents) and whether there is a single spymaster.
 */
export function SpymasterView() {
  const { state, perspective, setPerspective } = useGame()

  // Demo: treat as single spymaster when only one spymaster player exists.
  const spymasters = state.players.filter((p) => p.role === "spymaster")
  const single = spymasters.length <= 1

  return (
    <div className="flex flex-col gap-4">
      <GameHeader />

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <TeamPanel team="red" compact />
        <TeamPanel team="blue" compact />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Режим загадывающего — виден весь ключ
            </span>
            {!single && (
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs text-muted-foreground">
                  Вы за:
                </span>
                {(["red", "blue"] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={perspective === t ? "default" : "outline"}
                    onClick={() => setPerspective(t)}
                    className={cn(
                      perspective === t &&
                        (t === "red"
                          ? "bg-team-red text-team-red-foreground"
                          : "bg-team-blue text-team-blue-foreground"),
                    )}
                  >
                    {t === "red" ? state.settings.redName : state.settings.blueName}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <GameBoard mode="spymaster" interactive={false} />
        </div>

        <div className="flex flex-col gap-4">
          <ClueInput perspective={perspective} single={single} />
          <ActionLog />
        </div>
      </div>
    </div>
  )
}
