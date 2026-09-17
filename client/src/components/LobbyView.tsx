import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { PlayerDevice, PlayerRole, SanitizedGameState, Team, TeamSelection } from "@codenames/shared";
import { RoomQrCode } from "./RoomQrCode";
import { SettingsModal } from "./SettingsModal";
import { socket } from "../socket";

interface LobbyViewProps {
  state: SanitizedGameState;
  onChooseTeam: (team: Team) => void;
  onChooseSpymasterTeam: (team: Team) => void;
  onStartGame: () => void;
  onUpdateSettings: (patch: Partial<SanitizedGameState["settings"]>) => void;
  onRename: (name: string) => void;
}

export function LobbyView({ state, onChooseTeam, onChooseSpymasterTeam, onStartGame, onUpdateSettings, onRename }: LobbyViewProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isAdmin = Boolean(state.currentPlayer?.isBaseGuesser);
  const onlineCount = state.players.filter((item) => item.connected).length;
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* Browser may deny clipboard access. */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  const assign = (target: PlayerDevice, role: PlayerRole, team: TeamSelection) => {
    if (socket.connected) socket.emit("updatePlayer", { deviceId: target.deviceId, role, team });
  };

  if (!isAdmin) return <LobbyWaiting state={state} onRename={onRename} />;
  return <div className="lobby-admin mx-auto w-full max-w-[29.5rem] space-y-4 pb-8">
    <section className="relative flex items-center gap-3 rounded-[26px] border border-[#2a313d] bg-[#151b25] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,.16)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#342b1c] text-[#f6b83d]"><ShieldIcon /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[.12em] text-[#9db2d9]">Лобби</p><h1 className="truncate text-lg font-extrabold text-[#f4f5f7]">Пятничный стол</h1></div>
      <code className="rounded-xl bg-[#10151d] px-3 py-2 font-mono text-sm font-extrabold tracking-[.08em] text-[#f8f5ed]">{state.roomId}</code>
      <div className="relative"><button type="button" aria-label="Добавить игрока" aria-expanded={inviteOpen} onClick={() => setInviteOpen((value) => !value)} className="flex size-9 items-center justify-center rounded-xl bg-[#29303c] text-[#edf1f8] transition hover:bg-[#363f4d]"><UserPlusIcon /></button>
        {inviteOpen && <aside className="absolute right-0 top-12 z-30 w-[18rem] rounded-[25px] border border-[#343b48] bg-[#171d27] p-4 shadow-2xl shadow-black/50"><div className="flex items-center gap-3"><div className="shrink-0 rounded-2xl bg-[#eee2c9] p-1.5"><RoomQrCode size={96} /></div><p className="text-sm leading-[1.35] text-[#a9b8d0]">Отсканируйте QR-код телефоном — имя можно ввести сразу после подключения.</p></div><button type="button" onClick={copyInvite} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2a303c] text-sm font-semibold text-white hover:bg-[#363e4c]"><CopyIcon />{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button></aside>}
      </div>
    </section>
    <ProfileName player={state.currentPlayer} onRename={onRename} />
    <section className="rounded-[26px] border border-[#624719] bg-[#1b1c20] px-4 py-3.5"><p className="flex gap-2 text-base font-extrabold leading-[1.2] text-[#f6f4ed]"><span className="mt-2 size-2 shrink-0 rounded-full bg-[#ffbf17]" />Вы управляете лобби. Назначьте роли и команды, затем запустите игру.</p><p className="mt-1 pl-4 text-sm text-[#a1b0c8]">Игроки не могут менять эти настройки самостоятельно.</p></section>
    <section className="rounded-[30px] border border-[#2c3441] bg-[#161c26] p-4"><div className="mb-4"><h2 className="text-lg font-extrabold text-[#f7f7f7]">Распределение игроков</h2><p className="mt-0.5 text-sm text-[#a3b2cb]">Назначайте роль и команду прямо в нужном списке.</p><span className="mt-3 inline-flex rounded-full bg-[#2b3240] px-2.5 py-1 text-xs font-bold text-white">{onlineCount} онлайн</span></div><div className="grid gap-3"><PlayerManagementGroup team="red" state={state} onAssign={assign} /><PlayerManagementGroup team="blue" state={state} onAssign={assign} /></div></section>
    <section className="rounded-[26px] border border-[#2c3441] bg-[#161c26] p-3.5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Базовые настройки</h2><p className="text-sm text-[#a3b2cb]">Время, набор слов и правила раунда</p></div><button type="button" aria-label="Изменить настройки" onClick={() => setSettingsOpen(true)} className="p-2 text-[#aab9cf] hover:text-white"><SlidersIcon /></button></div><div className="mt-3 space-y-2"><SettingValue label="Загадывание" value={formatMinutes(state.settings.clueSeconds)} /><SettingValue label="Отгадывание" value={formatMinutes(state.settings.guessingSeconds)} /><SettingValue label="Набор слов" value={difficultyLabel(state.settings.wordDifficulty)} /></div></section>
    <div className="flex justify-end"><button type="button" onClick={onStartGame} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#f6b83d] px-5 py-3 font-extrabold text-[#2a210f] shadow-[inset_0_1px_rgba(255,255,255,.25)] hover:bg-[#ffc94f]"><PlayIcon />Начать игру</button></div>
    {settingsOpen && <SettingsModal settings={state.settings} onClose={() => setSettingsOpen(false)} onSave={onUpdateSettings} />}
  </div>;
}

function PlayerManagementGroup({ team, state, onAssign }: { team: Team; state: SanitizedGameState; onAssign: (player: PlayerDevice, role: PlayerRole, team: TeamSelection) => void }) {
  const assignedPlayers = state.players.filter((item) => item.team === team);
  const unassignedPlayers = state.players.filter((item) => item.team === null || item.team === "both");
  const players = [...assignedPlayers, ...unassignedPlayers];
  const red = team === "red";
  const tone = red ? "border-[#632d38] bg-[#261d25]" : "border-[#234d7c] bg-[#172232]";
  const dot = red ? "bg-[#f04d55]" : "bg-[#3185df]";
  return <section className={`rounded-[25px] border p-3 ${tone}`}><div className="mb-2 flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot}`} /><h3 className="font-extrabold">{state.settings.teamNames[team]}</h3></div><div className="space-y-1.5">{players.length ? players.sort((a, b) => Number(b.role === "spymaster") - Number(a.role === "spymaster")).map((item) => <PlayerManagementRow key={item.deviceId} player={item} state={state} onAssign={onAssign} unassigned={item.team === null || item.team === "both"} />) : <p className="py-1 text-xs text-[#97a5b9]">Команда пока пустая</p>}</div></section>;
}
function PlayerManagementRow({ player, state, onAssign, unassigned }: { player: PlayerDevice; state: SanitizedGameState; onAssign: (player: PlayerDevice, role: PlayerRole, team: TeamSelection) => void; unassigned: boolean }) {
  return <article className={`rounded-xl bg-[#121925] px-2.5 py-2 ${unassigned ? "border border-dashed border-[#d39b32]" : "border border-transparent"}`}><div className="flex items-center gap-2"><span className={player.role === "spymaster" ? "text-[#ffd12e]" : "text-[#aab4c4]"}>{player.role === "spymaster" ? <CrownIcon /> : <UserIcon />}</span><span className={player.role === "spymaster" ? "min-w-0 truncate text-sm font-extrabold text-[#fff3aa]" : "min-w-0 truncate text-sm font-extrabold"}>{player.name}{player.isBaseGuesser && <span className="ml-1.5 text-[10px] font-black text-[#f6b83d]">АДМИН</span>}</span><span className={player.role === "spymaster" ? "hidden text-xs font-bold text-[#ffdf47] sm:inline" : "hidden text-xs text-[#a8b7d0] sm:inline"}>{roleName(player.role)}</span><span className={`ml-auto size-2 shrink-0 rounded-full ${player.connected ? "bg-emerald-400" : "bg-[#5d6778]"}`} /></div><div className="mt-2 flex flex-wrap items-center justify-end gap-2"><RoleButton active={player.role === "guesser"} label="Отгадывающий" onClick={() => onAssign(player, "guesser", player.team)}><UserIcon /></RoleButton><RoleButton active={player.role === "spymaster"} label="Ведущий" onClick={() => onAssign(player, "spymaster", player.team)}><CrownIcon /></RoleButton><span className="mx-0.5 h-5 w-px bg-[#343b47]" />{(["red", "blue"] as const).map((team) => <button key={team} type="button" onClick={() => onAssign(player, player.role, player.team === team ? "both" : team)} className={`rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${player.team === team ? team === "red" ? "border-[#ff5757] bg-[#fc5255] text-white" : "border-[#277bdc] bg-[#287bd9] text-white" : team === "red" ? "border-[#722b34] text-[#b9c3d4] hover:bg-[#3a1f27]" : "border-[#234d80] text-[#b9c3d4] hover:bg-[#182b43]"}`}>{state.settings.teamNames[team]}</button>)}</div></article>;
}
function RoleButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) { return <button type="button" title={label} aria-label={label} onClick={onClick} className={`flex size-8 items-center justify-center rounded-xl border ${active ? "border-[#f6b83d] bg-[#362b19] text-[#f6b83d]" : "border-[#3a4352] text-[#9aa8bd] hover:border-[#68768b]"}`}>{children}</button>; }
function TeamGroup({ team, state }: { team: Team; state: SanitizedGameState }) {
  const assignedPlayers = state.players.filter((item) => item.team === team);
  const unassignedPlayers = state.players.filter((item) => item.team === null || item.team === "both");
  const players = [...assignedPlayers, ...unassignedPlayers];
  const red = team === "red";
  const tone = red ? "border-[#632d38] bg-[#261d25]" : "border-[#234d7c] bg-[#172232]";
  const dot = red ? "bg-[#f04d55]" : "bg-[#3185df]";
  return <section className={`rounded-[25px] border p-3 ${tone}`}>
    <div className="mb-2 flex items-center gap-2"><span className={`size-2.5 rounded-full ${dot}`} /><h3 className="font-extrabold">{state.settings.teamNames[team]}</h3></div>
    <div className="space-y-1.5">{players.length ? players.sort((a, b) => Number(b.role === "spymaster") - Number(a.role === "spymaster")).map((item) => <div key={item.deviceId} className={`flex items-center gap-2 rounded-xl bg-[#121925] px-2.5 py-2 ${item.team === null || item.team === "both" ? "border border-dashed border-[#d39b32]" : "border border-transparent"}`}><span className={item.role === "spymaster" ? "text-[#ffd12e]" : "text-[#aab4c4]"}>{item.role === "spymaster" ? <CrownIcon /> : <UserIcon />}</span><span className={item.role === "spymaster" ? "text-sm font-extrabold text-[#fff3aa]" : "text-sm font-extrabold"}>{item.name}</span><span className={item.role === "spymaster" ? "text-xs font-bold text-[#ffdf47]" : "text-xs text-[#a8b7d0]"}>{roleName(item.role)}</span><span className={`ml-auto size-2 rounded-full ${item.connected ? "bg-emerald-400" : "bg-[#5d6778]"}`} /></div>) : <p className="py-1 text-xs text-[#97a5b9]">Команда пока пустая</p>}</div>
  </section>;
}
function LobbyWaiting({ state, onRename }: Pick<LobbyViewProps, "state" | "onRename">) {
  const onlineCount = state.players.filter((item) => item.connected).length;
  return <div className="lobby-admin mx-auto w-full max-w-[29.5rem] space-y-4 pb-8">
    <section className="flex items-center gap-3 rounded-[26px] border border-[#2a313d] bg-[#151b25] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,.16)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#342b1c] text-[#f6b83d]"><ShieldIcon /></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-[.12em] text-[#9db2d9]">Лобби</p><h1 className="truncate text-lg font-extrabold text-[#f4f5f7]">Пятничный стол</h1></div>
      <code className="rounded-xl bg-[#10151d] px-3 py-2 font-mono text-sm font-extrabold tracking-[.08em] text-[#f8f5ed]">{state.roomId}</code>
    </section>
    <ProfileName player={state.currentPlayer} onRename={onRename} />
    <section className="rounded-[30px] border border-[#2c3441] bg-[#161c26] p-4">
      <div className="mb-4"><h2 className="text-lg font-extrabold text-[#f7f7f7]">Команды</h2><p className="mt-0.5 text-sm text-[#a3b2cb]">Роли и команды назначает администратор.</p><span className="mt-3 inline-flex rounded-full bg-[#2b3240] px-2.5 py-1 text-xs font-bold text-white">{onlineCount} онлайн</span></div>
      <div className="grid gap-3"><TeamGroup team="red" state={state} /><TeamGroup team="blue" state={state} /></div>
    </section>
  </div>;
}
function ProfileName({ player, onRename }: { player: PlayerDevice | null; onRename: (name: string) => void }) {
  const [name, setName] = useState(player?.name ?? "");
  useEffect(() => setName(player?.name ?? ""), [player?.name]);
  const submit = (event: FormEvent) => { event.preventDefault(); const nextName = name.trim(); if (nextName && nextName !== player?.name) onRename(nextName); };
  return <form onSubmit={submit} className="rounded-[26px] border border-[#2c3441] bg-[#161c26] p-3.5"><label className="block text-sm font-extrabold text-[#f6f7f8]">Ваше имя:<span className="mt-2 flex gap-2"><input aria-label="Ваше имя" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} className="field min-w-0 flex-1" /><button type="submit" disabled={!name.trim() || name.trim() === player?.name} className="btn-secondary shrink-0 px-4">Сохранить</button></span></label></form>;
}
function SettingValue({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-[#111722] px-3 py-2"><p className="text-xs text-[#a7b6cc]">{label}</p><p className="font-extrabold text-[#f6f6f7]">{value}</p></div>; }
function formatMinutes(seconds: number) { return `${Math.round(seconds / 60)} МИН`; }
function difficultyLabel(value: SanitizedGameState["settings"]["wordDifficulty"]) { return value === "easy" ? "Лёгкий" : value === "advanced" ? "Сложный" : "Классика"; }
function roleName(role: PlayerRole) { return role === "spymaster" ? "Ведущий" : role === "spectator" ? "Наблюдатель" : "Отгадывающий"; }
function teamName(state: SanitizedGameState, team: TeamSelection) { return team === "red" || team === "blue" ? state.settings.teamNames[team] : team === "both" ? "Обе команды" : "Без команды"; }
function UserIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6"/></svg>; }
function CrownIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><path d="m4 7 4.1 3.5L12 4l3.9 6.5L20 7l-1.7 11H5.7L4 7Z"/><path d="M6 21h12"/></svg>; }
function TableIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><rect x="3" y="5" width="12" height="10" rx="1.5"/><path d="M7 19h12M18 8h3v5M6 8h5M6 12h3"/></svg>; }
function ShieldIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M12 3 19 6v5c0 4.2-2.7 7.8-7 9.5C7.7 18.8 5 15.2 5 11V6l7-3Z"/></svg>; }
function UserPlusIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><circle cx="10" cy="8" r="3"/><path d="M4 20c.5-3.6 2.5-5.5 6-5.5 1 0 1.8.1 2.5.4M18 11v8m-4-4h8"/></svg>; }
function CopyIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.8]"><rect x="9" y="9" width="10" height="10" rx="1.5"/><path d="M15 9V6.5A1.5 1.5 0 0 0 13.5 5h-8A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16H9"/></svg>; }
function PlayIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-current"><path d="M7 4.7v14.6L19 12 7 4.7Z"/></svg>; }
function SlidersIcon() { return <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M4 7h16M4 17h16M9 4v6m6 4v6"/></svg>; }
