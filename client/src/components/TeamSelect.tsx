import type { Team, TeamSelection } from "@codenames/shared";

interface TeamSelectProps {
  title: string;
  selectedTeam?: TeamSelection;
  onChoose: (team: Team) => void;
}

export function TeamSelect({ title, selectedTeam, onChoose }: TeamSelectProps) {
  return (
    <div className={title ? "rounded-2xl bg-slate-900 p-4" : ""}>
      {title ? <p className="mb-3 font-semibold">{title}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button className={teamButtonClass("red", selectedTeam === "red")} onClick={() => onChoose("red")}>
          Красные
        </button>
        <button className={teamButtonClass("blue", selectedTeam === "blue")} onClick={() => onChoose("blue")}>
          Синие
        </button>
      </div>
    </div>
  );
}

function teamButtonClass(team: Team, selected: boolean): string {
  const base = "rounded-xl border-2 px-4 py-3 font-bold text-white transition";
  if (team === "red") {
    return selected
      ? `${base} border-red-200 bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.4)]`
      : `${base} border-red-500/50 bg-red-500/20 hover:bg-red-500/30`;
  }
  return selected
    ? `${base} border-blue-200 bg-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.4)]`
    : `${base} border-blue-500/50 bg-blue-500/20 hover:bg-blue-500/30`;
}
