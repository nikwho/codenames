"use client"

import { useGame } from "@/lib/game/store"
import { GuesserView } from "./views/guesser-view"
import { SpymasterView } from "./views/spymaster-view"
import { TableView } from "./views/table-view"
import { LobbyView } from "./views/lobby-view"
import { GameOver } from "./game-over"

export function GameStage() {
  const { view, state } = useGame()

  if (view === "lobby") return <LobbyView />

  if (state.phase === "gameover") return <GameOver />

  if (view === "spymaster") return <SpymasterView />
  if (view === "table") return <TableView />

  // guesser view is interactive (base/table device controls reveals)
  return <GuesserView interactive />
}
