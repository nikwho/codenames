import { useEffect, useState } from "react";
import type { SanitizedGameState } from "@codenames/shared";
import { CardTile } from "./CardTile";
import { socket } from "../socket";

interface GameBoardProps {
  state: SanitizedGameState;
  mode: "guesser" | "spymaster";
  interactive?: boolean;
  onReveal: (cardId: string) => void;
}

export function GameBoard({ state, mode, interactive = true, onReveal }: GameBoardProps) {
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const player = state.currentPlayer;

  useEffect(() => {
    const onTap = ({ cardId }: { cardId: string }) => setPulses((value) => ({ ...value, [cardId]: (value[cardId] ?? 0) + 1 }));
    socket.on("cardTapped", onTap);
    return () => { socket.off("cardTapped", onTap); };
  }, []);

  const canReveal =
    interactive &&
    mode === "guesser" &&
    state.status === "guessing_phase" &&
    player?.role === "guesser" &&
    player.connected && socket.connected &&
    (player.team === "both" || player.team === state.currentTeam);

  return (
    <section className="rounded-2xl border border-black/40 bg-black/35 p-2 shadow-2xl shadow-black/30 sm:rounded-[1.75rem] sm:p-3">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        {state.cards.map((card) => {
          return (
            <CardTile
              key={card.id}
              card={card}
              mode={mode}
              disabled={!canReveal || card.revealed}
              votes={Object.entries(state.votes).filter(([, id]) => id === card.id).map(([id]) => state.players.find((item) => item.deviceId === id)?.name ?? "Игрок")}
              ownVote={Boolean(player && state.votes[player.deviceId] === card.id)}
              endsAt={state.pendingReveal?.cardId === card.id ? state.pendingReveal.endsAt : null}
              pulse={pulses[card.id] ?? 0}
              onTap={() => { if (socket.connected) socket.emit("tapCard", { cardId: card.id }); }}
              onReveal={() => {
                if (socket.connected) onReveal(card.id);
              }}
            />
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-slate-300">Тап — голос, повторный тап — отмена. После единогласия — 3 секунды до открытия.</p>
    </section>
  );
}
