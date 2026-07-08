"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { GameSettings } from "@/lib/game/types"
import { X } from "lucide-react"
import { ToggleSwitch } from "./toggle-switch"

function MinutesField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (seconds: number) => void
}) {
  const minutes = Math.round((value / 60) * 10) / 10
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={minutes}
          onChange={(e) => onChange(Math.round(Number(e.target.value) * 60))}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <span className="text-xs text-muted-foreground">мин</span>
      </div>
    </label>
  )
}

export function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { state, dispatch } = useGame()
  const s = state.settings
  const set = (patch: Partial<GameSettings>) =>
    dispatch({ type: "UPDATE_SETTINGS", patch })

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Настройки игры"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">Настройки игры</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Таймеры
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <MinutesField
                label="Ознакомление"
                value={s.introSeconds}
                onChange={(v) => set({ introSeconds: v })}
              />
              <MinutesField
                label="Загадывание"
                value={s.clueSeconds}
                onChange={(v) => set({ clueSeconds: v })}
              />
              <MinutesField
                label="Отгадывание"
                value={s.guessSeconds}
                onChange={(v) => set({ guessSeconds: v })}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Команды
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Красная команда</span>
                <input
                  value={s.redName}
                  onChange={(e) => set({ redName: e.target.value })}
                  className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Синяя команда</span>
                <input
                  value={s.blueName}
                  onChange={(e) => set({ blueName: e.target.value })}
                  className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Правила раунда
            </h3>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Кто ходит первым</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { v: "random", l: "Случайно" },
                    { v: "red", l: s.redName },
                    { v: "blue", l: s.blueName },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set({ firstTurn: o.v })}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                      s.firstTurn === o.v
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Набор слов</span>
              <select
                value={s.wordTheme}
                onChange={(e) => set({ wordTheme: e.target.value })}
                className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {["Классика", "Космос", "Природа", "Кино", "Хардкор"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5">
              <span className="text-sm font-medium">Количество карточек</span>
              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-sm text-secondary-foreground">
                5 × 5
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Прочее
            </h3>
            <ToggleSwitch
              label="Звуки таймера"
              checked={s.timerSounds}
              onChange={(v) => set({ timerSounds: v })}
            />
            <ToggleSwitch
              label="Показывать лог действий"
              checked={s.showLog}
              onChange={(v) => set({ showLog: v })}
            />
            <ToggleSwitch
              label="Разрешить наблюдателей"
              checked={s.allowSpectators}
              onChange={(v) => set({ allowSpectators: v })}
            />
            <ToggleSwitch
              label="Автопереход после нейтральной"
              description="Ход переходит сопернику при открытии нейтральной карточки"
              checked={s.autoPassOnNeutral}
              onChange={(v) => set({ autoPassOnNeutral: v })}
            />
            <ToggleSwitch
              label="Конец игры при убийце"
              description="Открытие чёрной карточки завершает партию"
              checked={s.endOnAssassin}
              onChange={(v) => set({ endOnAssassin: v })}
            />
          </section>
        </div>

        <footer className="border-t border-border p-4">
          <Button className="w-full" size="lg" onClick={onClose}>
            Готово
          </Button>
        </footer>
      </aside>
    </div>
  )
}
