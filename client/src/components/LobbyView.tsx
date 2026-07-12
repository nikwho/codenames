import type { SanitizedGameState, Team } from "@codenames/shared";
import { PlayerList } from "./PlayerList";
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
        <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-[120px_1fr]">
          <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-[var(--tile)] p-2 text-4xl font-black text-[var(--tile-text)] sm:mx-0 sm:size-auto sm:aspect-square">
            {state.roomId.slice(0, 2)}
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-slate-400">Поделитесь ссылкой или кодом, чтобы игроки присоединились со своих телефонов.</p>
            <button className="btn-secondary w-full" onClick={() => navigator.clipboard.writeText(window.location.href)}>
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
        <h2 className="mt-2 text-xl font-black sm:text-2xl">{player?.name ?? "Игрок"}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Роль:{" "}
          {player?.role === "spymaster" ? "Загадывающий" : player?.role === "spectator" ? "Наблюдатель" : "Отгадывающий"}
        </p>

        <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-black/15 p-4 sm:mt-6">
          {player?.isBaseGuesser && (
            <div>
              <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-black text-[#2f2411]">Стол</span>
              <p className="mt-3 text-sm text-slate-300">
                Главное устройство открывает карточки за обе команды и управляет игрой.
              </p>
            </div>
          )}
          {player?.role === "spymaster" && spymasters.length <= 1 && (
            <p className="text-sm text-slate-300">Вы единственный загадывающий — можете давать подсказки за обе команды.</p>
          )}
          {player?.role === "guesser" && !player.isBaseGuesser && (
            <p className="mb-3 text-sm font-medium text-slate-200">«Стол» уже подключён — выберите команду</p>
          )}
          {player?.role === "spymaster" && spymasters.length > 1 && (
            <p className="mb-3 text-sm font-medium text-slate-200">Уже есть ведущий — выберите свою команду</p>
          )}
          {player?.role === "guesser" && !player.isBaseGuesser && (
            <TeamSelect title="" selectedTeam={player.team} onChoose={onChooseTeam} />
          )}
          {player?.role === "spymaster" && spymasters.length > 1 && (
            <TeamSelect title="" selectedTeam={player.team} onChoose={onChooseSpymasterTeam} />
          )}
        </div>

        {canStart ? (
          <button className="btn-primary mt-5 w-full sm:mt-6" onClick={onStartGame}>
            Начать игру
          </button>
        ) : (
          <p className="mt-5 text-sm text-slate-400 sm:mt-6">Старт игры доступен устройству «Стол».</p>
        )}
      </section>
    </div>
  );
}
