import { useState } from "react";
import type { PlayerDevice, PlayerRole } from "@codenames/shared";
import { getStoredName, getStoredRole } from "../socket";

interface RoleSelectProps {
  currentPlayer: PlayerDevice | null;
  onJoin: (name: string, role: PlayerRole) => void;
}

const ROLES: Array<{ value: PlayerRole; label: string; hint: string }> = [
  { value: "guesser", label: "Отгадываю", hint: "Открываю карточки" },
  { value: "spymaster", label: "Загадываю", hint: "Даю подсказки" },
  { value: "spectator", label: "Наблюдатель", hint: "Просто смотрю" }
];

export function RoleSelect({ currentPlayer, onJoin }: RoleSelectProps) {
  const [name, setName] = useState(currentPlayer?.name ?? getStoredName());
  const [role, setRole] = useState<PlayerRole>(currentPlayer?.role ?? getStoredRole());

  return (
    <section className="panel p-4 sm:p-5">
      <label className="block">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Ваше имя</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field mt-2 h-12 w-full"
          placeholder="Введите имя"
        />
      </label>

      <p className="mt-5 text-xs uppercase tracking-[0.24em] text-slate-500">Выберите роль</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {ROLES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setRole(item.value)}
            className={`rounded-2xl border-2 p-2.5 text-center transition sm:p-3 ${
              role === item.value ? "border-[var(--primary)] bg-amber-400/15" : "border-white/10 bg-black/15 text-slate-400"
            }`}
          >
            <span className="block text-xs font-black text-slate-100 sm:text-sm">{item.label}</span>
            <span className="mt-1 block text-[10px] leading-tight sm:text-[11px]">{item.hint}</span>
          </button>
        ))}
      </div>

      <button className="btn-primary mt-5 w-full" onClick={() => onJoin(name, role)}>
        Присоединиться к игре
      </button>
      {currentPlayer?.isBaseGuesser && <p className="mt-3 text-sm text-amber-200">Это базовое устройство: Стол.</p>}
    </section>
  );
}
