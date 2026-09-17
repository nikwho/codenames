import { useState, type FormEvent } from "react";
import { getDeviceId, getStoredName, socket } from "../socket";

interface HomePageProps {
  navigate: (path: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = () => {
    setIsCreating(true);
    if (!socket.connected) socket.connect();
    socket.emit("createRoom", { deviceId: getDeviceId(), name: getStoredName(), role: "spymaster" }, ({ roomId }) => {
      setIsCreating(false);
      navigate(`/room/${roomId}`);
    });
  };

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    const normalized = roomCode.trim().toUpperCase();
    if (normalized) navigate(`/room/${normalized}`);
  };

  return <main className="min-h-dvh px-5 text-slate-100">
    <section className="mx-auto w-full max-w-sm pb-10 text-center" style={{ paddingTop: "18dvh" }}>
      <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Codenames</h1>
      <div style={{ marginTop: "16dvh" }}>
        <form onSubmit={joinRoom} className="flex gap-3">
          <input value={roomCode} onChange={(event) => setRoomCode(event.target.value)} placeholder="Код комнаты" aria-label="Код комнаты" className="field min-w-0 flex-1 uppercase" />
          <button type="submit" className="btn-secondary shrink-0">Войти</button>
        </form>
        <p className="my-6 text-xs font-black tracking-[0.24em] text-slate-500">ИЛИ</p>
        <button className="btn-primary w-full" onClick={createRoom} disabled={isCreating}>{isCreating ? "Создаём..." : "Создать комнату"}</button>
      </div>
    </section>
  </main>;
}
