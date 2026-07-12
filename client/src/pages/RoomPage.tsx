import { useEffect, useState } from "react";
import type { DisplayView, SanitizedGameState } from "@codenames/shared";
import { AdminPanel } from "../components/AdminPanel";
import { ActionLog } from "../components/ActionLog";
import { GameBoard } from "../components/GameBoard";
import { LobbyView } from "../components/LobbyView";
import { RoleSelect } from "../components/RoleSelect";
import { SpymasterClueInput } from "../components/SpymasterClueInput";
import { TimerBar } from "../components/TimerBar";
import { useGameSocket } from "../hooks/useGameSocket";

interface RoomPageProps {
  roomId: string;
  navigate: (path: string) => void;
}

export function RoomPage({ roomId, navigate }: RoomPageProps) {
  const game = useGameSocket(roomId);
  const state = game.state;
  const player = state?.currentPlayer ?? null;
  const [displayView, setDisplayView] = useState<DisplayView>("lobby");
  const [scenesOpen, setScenesOpen] = useState(true);

  useEffect(() => {
    if (game.nextRoomId && game.nextRoomId !== roomId) {
      navigate(`/room/${game.nextRoomId}`);
    }
  }, [game.nextRoomId, navigate, roomId]);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (state.status === "lobby") {
      setDisplayView("lobby");
    } else if (player?.isBaseGuesser) {
      setDisplayView("table");
    } else if (player?.role === "spymaster") {
      setDisplayView("spymaster");
    } else {
      setDisplayView("guesser");
    }
  }, [player?.isBaseGuesser, player?.role, state?.roomId, state?.status]);

  const chooseDisplayView = (view: DisplayView) => {
    setDisplayView(view);
    game.setDisplayView(view);
  };

  return (
    <main className="min-h-screen overflow-x-hidden text-slate-100">
      <div className="mx-auto max-w-7xl px-3 pb-8 pt-3 sm:px-4 sm:py-5">
        <header className="sticky top-0 z-30 -mx-3 mb-4 border-b border-white/10 bg-[var(--bg)]/95 px-3 py-2 backdrop-blur sm:static sm:mx-0 sm:mb-5 sm:bg-transparent sm:px-0 sm:py-0 sm:pb-4 sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] font-black text-[#2f2411] sm:size-9"
                onClick={() => navigate("/")}
              >
                P
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-black sm:text-lg">Кодовое Поле</h1>
                  <span className="hidden rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500 sm:inline">
                    демо-прототип
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                  {game.connectionStatus === "connected" ? "online" : game.connectionStatus} · {roomId}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="pill hidden sm:inline-flex" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                Скопировать ссылку
              </button>
              <button className="pill" onClick={() => setScenesOpen((value) => !value)}>
                {scenesOpen ? "Скрыть сцены" : "Сцены"}
              </button>
            </div>
          </div>

          {scenesOpen && (
            <div className="mt-3 space-y-2 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">Экран</span>
                {(
                  [
                    ["lobby", "Лобби"],
                    ["guesser", "Отгадывающий"],
                    ["spymaster", "Загадывающий"],
                    ["table", "Стол"]
                  ] as const
                ).map(([view, label]) => (
                  <button
                    key={view}
                    className={`pill ${displayView === view ? "pill-active" : ""}`}
                    onClick={() => chooseDisplayView(view)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {state && displayView !== "lobby" && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">Сцена</span>
                  <ScenePill active={state.currentTeam === "red"} label="Ход красных" />
                  <ScenePill active={state.currentTeam === "blue"} label="Ход синих" />
                  <ScenePill active={state.status === "clue_phase"} label="Фаза подсказки" />
                  <ScenePill active={state.status === "guessing_phase"} label="Фаза отгадывания" />
                  <ScenePill active={state.status === "game_over"} label="Игра окончена" />
                </div>
              )}
            </div>
          )}
        </header>

        {game.error && (
          <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-rose-100">{game.error}</div>
        )}

        {!state && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-2xl font-semibold">Подключаемся...</h2>
            <p className="mt-2 text-slate-400">Если код комнаты неверный, сервер вернет ошибку.</p>
          </section>
        )}

        {state && (
          <GameView
            displayView={displayView}
            state={state}
            actions={{
              joinAs: game.joinAs,
              chooseTeam: game.chooseTeam,
              chooseSpymasterTeam: game.chooseSpymasterTeam,
              startGame: game.startGame,
              pauseGame: game.pauseGame,
              resumeGame: game.resumeGame,
              newGame: () => game.newGame(),
              restartRound: game.restartRound,
              revealKeyAfterGame: game.revealKeyAfterGame,
              resetPlayers: game.resetPlayers,
              updateSettings: game.updateSettings,
              submitClue: game.submitClue,
              revealCard: game.revealCard,
              endGuessing: game.endGuessing
            }}
            remainingSeconds={game.remainingSeconds}
          />
        )}
      </div>
    </main>
  );
}

function GameView({
  displayView,
  state,
  remainingSeconds,
  actions
}: {
  displayView: DisplayView;
  state: SanitizedGameState;
  remainingSeconds: number | null;
  actions: ReturnType<typeof createActionShape>;
}) {
  if (displayView === "lobby" || state.status === "lobby") {
    return (
      <div className="space-y-4">
        {state.currentPlayer?.isBaseGuesser && (
          <AdminPanel
            state={state}
            onPauseGame={actions.pauseGame}
            onResumeGame={actions.resumeGame}
            onNewGame={actions.newGame}
            onRestartRound={actions.restartRound}
            onUpdateSettings={actions.updateSettings}
          />
        )}
        <RoleSelect currentPlayer={state.currentPlayer} onJoin={actions.joinAs} />
        <LobbyView
          state={state}
          onChooseTeam={actions.chooseTeam}
          onChooseSpymasterTeam={actions.chooseSpymasterTeam}
          onStartGame={actions.startGame}
        />
      </div>
    );
  }

  if (displayView === "spymaster") {
    return (
      <div className="space-y-3 sm:space-y-4">
        <TimerBar state={state} remainingSeconds={remainingSeconds} />
        <SpymasterClueInput state={state} onSubmit={actions.submitClue} />
        <GameBoard state={state} mode="spymaster" interactive={false} onReveal={actions.revealCard} />
        {state.settings.showActionLog && <ActionLog items={state.actionLog} />}
      </div>
    );
  }

  if (displayView === "table") {
    return (
      <div className="space-y-3 sm:space-y-4">
        <AdminPanel
          state={state}
          onPauseGame={actions.pauseGame}
          onResumeGame={actions.resumeGame}
          onNewGame={actions.newGame}
          onRestartRound={actions.restartRound}
          onUpdateSettings={actions.updateSettings}
        />
        <TimerBar state={state} remainingSeconds={remainingSeconds} />
        <BoardOnly
          state={state}
          boardMode={state.keyRevealed ? "spymaster" : "guesser"}
          onReveal={actions.revealCard}
          onEndGuessing={actions.endGuessing}
        />
        {state.settings.showActionLog && <ActionLog items={state.actionLog} />}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <TimerBar state={state} remainingSeconds={remainingSeconds} />
      <BoardOnly state={state} boardMode="guesser" onReveal={actions.revealCard} onEndGuessing={actions.endGuessing} />
      {state.settings.showActionLog && <ActionLog items={state.actionLog} />}
    </div>
  );
}

function BoardOnly({
  state,
  boardMode,
  onReveal,
  onEndGuessing
}: {
  state: SanitizedGameState;
  boardMode: "guesser" | "spymaster";
  onReveal: (cardId: string) => void;
  onEndGuessing: () => void;
}) {
  const canEnd =
    state.status === "guessing_phase" &&
    state.currentPlayer?.role === "guesser" &&
    (state.currentPlayer.isBaseGuesser || state.currentPlayer.team === state.currentTeam);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 sm:space-y-4">
      <GameBoard state={state} mode={boardMode} interactive onReveal={onReveal} />
      {canEnd && (
        <button className="btn-secondary w-full" onClick={onEndGuessing}>
          Завершить отгадывание
        </button>
      )}
    </div>
  );
}

function ScenePill({ active, label }: { active: boolean; label: string }) {
  return <span className={`pill ${active ? "pill-active" : ""}`}>{label}</span>;
}

function createActionShape() {
  return {
    joinAs: (_name: string, _role: "guesser" | "spymaster" | "spectator") => {},
    chooseTeam: (_team: "red" | "blue") => {},
    chooseSpymasterTeam: (_team: "red" | "blue") => {},
    startGame: () => {},
    pauseGame: () => {},
    resumeGame: () => {},
    newGame: () => {},
    restartRound: () => {},
    revealKeyAfterGame: () => {},
    resetPlayers: () => {},
    updateSettings: (_settings: Partial<SanitizedGameState["settings"]>) => {},
    submitClue: (_payload: { text: string }) => {},
    revealCard: (_cardId: string) => {},
    endGuessing: () => {}
  };
}
