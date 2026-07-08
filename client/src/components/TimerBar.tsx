import type { SanitizedGameState } from "@codenames/shared";

interface TimerBarProps {
  state: SanitizedGameState;
  remainingSeconds: number | null;
}

export function TimerBar({ state, remainingSeconds }: TimerBarProps) {
  const total = state.timers.phaseDurationSeconds ?? totalSecondsFallback(state);
  const percent = remainingSeconds === null || total === 0 ? 0 : Math.max(0, Math.min(100, (remainingSeconds / total) * 100));

  return (
    <section className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:block">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Сейчас ходит</p>
          <h2
            className={
              state.currentTeam === "red"
                ? "flex items-center gap-2 text-base font-bold text-red-100 sm:text-lg"
                : "flex items-center gap-2 text-base font-bold text-blue-100 sm:text-lg"
            }
          >
            <span
              className={
                state.currentTeam === "red" ? "size-2.5 rounded-full bg-[var(--red)]" : "size-2.5 rounded-full bg-[var(--blue)]"
              }
            />
            {state.settings.teamNames[state.currentTeam]}
          </h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide sm:hidden">
          {phaseLabel(state.status)}
        </span>
      </div>

      <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide sm:inline">
        {phaseLabel(state.status)}
      </span>

      <div className="flex flex-col items-start sm:items-end">
        <span className="font-mono text-3xl font-black tabular-nums sm:text-4xl">
          {remainingSeconds === null ? "—:—" : formatTime(remainingSeconds)}
        </span>
        <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10 sm:w-24">
          <span className="block h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${percent}%` }} />
        </span>
      </div>
    </section>
  );
}

function totalSecondsFallback(state: SanitizedGameState): number {
  if (state.status === "clue_phase") return state.settings.clueSeconds;
  if (state.status === "guessing_phase") return state.settings.guessingSeconds;
  return 0;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function phaseLabel(status: SanitizedGameState["status"]): string {
  const labels: Record<SanitizedGameState["status"], string> = {
    lobby: "Лобби",
    familiarization: "Подсказка",
    clue_phase: "Подсказка",
    guessing_phase: "Отгадывание",
    paused: "Пауза",
    game_over: "Игра окончена"
  };
  return labels[status];
}
