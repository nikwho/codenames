import { useState } from "react";
import type { SanitizedGameState, SubmitCluePayload, Team, TeamSelection } from "@codenames/shared";
import { socket } from "../socket";

interface SpymasterClueInputProps {
  state: SanitizedGameState;
  onSubmit: (payload: SubmitCluePayload) => Promise<{ ok: boolean; message?: string }>;
}

function spymasterClueTeam(playerTeam: TeamSelection): Team | null {
  if (playerTeam === "red" || playerTeam === "blue") {
    return playerTeam;
  }
  return null;
}

export function SpymasterClueInput({ state, onSubmit }: SpymasterClueInputProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const player = state.currentPlayer;
  const assignedTeam = spymasterClueTeam(player?.team ?? null);
  const clueForTeam = assignedTeam ?? state.currentTeam;
  const canSubmit =
    socket.connected && !pending &&
    (state.status === "clue_phase" || state.status === "guessing_phase") &&
    !state.currentClue &&
    player?.role === "spymaster" &&
    (player.team === "both" || player.team === state.currentTeam);

  const submit = async () => {
    if (!canSubmit || !text.trim()) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await onSubmit({ text });
      if (result.ok) setText("");
      else setError(result.message ?? "Подсказка не принята");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="flex min-w-0 flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="слово 2"
        aria-label="Подсказка: слово и число"
        disabled={!canSubmit}
        className={`field min-w-0 flex-1 ${
          clueForTeam === "red"
            ? "border-red-400/50 bg-red-950/40 focus:border-red-300 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
            : "border-blue-400/50 bg-blue-950/40 focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
        }`}
      />
      <button type="submit" className="btn-primary shrink-0 px-4" disabled={!canSubmit || !text.trim()}>
        {pending ? "Отправка…" : "Отправить"}
      </button>
      <p className="basis-full text-sm text-slate-400">
        {state.status === "paused" ? "Игра на паузе" : state.currentClue ? `Подсказка принята: ${state.currentClue.text}` : player?.team === null ? "Администратор должен назначить вам команду" : player?.team !== "both" && player?.team !== state.currentTeam ? "Сейчас ход другой команды" : "Формат: слово 2, слово 2+1 или слово 2(1)"}
      </p>
      {error && <p role="alert" className="basis-full text-sm text-rose-300">{error}</p>}
    </form>
  );
}
