import { useState } from "react";
import type { SanitizedGameState, Settings } from "@codenames/shared";
import { SettingsModal } from "./SettingsModal";

interface AdminPanelProps {
  state: SanitizedGameState;
  onStartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onNewGame: () => void;
  onRestartRound: () => void;
  onRevealKeyAfterGame: () => void;
  onResetPlayers: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export function AdminPanel(props: AdminPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state } = props;

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-3 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-black uppercase tracking-wide">Командный центр · «Стол»</h2>
        <span className="rounded-full bg-amber-400/20 px-2 py-1 text-[10px] font-black uppercase text-amber-200">главный экран</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {state.status === "lobby" && (
          <button className="btn-primary col-span-2 md:col-span-1" onClick={props.onStartGame}>
            Старт игры
          </button>
        )}
        <button className="btn-primary" onClick={props.onNewGame}>
          + Новая игра
        </button>
        <button className="btn-secondary" onClick={props.onRestartRound}>
          ↻ Перезапуск
        </button>
        <button className="btn-secondary" onClick={() => setSettingsOpen(true)} disabled={state.status !== "lobby"}>
          ⚙ Настройки
        </button>
        {state.status === "paused" ? (
          <button className="btn-secondary" onClick={props.onResumeGame}>
            Продолжить
          </button>
        ) : (
          <button className="btn-secondary" onClick={props.onPauseGame} disabled={state.status === "lobby" || state.status === "game_over"}>
            Пауза
          </button>
        )}
        <button className="btn-secondary" onClick={props.onRevealKeyAfterGame} disabled={state.status !== "game_over"}>
          Показать ключ
        </button>
        <button className="btn-secondary col-span-2 md:col-span-1" onClick={props.onResetPlayers}>
          Сбросить игроков
        </button>
      </div>
      {settingsOpen && (
        <SettingsModal settings={state.settings} onClose={() => setSettingsOpen(false)} onSave={props.onUpdateSettings} />
      )}
    </section>
  );
}
