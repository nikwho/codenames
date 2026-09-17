import type { PlayerRole, SanitizedGameState, TeamSelection } from "@codenames/shared";
import { socket } from "../socket";

export function PlayerManagement({ state }: { state: SanitizedGameState }) {
  return (
    <details className="panel">
      <summary className="cursor-pointer font-bold">Игроки · управление ({state.players.length})</summary>
      <div className="mt-3 space-y-3">
        {state.players.map((player) => {
          const update = (role: PlayerRole, team: TeamSelection) => {
            if (socket.connected) socket.emit("updatePlayer", { deviceId: player.deviceId, role, team });
          };
          return (
            <div key={player.deviceId} className="flex flex-wrap items-center gap-2 rounded-xl bg-black/20 p-3">
              <span className="min-w-24 flex-1 break-words">{player.name} {player.isBaseGuesser ? "· админ" : ""}<small className={`block ${player.connected ? "text-emerald-300" : "text-slate-400"}`}>{player.connected ? "Онлайн" : "Офлайн"}</small></span>
              <select className="field min-h-11" aria-label={`Роль: ${player.name}`} value={player.role} onChange={(event) => update(event.target.value as PlayerRole, player.team)}>
                <option value="guesser">Отгадывает</option><option value="spymaster">Загадывает</option><option value="spectator">Наблюдает</option>
              </select>
              <select className="field min-h-11" aria-label={`Команда: ${player.name}`} value={player.team ?? ""} disabled={player.role === "spectator"} onChange={(event) => update(player.role, (event.target.value || null) as TeamSelection)}>
                <option value="">Без команды</option><option value="red">{state.settings.teamNames.red}</option><option value="blue">{state.settings.teamNames.blue}</option><option value="both">Обе команды</option>
              </select>
              {!player.isBaseGuesser && <button className="btn-secondary text-rose-300" onClick={() => { if (socket.connected) socket.emit("kickPlayer", { deviceId: player.deviceId }); }}>Удалить</button>}
            </div>
          );
        })}
      </div>
    </details>
  );
}
