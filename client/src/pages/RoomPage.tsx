import { useEffect } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { ActionLog } from "../components/ActionLog";
import { GameBoard } from "../components/GameBoard";
import { LobbyView } from "../components/LobbyView";
import { SpymasterClueInput } from "../components/SpymasterClueInput";
import { TimerBar } from "../components/TimerBar";
import { PlayerList } from "../components/PlayerList";
import { useGameSocket } from "../hooks/useGameSocket";

export function RoomPage({ roomId, navigate }: { roomId: string; navigate: (path: string) => void }) {
  const game = useGameSocket(roomId);
  const state = game.state;
  const player = state?.currentPlayer;
  const online = game.connectionStatus === "connected";
  useEffect(() => {
    if (game.nextRoomId && game.nextRoomId !== roomId) navigate(`/room/${game.nextRoomId}`);
  }, [game.nextRoomId, navigate, roomId]);
  const canEnd = online && state?.status === "guessing_phase" && player?.role === "guesser" && (player.team === "both" || player.team === state.currentTeam);

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        {state?.status === "lobby" ? (
          <header className="-mx-3 flex items-center justify-between border-b border-[#2a3039] px-3 pb-2.5 sm:-mx-5 sm:px-5">
            <button className="flex items-center gap-2 text-sm font-extrabold text-[#f4f5f7]" onClick={() => navigate("/")}><span className="flex size-7 items-center justify-center rounded-full bg-[#f6b83d] text-sm font-black text-[#33230e]">P</span>Кодовое Поле</button>
            <button type="button" className="flex items-center gap-1.5 rounded-xl border border-[#313844] px-3 py-1.5 text-xs font-semibold text-[#b3bdcb]"><SlidersIcon />Сцены</button>
          </header>
        ) : (
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <button className="text-lg font-black" onClick={() => navigate("/")}>Кодовое Поле</button>
            <span className="text-sm text-slate-400">{roomId} · {online ? "Онлайн" : "Восстанавливаем связь…"}</span>
            <button className="pill" onClick={() => navigator.clipboard.writeText(window.location.href)}>Скопировать ссылку</button>
          </header>
        )}
        {!online && <p role="status" className="rounded-xl bg-amber-500/15 p-3 text-amber-200">Нет связи с сервером. Действия временно недоступны.</p>}
        {game.error && <p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-rose-200">{game.error}</p>}
        {game.kicked && <button className="btn-secondary" onClick={() => navigate("/")}>На главную</button>}
        {!state && !game.kicked && <p>Подключаемся к комнате…</p>}
        {state && <>
          {player?.isBaseGuesser && state.status !== "lobby" && <fieldset disabled={!online} className="min-w-0 space-y-3">
            <AdminPanel state={state} onPauseGame={game.pauseGame} onResumeGame={game.resumeGame} onNewGame={() => game.newGame()} onRestartRound={game.restartRound} onUpdateSettings={game.updateSettings} />
          </fieldset>}
          {state.status === "lobby" ? <fieldset disabled={!online} className="min-w-0 space-y-4">
            <LobbyView state={state} onChooseTeam={game.chooseTeam} onChooseSpymasterTeam={game.chooseSpymasterTeam} onStartGame={game.startGame} onUpdateSettings={game.updateSettings} onRename={(name) => game.joinAs(name, state.currentPlayer?.role ?? "guesser")} />
          </fieldset> : <>
            <TimerBar state={state} remainingSeconds={game.remainingSeconds} />
            {state.status === "paused" && <p role="status" className="panel text-amber-200">Игра на паузе. {state.players.filter((item) => item.role === "spymaster" && !item.connected).map((item) => `${item.name} офлайн. `)}Продолжение — через меню администратора.</p>}
            {state.status === "game_over" && state.winner && <p className="panel text-xl font-bold">Победила команда {state.settings.teamNames[state.winner]}</p>}
            {player?.role === "spymaster" && <SpymasterClueInput state={state} onSubmit={game.submitClue} />}
            <GameBoard state={state} mode={player?.role === "spymaster" || state.status === "game_over" ? "spymaster" : "guesser"} interactive={online} onReveal={game.revealCard} />
            {canEnd && <button className="btn-secondary w-full" onClick={game.endGuessing}>Завершить отгадывание</button>}
            <details className="panel"><summary className="cursor-pointer font-bold">Игроки</summary><PlayerList state={state} isAdmin={Boolean(player?.isBaseGuesser)} /></details>
            {state.settings.showActionLog && <ActionLog items={state.actionLog} />}
          </>}
        </>}
      </div>
    </main>
  );
}

function SlidersIcon() {
  return <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current stroke-[1.8]"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" /></svg>;
}
