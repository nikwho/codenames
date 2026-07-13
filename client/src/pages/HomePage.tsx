import { useState } from "react";
import type { PlayerRole } from "@codenames/shared";
import { getStoredName, getStoredRole, setStoredName, setStoredRole, socket } from "../socket";

interface HomePageProps {
  navigate: (path: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState(getStoredName());
  const [role, setRole] = useState<PlayerRole>(getStoredRole());
  const [isCreating, setIsCreating] = useState(false);

  const persistProfile = () => {
    setStoredName(name);
    setStoredRole(role);
  };

  const createRoom = () => {
    setStoredName(name);
    // Creator always joins as the table/admin device.
    setStoredRole("guesser");
    setRole("guesser");
    setIsCreating(true);
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("createRoom", undefined, ({ roomId }) => {
      setIsCreating(false);
      navigate(`/room/${roomId}`);
    });
  };

  const joinRoom = () => {
    persistProfile();
    const normalized = roomCode.trim().toUpperCase();
    if (normalized) {
      navigate(`/room/${normalized}`);
    }
  };

  return (
    <main className="min-h-screen text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-3 py-6 sm:px-6 sm:py-12">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-4 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Комната</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Кодовое Поле</h1>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-center sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Создайте комнату</p>
              <div className="mt-3 font-mono text-4xl font-black tracking-[0.18em] text-[var(--primary)] sm:text-5xl sm:tracking-[0.22em]">
                5×5
              </div>
            </div>
            <p className="mt-5 text-sm text-slate-300 sm:text-base">
              Поделитесь ссылкой или кодом, чтобы игроки присоединились со своих телефонов.
            </p>
            <div className="mt-5 grid gap-3 rounded-2xl bg-black/15 p-4 sm:grid-cols-[1fr_auto]">
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="Код комнаты"
                className="field uppercase"
              />
              <button className="btn-secondary" onClick={joinRoom}>
                Войти
              </button>
            </div>
          </div>

          <div className="panel p-4 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ваше имя</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Введите имя"
              className="field mt-2 h-12 w-full"
            />
            <p className="mt-5 text-xs uppercase tracking-[0.24em] text-slate-500">Выберите роль</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                ["guesser", "Отгадываю", "Открываю карточки"],
                ["spymaster", "Загадываю", "Даю подсказки"]
              ].map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value as PlayerRole)}
                  className={`rounded-2xl border-2 p-2.5 text-center transition sm:p-3 ${
                    role === value ? "border-[var(--primary)] bg-amber-400/15" : "border-white/10 bg-black/15 text-slate-400"
                  }`}
                >
                  <span className="block text-xs font-black text-slate-100 sm:text-sm">{label}</span>
                  <span className="mt-1 block text-[10px] leading-tight sm:text-[11px]">{hint}</span>
                </button>
              ))}
            </div>

            <button className="btn-primary mt-6 w-full sm:mt-8" onClick={createRoom} disabled={isCreating}>
              {isCreating ? "Создаем..." : "Создать комнату"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

