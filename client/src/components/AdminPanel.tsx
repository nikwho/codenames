import { useState } from "react";
import type { SanitizedGameState, Settings } from "@codenames/shared";
import { SettingsModal } from "./SettingsModal";

interface AdminPanelProps {
  state: SanitizedGameState;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onNewGame: () => void;
  onRestartRound: () => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
}

export function AdminPanel(props: AdminPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = props;
  const isPaused = state.status === "paused";
  const canPause = state.status !== "lobby" && state.status !== "game_over";

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <section className="relative rounded-3xl border border-amber-400/20 bg-amber-400/5 p-3 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-wide">Командный центр · «Стол»</h2>
          <p className="mt-1 text-xs text-amber-100/70">Администрирование комнаты</p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          ☰ Меню
        </button>
      </div>
      {menuOpen && (
        <div
          className="absolute right-3 top-16 z-20 grid w-56 gap-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-black/40"
          role="menu"
        >
          <button className="btn-primary justify-start" onClick={() => runMenuAction(props.onNewGame)}>
            Новая игра
          </button>
          <button className="btn-secondary justify-start" onClick={() => runMenuAction(props.onRestartRound)} disabled={state.status === "lobby"}>
            Перезапуск
          </button>
          <button
            className="btn-secondary justify-start"
            onClick={() => runMenuAction(() => setSettingsOpen(true))}
          >
            Настройки
          </button>
          {isPaused ? (
            <button className="btn-secondary justify-start" onClick={() => runMenuAction(props.onResumeGame)}>
              Продолжить
            </button>
          ) : (
            <button className="btn-secondary justify-start" onClick={() => runMenuAction(props.onPauseGame)} disabled={!canPause}>
              Пауза
            </button>
          )}
        </div>
      )}
      {settingsOpen && (
        <SettingsModal settings={state.settings} onClose={() => setSettingsOpen(false)} onSave={props.onUpdateSettings} />
      )}
    </section>
  );
}
