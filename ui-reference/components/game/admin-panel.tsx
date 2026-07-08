"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Users,
} from "lucide-react"
import { useState } from "react"

export function AdminPanel({
  onOpenSettings,
}: {
  onOpenSettings: () => void
}) {
  const { state, dispatch } = useGame()
  const [confirmKey, setConfirmKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://kodovoe.pole/join/${state.roomCode}`,
      )
    } catch {
      /* ignore */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/20 text-primary">
            <Settings className="size-3.5" />
          </span>
          Командный центр · «Стол»
        </h2>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
          Главный экран
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="default" onClick={() => dispatch({ type: "NEW_GAME" })} className="gap-1.5">
          <Plus className="size-4" />
          Новая игра
        </Button>
        <Button variant="outline" onClick={() => dispatch({ type: "RESTART_ROUND" })} className="gap-1.5">
          <RotateCcw className="size-4" />
          Перезапуск
        </Button>
        <Button variant="outline" onClick={onOpenSettings} className="gap-1.5">
          <Settings className="size-4" />
          Настройки
        </Button>
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}
          className="gap-1.5"
        >
          {state.paused ? (
            <>
              <Play className="size-4" />
              Продолжить
            </>
          ) : (
            <>
              <Pause className="size-4" />
              Пауза
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="secondary" onClick={copyLink} className="gap-1.5">
          <Copy className="size-4" />
          {copied ? "Скопировано" : "Скопировать ссылку"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: "RESET_PLAYERS" })}
          className="gap-1.5"
        >
          <Users className="size-4" />
          Сбросить подключения
        </Button>

        {/* Dangerous: show key */}
        {state.keyRevealed ? (
          <Button
            variant="destructive"
            onClick={() => dispatch({ type: "SET_KEY_REVEALED", value: false })}
            className="gap-1.5"
          >
            <EyeOff className="size-4" />
            Скрыть ключ
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={() => setConfirmKey(true)}
            className="gap-1.5"
          >
            <Eye className="size-4" />
            Показать ключ
          </Button>
        )}
      </div>

      {confirmKey && !state.keyRevealed && (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-4" />
            Показать ключ всем на «Столе»?
          </span>
          <p className="text-xs text-muted-foreground">
            Опасное действие: цвета всех карточек станут видны на этом экране. Не
            делайте это при отгадывающих игроках.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                dispatch({ type: "SET_KEY_REVEALED", value: true })
                setConfirmKey(false)
              }}
            >
              Да, показать
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmKey(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
