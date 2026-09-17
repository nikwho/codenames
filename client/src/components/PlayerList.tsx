import type { PlayerDevice, SanitizedGameState, Team } from "@codenames/shared";
import { socket } from "../socket";

interface PlayerListProps { state: SanitizedGameState; isAdmin: boolean; }

export function PlayerList({ state, isAdmin }: PlayerListProps) {
  return <section className="mt-3 grid gap-3"><TeamGroup team="red" state={state} isAdmin={isAdmin} /><TeamGroup team="blue" state={state} isAdmin={isAdmin} /></section>;
}

function TeamGroup({ team, state, isAdmin }: { team: Team; state: SanitizedGameState; isAdmin: boolean }) {
  const assigned = state.players.filter((player) => player.team === team);
  const shared = state.players.filter((player) => player.team === null || player.team === "both");
  const players = [...assigned, ...shared].sort((a, b) => Number(b.role === "spymaster") - Number(a.role === "spymaster"));
  const red = team === "red";
  const tone = red ? "border-[#632d38] bg-[#261d25]" : "border-[#234d7c] bg-[#172232]";
  const dot = red ? "bg-[#f04d55]" : "bg-[#3185df]";
  return <section className={`rounded-[25px] border p-3 ${tone}`}><div className="mb-2 flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot}`} /><h3 className="font-extrabold">{state.settings.teamNames[team]}</h3></div><div className="space-y-1.5">{players.length ? players.map((player) => <PlayerRow key={player.deviceId} player={player} state={state} isAdmin={isAdmin} />) : <p className="py-1 text-xs text-[#97a5b9]">Команда пока пустая</p>}</div></section>;
}

function PlayerRow({ player, state, isAdmin }: { player: PlayerDevice; state: SanitizedGameState; isAdmin: boolean }) {
  const shared = player.team === null || player.team === "both";
  const updateTeam = (team: Team) => { if (socket.connected && player.role === "guesser") socket.emit("updatePlayer", { deviceId: player.deviceId, role: "guesser", team: player.team === team ? "both" : team }); };
  return <article className={`rounded-xl bg-[#121925] px-2.5 py-2 ${shared ? "border border-dashed border-[#d39b32]" : "border border-transparent"}`}><div className="flex items-center gap-2"><span className={player.role === "spymaster" ? "text-[#ffd12e]" : "text-[#aab4c4]"}>{player.role === "spymaster" ? <CrownIcon /> : <UserIcon />}</span><span className={player.role === "spymaster" ? "min-w-0 truncate text-sm font-extrabold text-[#fff3aa]" : "min-w-0 truncate text-sm font-extrabold"}>{player.name}{player.isBaseGuesser && <span className="ml-1.5 text-[10px] font-black text-[#f6b83d]">АДМИН</span>}</span><span className={player.role === "spymaster" ? "hidden text-xs font-bold text-[#ffdf47] sm:inline" : "hidden text-xs text-[#a8b7d0] sm:inline"}>{roleName(player.role)}</span><span className={`ml-auto size-2 shrink-0 rounded-full ${player.connected ? "bg-emerald-400" : "bg-[#5d6778]"}`} /></div>{isAdmin && player.role === "guesser" && <div className="mt-2 flex items-center justify-end gap-2">{(["red", "blue"] as const).map((team) => <button key={team} type="button" onClick={() => updateTeam(team)} className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${player.team === team ? team === "red" ? "border-[#ff5757] bg-[#fc5255] text-white" : "border-[#277bdc] bg-[#287bd9] text-white" : team === "red" ? "border-[#722b34] text-[#b9c3d4] hover:bg-[#3a1f27]" : "border-[#234d80] text-[#b9c3d4] hover:bg-[#182b43]"}`}>{state.settings.teamNames[team]}</button>)}</div>}</article>;
}

function roleName(role: PlayerDevice["role"]) { return role === "spymaster" ? "Ведущий" : role === "spectator" ? "Наблюдатель" : "Отгадывающий"; }
function UserIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6"/></svg>; }
function CrownIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><path d="m4 7 4.1 3.5L12 4l3.9 6.5L20 7l-1.7 11H5.7L4 7Z"/><path d="M6 21h12"/></svg>; }
