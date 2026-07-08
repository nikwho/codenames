import { useEffect, useState } from "react";
import type { SanitizedGameState } from "@codenames/shared";
import { CardTile } from "./CardTile";

interface GameBoardProps {
  state: SanitizedGameState;
  mode: "guesser" | "spymaster";
  interactive?: boolean;
  onReveal: (cardId: string) => void;
}

export function GameBoard({ state, mode, interactive = true, onReveal }: GameBoardProps) {
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set());
  const player = state.currentPlayer;

  useEffect(() => {
    setRevealingIds((current) => {
      const next = new Set(current);
      for (const card of state.cards) {
        if (card.revealed) {
          next.delete(card.id);
        }
      }
      return next;
    });
  }, [state.cards]);

  const canReveal =
    interactive &&
    mode === "guesser" &&
    state.status === "guessing_phase" &&
    player?.role === "guesser" &&
    (player.isBaseGuesser || player.team === state.currentTeam);

  return (
    <section className="rounded-2xl border border-black/40 bg-black/35 p-2 shadow-2xl shadow-black/30 sm:rounded-[1.75rem] sm:p-3">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        {state.cards.map((card) => {
          const isPending = revealingIds.has(card.id);
          return (
            <CardTile
              key={card.id}
              card={card}
              showKey={mode === "spymaster"}
              disabled={!canReveal || card.revealed || isPending}
              holdToConfirmMs={state.settings.holdToConfirmMs}
              onReveal={() => {
                setRevealingIds((current) => new Set(current).add(card.id));
                onReveal(card.id);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
