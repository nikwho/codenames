"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useGame } from "@/lib/game/store"
import type { Role, Team } from "@/lib/game/types"
import { DeviceList } from "../device-list"
import { QrPlaceholder } from "../qr-placeholder"
import {
  Check,
  Copy,
  Crown,
  Eye,
  LogIn,
  MonitorSpeaker,
  Smartphone,
  User,
} from "lucide-react"
import { useState } from "react"

const roles: { value: Role; label: string; icon: typeof User; hint: string }[] = [
  { value: "guesser", label: "Отгадываю", icon: User, hint: "Открываю карточки" },
  { value: "spymaster", label: "Загадываю", icon: Crown, hint: "Даю подсказки" },
  { value: "spectator", label: "Наблюдатель", icon: Eye, hint: "Просто смотрю" },
]

export function LobbyView() {
  const { state, setView, setPerspective } = useGame()
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("guesser")
  const [team, setTeam] = useState<Team | null>(null)
  const [copied, setCopied] = useState(false)

  const hasTable = state.players.some((p) => p.isTable && p.online)
  const spymasterCount = state.players.filter(
    (p) => p.role === "spymaster" && p.online,
  ).length

  const willBeTable = role === "guesser" && !hasTable
  const needsTeam =
    (role === "guesser" && hasTable) ||
    (role === "spymaster" && spymasterCount >= 1)
  const singleSpymaster = role === "spymaster" && spymasterCount === 0

  const canJoin = name.trim().length > 0 && (!needsTeam || team !== null)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://kodovoe.pole/join/${state.roomCode}`,
      )
    } catch {
      /* ignore in prototype */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const join = () => {
    if (!canJoin) return
    if (team) setPerspective(team)
    if (role === "spymaster") setView("spymaster")
    else if (willBeTable) setView("table")
    else setView("guesser")
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.1fr_1fr]">
      {/* Room + connection card */}
      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-6">
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Комната
          </span>
          <h1 className="text-balance text-2xl font-bold">{state.roomName}</h1>
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-5 text-center">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Код комнаты
          </span>
          <div className="mt-1 font-mono text-5xl font-bold tracking-[0.3em] text-primary sm:text-6xl">
            {state.roomCode}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-28 shrink-0 sm:w-32">
            <QrPlaceholder seed={state.roomCode} />
            <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
              <Smartphone className="size-3" />
              Сканируйте телефоном
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Поделитесь ссылкой или кодом, чтобы игроки присоединились со своих
              телефонов.
            </p>
            <Button variant="secondary" onClick={copyLink} className="gap-2">
              {copied ? (
                <Check className="size-4 text-emerald-400" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
            </Button>
          </div>
        </div>

        <DeviceList />
      </section>

      {/* Join form */}
      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="player-name"
            className="text-xs uppercase tracking-widest text-muted-foreground"
          >
            Ваше имя
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            className="h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Выберите роль
          </span>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => {
              const Icon = r.icon
              const active = role === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setRole(r.value)
                    setTeam(null)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <Icon
                    className={cn("size-6", active && "text-primary")}
                  />
                  <span className="text-sm font-semibold text-foreground">
                    {r.label}
                  </span>
                  <span className="text-[11px] leading-tight">{r.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Role-conditional block */}
        <div className="min-h-24 rounded-2xl border border-dashed border-border bg-background/30 p-4">
          {willBeTable && (
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <MonitorSpeaker className="size-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    База
                  </span>
                  <span className="font-semibold">Главное устройство · «Стол»</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Первое устройство отгадывающих. Открывает карточки за обе
                  команды и управляет игрой.
                </p>
              </div>
            </div>
          )}

          {singleSpymaster && (
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Crown className="size-6" />
              </span>
              <div>
                <span className="font-semibold">Единственный ведущий</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Пока вы один загадывающий — можете давать подсказки за обе
                  команды по очереди.
                </p>
              </div>
            </div>
          )}

          {needsTeam && (
            <div>
              <span className="text-sm font-medium">
                {role === "spymaster"
                  ? "Уже есть ведущий — выберите свою команду"
                  : "«Стол» уже подключён — выберите команду"}
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["red", "blue"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeam(t)}
                    className={cn(
                      "rounded-xl border-2 px-4 py-3 font-semibold transition-colors",
                      t === "red"
                        ? "border-team-red/50"
                        : "border-team-blue/50",
                      team === t
                        ? t === "red"
                          ? "bg-team-red text-team-red-foreground"
                          : "bg-team-blue text-team-blue-foreground"
                        : "bg-background/40 text-foreground hover:bg-background/70",
                    )}
                  >
                    {t === "red" ? state.settings.redName : state.settings.blueName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button size="lg" disabled={!canJoin} onClick={join} className="mt-auto h-12 gap-2 text-base">
          <LogIn className="size-4" />
          Присоединиться к игре
        </Button>
      </section>
    </div>
  )
}
