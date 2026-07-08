import type { SanitizedGameState } from "@codenames/shared";

interface TeamPanelProps {
  state: SanitizedGameState;
  team?: "red" | "blue";
  compact?: boolean;
  onEndGuessing: () => void;
}

export function TeamPanel({ state, team, compact = false, onEndGuessing }: TeamPanelProps) {
  const player = state.currentPlayer;
  const canEnd =
    state.status === "guessing_phase" &&
    player?.role === "guesser" &&
    (player.isBaseGuesser || player.team === state.currentTeam);

  const teams = team ? [team] : (["red", "blue"] as const);

  return (
    <section className={compact ? "grid gap-3" : "space-y-3"}>
      {teams.map((item) => (
        <TeamRow
          key={item}
          name={state.settings.teamNames[item]}
          color={item}
          remaining={state.teams[item].remaining}
          active={state.currentTeam === item}
          players={state.players.filter(
            (playerItem) => playerItem.team === item || (playerItem.isBaseGuesser && item === state.currentTeam)
          )}
          compact={compact}
        />
      ))}
      {canEnd && !team && (
        <button className="btn-secondary mt-4 w-full" onClick={onEndGuessing}>
          Завершить отгадывание
        </button>
      )}
    </section>
  );
}

function TeamRow({
  name,
  color,
  remaining,
  active,
  players,
  compact
}: {
  name: string;
  color: "red" | "blue";
  remaining: number;
  active: boolean;
  players: SanitizedGameState["players"];
  compact: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 sm:rounded-3xl sm:p-4 ${
        color === "red" ? "bg-red-950/30" : "bg-blue-950/30"
      } ${
        active
          ? color === "red"
            ? "border-red-400 shadow-[0_0_26px_rgba(223,55,66,0.22)]"
            : "border-blue-400 shadow-[0_0_26px_rgba(35,116,198,0.22)]"
          : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={color === "red" ? "text-xs font-black uppercase text-red-200 sm:text-sm" : "text-xs font-black uppercase text-blue-200 sm:text-sm"}>
            <span
              className={
                color === "red"
                  ? "mr-1.5 inline-block size-2 rounded-full bg-[var(--red)]"
                  : "mr-1.5 inline-block size-2 rounded-full bg-[var(--blue)]"
              }
            />
            {name}
          </p>
          <div className={color === "red" ? "mt-1 text-3xl font-black text-red-300 sm:mt-2 sm:text-5xl" : "mt-1 text-3xl font-black text-blue-300 sm:mt-2 sm:text-5xl"}>
            {remaining}
          </div>
          <p className="text-[11px] text-slate-500 sm:text-xs">осталось</p>
        </div>
        {active && <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] font-black uppercase">ходит</span>}
      </div>
      {!compact && (
        <div className="mt-4 space-y-2">
          {players.slice(0, 4).map((entry) => (
            <div key={entry.deviceId} className="rounded-xl bg-black/20 px-3 py-1.5 text-sm text-slate-200">
              {entry.role === "spymaster" ? "♛ " : "♙ "}
              {entry.name}
              {entry.role === "spymaster" && <span className="ml-2 text-[10px] uppercase text-slate-500">ведущий</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
