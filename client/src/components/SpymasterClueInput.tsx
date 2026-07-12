import { useState } from "react";
import type { SanitizedGameState, SubmitCluePayload, Team, TeamSelection } from "@codenames/shared";

interface SpymasterClueInputProps {
  state: SanitizedGameState;
  onSubmit: (payload: SubmitCluePayload) => void;
}

function spymasterClueTeam(playerTeam: TeamSelection): Team | null {
  if (playerTeam === "red" || playerTeam === "blue") {
    return playerTeam;
  }
  return null;
}

export function SpymasterClueInput({ state, onSubmit }: SpymasterClueInputProps) {
  const [text, setText] = useState("");
  const player = state.currentPlayer;
  const assignedTeam = spymasterClueTeam(player?.team ?? null);
  const clueForTeam = assignedTeam ?? state.currentTeam;
  const canSubmit =
    (state.status === "clue_phase" || state.status === "guessing_phase") &&
    !state.currentClue &&
    player?.role === "spymaster" &&
    (player.team === "both" || player.team === state.currentTeam);

  const submit = () => {
    if (!canSubmit || !text.trim()) {
      return;
    }
    onSubmit({ text });
    setText("");
  };

  return (
    <form
      className="flex min-w-0 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="слово 2"
        disabled={!canSubmit}
        className={`field min-w-0 flex-1 ${
          clueForTeam === "red"
            ? "border-red-400/50 bg-red-950/40 focus:border-red-300 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
            : "border-blue-400/50 bg-blue-950/40 focus:border-blue-300 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
        }`}
      />
      <button type="submit" className="btn-primary shrink-0 px-4" disabled={!canSubmit || !text.trim()}>
        OK
      </button>
    </form>
  );
}
