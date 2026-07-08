"use client"

import { useGame } from "@/lib/game/store"
import { WordCard } from "./word-card"

interface GameBoardProps {
  mode: "guesser" | "spymaster"
  /** whether cards can be revealed by holding (base/table device or single-guesser demo) */
  interactive: boolean
}

export function GameBoard({ mode, interactive }: GameBoardProps) {
  const { state, dispatch } = useGame()
  const canPlay =
    interactive && state.phase === "guessing" && !state.paused && !state.winner

  return (
    <div className="rounded-2xl bg-felt p-2.5 shadow-inner ring-1 ring-white/5 sm:p-4">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 md:gap-3">
        {state.cards.map((card) => (
          <WordCard
            key={card.id}
            card={card}
            mode={mode}
            interactive={canPlay}
            onReveal={(id) => dispatch({ type: "REVEAL_CARD", id })}
          />
        ))}
      </div>
    </div>
  )
}
