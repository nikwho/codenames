import { useEffect, useRef, useState } from "react";
import type { Clue, SanitizedGameState, Team } from "@codenames/shared";

interface TimerBarProps {
  state: SanitizedGameState;
  remainingSeconds: number | null;
}

export function TimerBar({ state, remainingSeconds }: TimerBarProps) {
  const total = state.timers.phaseDurationSeconds ?? totalSecondsFallback(state);
  const percent = remainingSeconds === null || total === 0 ? 0 : Math.max(0, Math.min(100, (remainingSeconds / total) * 100));
  const team = state.currentTeam;
  const clueTeam = state.currentClue?.team ?? team;
  const clueText = state.currentClue?.text ?? "Подсказка еще не задана";
  const [openScoreTeam, setOpenScoreTeam] = useState<Team | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openScoreTeam) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (scoreRef.current && !scoreRef.current.contains(event.target as Node)) {
        setOpenScoreTeam(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenScoreTeam(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openScoreTeam]);

  return (
    <section className="panel relative z-20 flex flex-wrap items-center gap-2 p-2.5 sm:flex-nowrap sm:gap-3 sm:p-3">
      <div
        className={`shrink-0 rounded-xl px-2 py-1 text-xs font-black uppercase tracking-wide sm:px-3 sm:py-1.5 sm:text-base ${
          team === "red" ? "bg-red-500/20 text-red-200" : "bg-blue-500/20 text-blue-200"
        }`}
      >
        {state.settings.teamNames[team]}
      </div>

      <div
        className={`order-last min-w-0 basis-full truncate rounded-xl px-2.5 py-1.5 text-sm font-black uppercase sm:order-none sm:basis-auto sm:flex-1 sm:px-3 sm:text-base ${
          clueTeam === "red"
            ? state.currentClue
              ? "bg-rose-500/20 text-rose-100"
              : "bg-rose-500/10 text-rose-200/70"
            : state.currentClue
              ? "bg-sky-500/20 text-sky-100"
              : "bg-sky-500/10 text-sky-200/70"
        }`}
        title={clueText}
      >
        {clueText}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
        <div ref={scoreRef} className="relative flex items-center gap-1.5">
          <ScoreChip
            team="red"
            remaining={state.teams.red.remaining}
            active={openScoreTeam === "red"}
            onClick={() => setOpenScoreTeam((current) => (current === "red" ? null : "red"))}
          />
          <ScoreChip
            team="blue"
            remaining={state.teams.blue.remaining}
            active={openScoreTeam === "blue"}
            onClick={() => setOpenScoreTeam((current) => (current === "blue" ? null : "blue"))}
          />
          {openScoreTeam && (
            <ClueHistoryPopup
              team={openScoreTeam}
              teamName={state.settings.teamNames[openScoreTeam]}
              clues={state.clueHistory.filter((clue) => clue.team === openScoreTeam)}
            />
          )}
        </div>

        <div className="flex flex-col items-end pl-1">
          <span className="font-mono text-base font-black tabular-nums sm:text-xl">
            {remainingSeconds === null ? "—:—" : formatTime(remainingSeconds)}
          </span>
          <span className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-white/10 sm:w-16">
            <span className="block h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${percent}%` }} />
          </span>
        </div>
      </div>
    </section>
  );
}

function ScoreChip({
  team,
  remaining,
  active,
  onClick
}: {
  team: Team;
  remaining: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-9 rounded-xl px-2 py-1.5 text-center transition sm:min-w-10 ${
        team === "red"
          ? active
            ? "bg-red-500 text-white"
            : "bg-red-500/20 text-red-200 hover:bg-red-500/30"
          : active
            ? "bg-blue-500 text-white"
            : "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"
      }`}
      aria-label={`${team === "red" ? "Красные" : "Синие"}: ${remaining} осталось`}
      aria-expanded={active}
    >
      <span className="block text-sm font-black tabular-nums sm:text-base">{remaining}</span>
    </button>
  );
}

function ClueHistoryPopup({ team, teamName, clues }: { team: Team; teamName: string; clues: Clue[] }) {
  return (
    <div
      className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border p-3 shadow-2xl shadow-black/40 ${
        team === "red" ? "border-red-400/30 bg-slate-950/95" : "border-blue-400/30 bg-slate-950/95"
      }`}
      role="dialog"
      aria-label={`Подсказки команды ${teamName}`}
    >
      <p className={`text-[10px] font-black uppercase tracking-widest ${team === "red" ? "text-red-200" : "text-blue-200"}`}>
        Подсказки · {teamName}
      </p>
      <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {clues.length === 0 ? (
          <p className="rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-500">Еще нет подсказок</p>
        ) : (
          clues.map((clue) => (
            <div key={clue.id} className="rounded-xl bg-black/25 px-3 py-1.5 text-xs font-bold uppercase text-slate-100">
              {clue.text}
            </div>
          ))
        )}
      </div>
    </div>
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
