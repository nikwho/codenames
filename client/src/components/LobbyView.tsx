import type { PlayerDevice, SanitizedGameState, Team } from "@codenames/shared";
import { RoomQrCode } from "./RoomQrCode";
import { TeamSelect } from "./TeamSelect";

export function LobbyView({ state, onChooseTeam, onChooseSpymasterTeam, onStartGame }: {
  state: SanitizedGameState; onChooseTeam: (team: Team) => void; onChooseSpymasterTeam: (team: Team) => void; onStartGame: () => void;
}) {
  const player = state.currentPlayer;
  const sharedSpies = state.players.filter((item) => item.role === "spymaster" && item.team === "both");
  const unassigned = state.players.filter((item) => item.team === null || item.role === "spectator");
  return <div className="space-y-4">
    {player && player.role !== "spectator" && <TeamSelect title="Ваша команда" selectedTeam={player.team} onChoose={player.role === "spymaster" ? onChooseSpymasterTeam : onChooseTeam} />}
    <div className="grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
      <section className="panel text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">Пригласить игроков</p>
        <h2 className="my-4 break-all font-mono text-4xl font-black tracking-widest text-amber-400">{state.roomId}</h2>
        <div className="mx-auto w-fit rounded-2xl bg-[var(--tile)] p-2"><RoomQrCode size={148} /></div>
        <p className="my-4 text-sm text-slate-400">Отсканируйте код камерой телефона</p>
        <button className="btn-secondary w-full" onClick={() => navigator.clipboard.writeText(window.location.href)}>Скопировать ссылку</button>
      </section>
      <section className="min-w-0 space-y-3">
        {sharedSpies.length > 0 && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3"><h3 className="mb-2 text-sm font-bold text-amber-200">Загадывает за обе команды</h3><Roster players={sharedSpies} /></div>}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {(["red", "blue"] as const).map((team) => <section key={team} className={`min-w-0 rounded-2xl border p-2 sm:p-4 ${team === "red" ? "border-red-400/40 bg-red-500/10" : "border-blue-400/40 bg-blue-500/10"}`}>
            <h2 className={`mb-3 break-words text-lg font-black ${team === "red" ? "text-red-300" : "text-blue-300"}`}>{state.settings.teamNames[team]}</h2>
            {!sharedSpies.length && <div className="mb-4 border-b border-white/10 pb-3"><h3 className="mb-2 text-xs uppercase text-slate-400">Загадывает</h3><Roster players={state.players.filter((item) => item.role === "spymaster" && item.team === team)} /></div>}
            {sharedSpies.length > 0 && state.players.some((item) => item.role === "spymaster" && item.team === team) && <Roster players={state.players.filter((item) => item.role === "spymaster" && item.team === team)} />}
            <h3 className="mb-2 text-xs uppercase text-slate-400">Отгадывают</h3>
            <Roster players={state.players.filter((item) => item.role === "guesser" && (item.team === team || item.team === "both"))} />
          </section>)}
        </div>
        {unassigned.length > 0 && <div className="panel"><h3 className="mb-2 text-sm text-slate-400">Без команды / наблюдатели</h3><Roster players={unassigned} /></div>}
      </section>
    </div>
    {player?.isBaseGuesser ? <button className="btn-primary w-full" onClick={onStartGame}>Начать игру</button> : <p className="text-center text-sm text-slate-400">Ожидаем начала игры от администратора</p>}
  </div>;
}

function Roster({ players }: { players: PlayerDevice[] }) {
  return <div className="space-y-2">{!players.length && <p className="text-xs text-slate-500">Пока никого</p>}{players.map((player) => <div key={player.deviceId} className="rounded-xl bg-black/20 p-2">
    <p className="break-words text-sm font-semibold">{player.name}</p>
    {player.isBaseGuesser && <p className="text-[10px] text-amber-300">Администратор</p>}
    <p className={`text-[10px] ${player.connected ? "text-emerald-300" : "text-slate-400"}`}>{player.connected ? "Онлайн" : "Офлайн"}{player.role === "spectator" ? " · наблюдает" : player.team === "both" ? " · обе команды" : ""}</p>
  </div>)}</div>;
}
