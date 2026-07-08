import { useState } from "react";
import type { SanitizedGameState, SubmitCluePayload } from "@codenames/shared";

interface SpymasterClueInputProps {
  state: SanitizedGameState;
  onSubmit: (payload: SubmitCluePayload) => void;
}

export function SpymasterClueInput({ state, onSubmit }: SpymasterClueInputProps) {
  const [text, setText] = useState("");
  const player = state.currentPlayer;
  const canSubmit =
    state.status === "clue_phase" &&
    player?.role === "spymaster" &&
    (player.team === "both" || player.team === state.currentTeam);
  const isRealSpymaster = player?.role === "spymaster";

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-950/20 p-3 sm:rounded-3xl sm:p-4">
      <h2 className="text-sm font-black uppercase tracking-wide">
        Загадываете за: {state.settings.teamNames[state.currentTeam]}
      </h2>
      {!isRealSpymaster && (
        <p className="mt-3 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100">
          Это только debug-отображение. Роль игрока не изменилась, отправка подсказки недоступна.
        </p>
      )}
      {isRealSpymaster && state.status !== "clue_phase" && (
        <p className="mt-3 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100">
          Сейчас команда отгадывает. Дождитесь своего хода.
        </p>
      )}
      <div className="mt-4 flex min-w-0 flex-col gap-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Например: стол 2"
          className="field w-full min-w-0"
        />
        <button
          className="btn-primary w-full shrink-0"
          onClick={() => {
            onSubmit({ text });
            setText("");
          }}
          disabled={!canSubmit || !text.trim()}
        >
          Отправить
        </button>
      </div>
    </section>
  );
}
