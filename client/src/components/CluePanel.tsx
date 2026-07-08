import type { SanitizedGameState } from "@codenames/shared";

interface CluePanelProps {
  state: SanitizedGameState;
}

export function CluePanel({ state }: CluePanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--panel)]/90 p-3 shadow-xl shadow-black/20 sm:rounded-3xl">
      <div className="rounded-2xl bg-black/20 px-3 py-3 sm:px-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Текущая подсказка</p>
        {state.currentClue ? (
          <p className="mt-1 break-words text-xl font-black uppercase sm:text-2xl">{state.currentClue.text}</p>
        ) : (
          <p className="mt-1 text-slate-300">Пока нет подсказки</p>
        )}
        <p className="mt-2 text-sm text-slate-400">
          Сейчас ходит:{" "}
          <span className={state.currentTeam === "red" ? "font-bold text-red-300" : "font-bold text-blue-300"}>
            {state.settings.teamNames[state.currentTeam]}
          </span>
        </p>
      </div>
      {state.status === "game_over" && state.winner && (
        <p className="mt-3 rounded-2xl bg-emerald-400/10 p-3 text-emerald-200 sm:mt-4 sm:p-4">
          Победила команда {state.settings.teamNames[state.winner]}
        </p>
      )}
    </section>
  );
}
