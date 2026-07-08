import type { Team } from "@codenames/shared";

interface TeamSelectProps {
  title: string;
  onChoose: (team: Team) => void;
}

export function TeamSelect({ title, onChoose }: TeamSelectProps) {
  return (
    <div className={title ? "rounded-2xl bg-slate-900 p-4" : ""}>
      {title ? <p className="mb-3 font-semibold">{title}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button className="rounded-xl border-2 border-red-500/50 bg-red-500/20 px-4 py-3 font-bold text-white" onClick={() => onChoose("red")}>
          Красные
        </button>
        <button className="rounded-xl border-2 border-blue-500/50 bg-blue-500/20 px-4 py-3 font-bold text-white" onClick={() => onChoose("blue")}>
          Синие
        </button>
      </div>
    </div>
  );
}
