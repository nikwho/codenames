import { useEffect } from "react";
import { AdminPanel } from "../components/AdminPanel";
import { ActionLog } from "../components/ActionLog";
import { GameBoard } from "../components/GameBoard";
import { LobbyView } from "../components/LobbyView";
import { RoleSelect } from "../components/RoleSelect";
import { SpymasterClueInput } from "../components/SpymasterClueInput";
import { TimerBar } from "../components/TimerBar";
import { PlayerManagement } from "../components/PlayerManagement";
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
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <button className="text-lg font-black" onClick={() => navigate("/")}>Кодовое Поле</button>
          <span className="text-sm text-slate-400">{roomId} · {online ? "Онлайн" : "Восстанавливаем связь…"}</span>
          <button className="pill" onClick={() => navigator.clipboard.writeText(window.location.href)}>Скопировать ссылку</button>
        </header>
        {!online && <p role="status" className="rounded-xl bg-amber-500/15 p-3 text-amber-200">Нет связи с сервером. Действия временно недоступны.</p>}
        {game.error && <p role="alert" className="rounded-xl bg-rose-500/15 p-3 text-rose-200">{game.error}</p>}
        {game.kicked && <button className="btn-secondary" onClick={() => navigate("/")}>На главную</button>}
        {!state && !game.kicked && <p>Подключаемся к комнате…</p>}
        {state && <>
          {player?.isBaseGuesser && <fieldset disabled={!online} className="min-w-0 space-y-3">
            <AdminPanel state={state} onPauseGame={game.pauseGame} onResumeGame={game.resumeGame} onNewGame={() => game.newGame()} onRestartRound={game.restartRound} onUpdateSettings={game.updateSettings} />
            <PlayerManagement state={state} />
          </fieldset>}
          {state.status === "lobby" ? <fieldset disabled={!online} className="min-w-0 space-y-4">
            <RoleSelect currentPlayer={state.currentPlayer} onJoin={game.joinAs} />
            <LobbyView state={state} onChooseTeam={game.chooseTeam} onChooseSpymasterTeam={game.chooseSpymasterTeam} onStartGame={game.startGame} />
          </fieldset> : <>
            <TimerBar state={state} remainingSeconds={game.remainingSeconds} />
            {state.status === "paused" && <p role="status" className="panel text-amber-200">Игра на паузе. {state.players.filter((item) => item.role === "spymaster" && !item.connected).map((item) => `${item.name} офлайн. `)}Продолжение — через меню администратора.</p>}
            {state.status === "game_over" && state.winner && <p className="panel text-xl font-bold">Победила команда {state.settings.teamNames[state.winner]}</p>}
            {player?.role === "spymaster" && <SpymasterClueInput state={state} onSubmit={game.submitClue} />}
            <GameBoard state={state} mode={player?.role === "spymaster" || state.status === "game_over" ? "spymaster" : "guesser"} interactive={online} onReveal={game.revealCard} />
            {canEnd && <button className="btn-secondary w-full" onClick={game.endGuessing}>Завершить отгадывание</button>}
            {!player?.isBaseGuesser && <details className="panel"><summary>Игроки</summary><PlayerList players={state.players} /></details>}
            {state.settings.showActionLog && <ActionLog items={state.actionLog} />}
          </>}
        </>}
      </div>
    </main>
  );
}
