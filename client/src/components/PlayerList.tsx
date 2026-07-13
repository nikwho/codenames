import type { PlayerDevice } from "@codenames/shared";

interface PlayerListProps {
  players: PlayerDevice[];
}

export function PlayerList({ players }: PlayerListProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/15 p-3 sm:rounded-3xl sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide">Устройства</h2>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{players.filter((player) => player.connected).length} онлайн</span>
      </div>
      <div className="mt-3 space-y-2 sm:mt-4">
        {players.map((player) => (
          <div key={player.deviceId} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="min-w-0">
              <p className="flex min-w-0 flex-wrap items-center gap-2 font-semibold">
                <span className="truncate">{player.name}</span>
                {player.isBaseGuesser && (
                  <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-black uppercase text-[#2f2411]">
                    Администратор
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {roleLabel(player.role)} · {teamLabel(player.team)}
              </p>
            </div>
            <span className={player.connected ? "shrink-0 text-xs text-emerald-300" : "shrink-0 text-xs text-slate-500"}>
              {player.connected ? "online" : "offline"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function roleLabel(role: PlayerDevice["role"]): string {
  if (role === "spymaster") return "загад.";
  return "отгад.";
}

function teamLabel(team: PlayerDevice["team"]): string {
  if (team === "red") return "красные";
  if (team === "blue") return "синие";
  if (team === "both") return "обе команды";
  return "без команды";
}
