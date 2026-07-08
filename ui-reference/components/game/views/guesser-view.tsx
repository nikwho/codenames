"use client"

import { ActionLog } from "../action-log"
import { ClueBar } from "../clue-bar"
import { GameBoard } from "../game-board"
import { GameHeader } from "../game-header"
import { TeamPanel } from "../team-panel"
import { useGame } from "@/lib/game/store"

interface GuesserViewProps {
  /** interactive when this is the base/table device */
  interactive: boolean
}

export function GuesserView({ interactive }: GuesserViewProps) {
  const { state } = useGame()

  return (
    <div className="flex flex-col gap-4">
      <GameHeader />

      {/* Mobile team summary */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <TeamPanel team="red" compact />
        <TeamPanel team="blue" compact />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)_minmax(180px,1fr)]">
        <div className="hidden lg:block">
          <TeamPanel team="red" />
        </div>

        <div className="flex flex-col gap-4">
          <GameBoard mode="guesser" interactive={interactive} />
          <ClueBar />
        </div>

        <div className="hidden lg:block">
          <TeamPanel team="blue" />
        </div>
      </div>

      {state.settings.showLog && <ActionLog />}
    </div>
  )
}
