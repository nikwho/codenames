import type { SanitizedGameState, Team } from "@codenames/shared";
import { PlayerList } from "./PlayerList";
import { RoomQrCode } from "./RoomQrCode";
import { TeamSelect } from "./TeamSelect";

interface LobbyViewProps {
  state: SanitizedGameState;
  onChooseTeam: (team: Team) => void;
  onChooseSpymasterTeam: (team: Team) => void;
  onStartGame: () => void;
}

export function LobbyView({ state, onChooseTeam, onChooseSpymasterTeam, onStartGame }: LobbyViewProps) {
  const player = state.currentPlayer;
  const spymasters = state.players.filter((item) => item.role === "spymaster");
  const canStart = Boolean(player?.isBaseGuesser && state.status === "lobby");
  const joinUrl = window.location.href;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="panel p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Комната</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">Пятничный стол</h2>
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4 text-center sm:mt-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Код комнаты</p>
          <div className="mt-2 break-all font-mono text-4xl font-black tracking-[0.18em] text-[var(--primary)] sm:text-6xl sm:tracking-[0.28em]">
            {state.roomId}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="mx-auto w-fit rounded-2xl bg-[var(--tile)] p-2 shadow-lg shadow-black/20 sm:mx-0">
            <RoomQrCode size={148} />
          </div>
          <div className="flex flex-col justify-center gap-3 text-center sm:text-left">
            <p className="text-sm text-slate-400">
              Отсканируйте QR-код камерой телефона или поделитесь ссылкой / кодом комнаты.
            </p>
            <button className="btn-secondary w-full" onClick={() => navigator.clipboard.writeText(joinUrl)}>
              Скопировать ссылку
            </button>
          </div>
        </div>
        <div className="mt-4 sm:mt-5">
          <PlayerList players={state.players} />
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ваше имя</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black sm:text-2xl">{player?.name ?? "Игрок"}</h2>
          {player?.isBaseGuesser && (
            <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-black text-[#2f2411]">
              Администратор
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Роль: {player?.role === "spymaster" ? "Загадывающий" : "Отгадывающий"}
        </p>

        {((player?.role === "guesser" && !player.isBaseGuesser) ||
          (player?.role === "spymaster" && spymasters.length > 1)) && (
          <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-black/15 p-4 sm:mt-6">
            {player.role === "guesser" && (
              <>
                <p className="mb-3 text-sm font-medium text-slate-200">Администратор уже подключён — выберите команду</p>
                <TeamSelect title="" selectedTeam={player.team} onChoose={onChooseTeam} />
              </>
            )}
            {player.role === "spymaster" && (
              <>
                <p className="mb-3 text-sm font-medium text-slate-200">Уже есть ведущий — выберите свою команду</p>
                <TeamSelect title="" selectedTeam={player.team} onChoose={onChooseSpymasterTeam} />
              </>
            )}
          </div>
        )}

        {canStart ? (
          <button className="btn-primary mt-5 w-full sm:mt-6" onClick={onStartGame}>
            Начать игру
          </button>
        ) : (
          <p className="mt-5 text-sm text-slate-400 sm:mt-6">Старт игры доступен администратору.</p>
        )}
      </section>
    </div>
  );
}
