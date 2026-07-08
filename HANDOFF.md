# Handoff / Context — Codenames Realtime

Документ для быстрого продолжения работы в другой ОС / другой сессии Cursor.
Актуально на: **2026-07-08**.

## Что это

Браузерная real-time «Кодовые имена» / Codenames.

- Monorepo npm workspaces: `shared`, `server`, `client`
- Без БД, без auth (кроме `localStorage` `deviceId` + имя)
- Комнаты in-memory на сервере
- Real-time через Socket.IO

## Быстрый старт (Windows / Linux / macOS)

```bash
cd codenames   # или путь к клону
npm install
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`
- Health: обычно `/health` или `/api/health` (проверить `server/src/index.ts`)
- Client env override: `VITE_SERVER_URL=http://localhost:3001`

```bash
npm test
npm run build
```

На сервере (Ubuntu VPS, без Docker): см. [`infra/README.md`](infra/README.md).

## Структура

```text
codenames/
  package.json          # workspaces + scripts
  README.md             # RU запуск
  HANDOFF.md            # этот файл
  shared/               # типы, Socket.IO контракты, DEFAULT_SETTINGS
  server/               # Express + Socket.IO + engine + rooms + words.ru + vitest
  client/               # React + Vite + Tailwind
  ui-reference/         # v0.dev референс UI — НЕ импортировать код; папку позже удалят
  infra/                # bash deploy на Ubuntu (nginx, PM2, release/rollback)
  ecosystem.config.cjs  # PM2
```

## Архитектура

### Shared (`shared/src/types.ts`)

Сущности: `GameRoom`, `Card`, `PlayerDevice`, `Settings`, `Clue`, `ActionLogEntry`, `Timers`.

Важные типы:

- `RoomStatus`: `"lobby" | "familiarization" | "clue_phase" | "guessing_phase" | "paused" | "game_over"`
  - **Важно:** `"familiarization"` оставлен в типе для совместимости, но **как отдельная фаза для игроков больше не используется**.
- `DisplayView`: `"lobby" | "guesser" | "spymaster" | "table"` — debug-экран, не реальная роль.
- `Clue` / `SubmitCluePayload`: только `{ text: string }` (например `"стол 2"`), без отдельного `count`.
- `Timers` включает `phaseDurationSeconds` для корректного progress-bar таймера.

### Engine (`server/src/engine/game.ts`)

Авторитетная логика. Socket.IO только вызывает engine и рассылает sanitized state.

Ключевые правила (актуальные):

1. **Старт поля**
   - Выбирается starting team (`settings.startingTeam`: `"random" | "red" | "blue"`).
   - Команда, которая ходит первой, получает **9** карточек, вторая — **8**.
   - `settings.redCards` / `blueCards` (default 9 и 8) — это majority/minority, а не «всегда красные=9».
   - Ход всегда начинает команда с 9.

2. **Нет видимой фазы ознакомления**
   - После `startGame` сразу `clue_phase`.
   - Таймер первой подсказки = `clueSeconds + familiarizationSeconds`.
   - `familiarizationSeconds` в UI назван «Бонус к первой подсказке».
   - `advanceFromFamiliarization` удалён; `rooms.ts` больше не обрабатывает status `familiarization`.

3. **Роли**
   - Первый guesser → base guesser «Стол», `team: "both"`, админ-команды.
   - Остальные guessers выбирают `red`/`blue`.
   - Один spymaster → `team: "both"` (после join/смены роли нормализуется через `normalizeSpymasterAssignments`).
   - Второй spymaster выбирает команду и лочит первого на противоположную.
   - Spectators только смотрят.

4. **Подсказка**
   - Только spymaster в `clue_phase`, только за активную команду (или `both`).
   - Текст одной строкой: `submitClue({ text })`.

5. **Reveal**
   - Только в `guessing_phase`.
   - Spymaster/spectator нельзя.
   - Обычный guesser — только в ход своей команды.
   - Base («Стол») — в ход любой команды (сервер).
   - Клиент: hold-to-confirm ~2000ms (`holdToConfirmMs`).

