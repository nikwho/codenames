"use client"

import { ActionLog } from "../action-log"
import { AdminPanel } from "../admin-panel"
import { ClueBar } from "../clue-bar"
import { GameBoard } from "../game-board"
import { GameHeader } from "../game-header"
import { SettingsPanel } from "../settings-panel"
import { TeamPanel } from "../team-panel"
import { useGame } from "@/lib/game/store"
import { useState } from "react"

export function TableView() {
  const { state } = useGame()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <AdminPanel onOpenSettings={() => setSettingsOpen(true)} />
      <GameHeader />

      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <TeamPanel team="red" compact />
        <TeamPanel team="blue" compact />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)_minmax(180px,1fr)]">
        <div className="hidden lg:block">
          <TeamPanel team="red" />
        </div>
        <div className="flex flex-col gap-4">
          <GameBoard
            mode={state.keyRevealed ? "spymaster" : "guesser"}
            interactive
          />
          <ClueBar />
        </div>
        <div className="hidden lg:block">
          <TeamPanel team="blue" />
        </div>
      </div>

      {state.settings.showLog && <ActionLog />}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
