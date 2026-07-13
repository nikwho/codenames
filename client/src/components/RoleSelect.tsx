import { useEffect, useRef, useState } from "react";
import type { PlayerDevice, PlayerRole } from "@codenames/shared";
import { getStoredName, getStoredRole } from "../socket";

interface RoleSelectProps {
  currentPlayer: PlayerDevice | null;
  onJoin: (name: string, role: PlayerRole) => void;
}

const ROLES: Array<{ value: PlayerRole; label: string; hint: string }> = [
  { value: "guesser", label: "Отгадываю", hint: "Открываю карточки" },
  { value: "spymaster", label: "Загадываю", hint: "Даю подсказки" }
];

export function RoleSelect({ currentPlayer, onJoin }: RoleSelectProps) {
  const storedRole = getStoredRole();
  const initialRole = currentPlayer?.role === "spymaster" || currentPlayer?.role === "guesser"
    ? currentPlayer.role
    : storedRole === "spymaster"
      ? "spymaster"
      : "guesser";
  const [name, setName] = useState(currentPlayer?.name ?? getStoredName());
  const [role, setRole] = useState<PlayerRole>(initialRole);
  const nameFocusedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentPlayer?.name || nameFocusedRef.current) {
      return;
    }
    setName(currentPlayer.name);
  }, [currentPlayer?.name]);

  useEffect(() => {
    if (!currentPlayer) {
      return;
    }
    if (currentPlayer.role === "guesser" || currentPlayer.role === "spymaster") {
      setRole(currentPlayer.role);
    }
  }, [currentPlayer?.role]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const commit = (nextName: string, nextRole: PlayerRole) => {
    onJoin(nextName.trim() || (currentPlayer?.isBaseGuesser ? "Стол" : "Игрок"), nextRole);
  };

  const scheduleNameCommit = (nextName: string) => {
    if (!currentPlayer) {
      return;
    }
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      commit(nextName, role);
    }, 350);
  };

  return (
    <section className="panel p-4 sm:p-5">
      <label className="block">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Ваше имя</span>
        <input
          value={name}
          onChange={(event) => {
            const next = event.target.value;
            setName(next);
            scheduleNameCommit(next);
          }}
          onFocus={() => {
            nameFocusedRef.current = true;
          }}
          onBlur={() => {
            nameFocusedRef.current = false;
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            commit(name, role);
          }}
          className="field mt-2 h-12 w-full"
          placeholder="Введите имя"
        />
      </label>

      <p className="mt-5 text-xs uppercase tracking-[0.24em] text-slate-500">Выберите роль</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ROLES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setRole(item.value);
              commit(name, item.value);
            }}
            className={`rounded-2xl border-2 p-2.5 text-center transition sm:p-3 ${
              role === item.value ? "border-[var(--primary)] bg-amber-400/15" : "border-white/10 bg-black/15 text-slate-400"
            }`}
          >
            <span className="block text-xs font-black text-slate-100 sm:text-sm">{item.label}</span>
            <span className="mt-1 block text-[10px] leading-tight sm:text-[11px]">{item.hint}</span>
          </button>
        ))}
      </div>

      {!currentPlayer && (
        <button className="btn-primary mt-5 w-full" onClick={() => commit(name, role)}>
          Присоединиться к игре
        </button>
      )}
    </section>
  );
}