6. **Sanitize**
   - Spymaster / `game_over` / `keyRevealed` / debug view `spymaster|table` → видят цвета.
   - Guesser/spectator → цвета скрыты у неоткрытых карт.
   - Debug: событие `setDisplayView` хранится на socket; **роль не меняется**, права команд не меняются; ключ может раскрыться только на отображение.

### Rooms / timers (`server/src/rooms.ts`)

- In-memory `Map`
- `setInterval` 1s → `timerTick`
- На expiry: `clue_phase` → endTurn; `guessing_phase` → endTurn
- Пауза хранит `pausedRemainingMs`

### Socket (`server/src/index.ts`)

Client → Server: `createRoom`, `joinRoom`, `chooseTeam`, `chooseSpymasterTeam`, `startGame`, `submitClue`, `revealCard`, `endGuessing`, admin-команды, `setDisplayView`.

Server → Client: `roomCreated`, `gameState`, `playerJoined`, `playerUpdated`, `actionLogUpdated`, `timerTick`, `errorMessage`, `gameOver`.

Admin (только base guesser): `startGame`, `newGame`, `restartRound`, `updateSettings`, `pauseGame`, `resumeGame`, `revealKeyAfterGame`, `resetPlayers`.

### Client

- Routing без react-router: `/` и `/room/:roomId` через `history` в `App.tsx`.
- `useGameSocket` — соединение, state, emitters.
- Debug header в `RoomPage`: экраны Лобби / Отгадывающий / Загадывающий / Стол (сворачиваемо: «Скрыть сцены»).
- UI стилизован под `ui-reference` / скриншоты «Кодовое Поле» (тёмная тема, золотой accent, бежевые карточки).
- Mobile: всегда grid 5×5, команды compact 2 колонки, формы stacked, кнопка подсказки full-width.

Ключевые UI-файлы:

- `client/src/pages/RoomPage.tsx`, `HomePage.tsx`
- `client/src/components/{LobbyView,GameBoard,CardTile,TeamPanel,TimerBar,SpymasterClueInput,AdminPanel,RoleSelect,...}`
- `client/src/styles.css` — CSS-переменные темы

### Words

`server/src/words.ru.ts` — ≥200 русских существительных, `pickWords(n)`.

### Tests

`server/test/engine.test.ts` (Vitest) — генерация поля, 9/8, спай vs guesser sanitize, reveal rules, assassin, win, второй spymaster, first clue timer merge.

## Сделано в этой ветке работы (кратко)

1. MVP monorepo engine + socket + client.
2. Bugfix: единственный spymaster всегда `both` после смены роли.
3. Подсказка как один текст (`стол 2`), без числового поля.
4. Редизайн под скриншоты + debug view switcher без смены роли.
5. Кнопка «Начать игру» в лобби для «Стола».
6. Фикс overflow кнопки «Отправить» у spymaster.
7. Mobile optimization (layout, board 5×5, sticky/collapsible scenes).
8. Random 9/8 + first team with 9; familiarization merged into first clue phase.
9. Deploy infra (`infra/`) для Ubuntu VPS без Docker.

## Известные нюансы / не делать без нужды

- `ui-reference/` — только визуальный референс; **не делать import** из неё; потом удалят.
- Git root может быть выше (`E:/code`), а проект в `codenames/` — учитывать при commit.
- In-memory rooms: рестарт сервера = потеря всех комнат.
- Debug scenes UI позже закрыть по роли в production.
- Статус `"familiarization"` в типах ещё есть; в runtime после startGame не выставлять.

## Рекомендуемый порядок при продолжении

1. `npm install && npm test && npm run build`
2. Пробежать acceptance: две вкладки, Стол, команда, spymaster видит ключ, hold-to-confirm, таймеры.
3. Если деплой: следовать `infra/README.md`.
4. Следующие возможные задачи: спрятать debug switcher по env/роли; персист комнат; донастройка мобильного UI; e2e; почистить `ui-reference`.

## Полезные команды

```bash
npm run dev
npm run dev:server
npm run dev:client
npm test
npm run build
```
