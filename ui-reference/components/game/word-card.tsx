"use client"

import { cn } from "@/lib/utils"
import type { CardColor, WordCard as WordCardType } from "@/lib/game/types"
import { Check, Skull } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const HOLD_MS = 2000

interface WordCardProps {
  card: WordCardType
  /** guesser: colors hidden until revealed; spymaster: key always visible */
  mode: "guesser" | "spymaster"
  /** whether hold-to-reveal is enabled for this card */
  interactive: boolean
  onReveal: (id: number) => void
}

function revealedClasses(color: CardColor): string {
  switch (color) {
    case "red":
      return "bg-team-red text-team-red-foreground border-black/20"
    case "blue":
      return "bg-team-blue text-team-blue-foreground border-black/20"
    case "neutral":
      return "bg-tile-neutral text-tile-neutral-foreground border-black/10"
    case "assassin":
      return "bg-tile-assassin text-tile-assassin-foreground border-white/10"
  }
}

function spymasterHint(color: CardColor): string {
  switch (color) {
    case "red":
      return "ring-team-red/70 shadow-[inset_0_-6px_0_0_var(--team-red)]"
    case "blue":
      return "ring-team-blue/70 shadow-[inset_0_-6px_0_0_var(--team-blue)]"
    case "neutral":
      return "ring-tile-neutral/60 shadow-[inset_0_-6px_0_0_var(--tile-neutral)]"
    case "assassin":
      return "ring-foreground/70 shadow-[inset_0_-6px_0_0_var(--tile-assassin)]"
  }
}

export function WordCard({ card, mode, interactive, onReveal }: WordCardProps) {
  const [progress, setProgress] = useState(0)
  const holding = useRef(false)
  const startRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    holding.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setProgress(0)
  }, [])

  useEffect(() => () => stop(), [stop])

  const canHold = interactive && mode === "guesser" && !card.revealed

  const start = () => {
    if (!canHold) return
    holding.current = true
    startRef.current = performance.now()
    const tick = (t: number) => {
      if (!holding.current) return
      const p = Math.min(1, (t - startRef.current) / HOLD_MS)
      setProgress(p)
      if (p >= 1) {
        holding.current = false
        setProgress(0)
        onReveal(card.id)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const isRevealed = card.revealed
  const showKey = mode === "spymaster"

  return (
    <button
      type="button"
      disabled={!canHold}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={
        isRevealed
          ? `${card.word}, открыта`
          : canHold
            ? `${card.word}, удерживайте для выбора`
            : card.word
      }
      className={cn(
        "group relative flex aspect-[5/3] select-none items-center justify-center overflow-hidden rounded-xl border-2 px-1 text-center shadow-md transition-transform duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Base look
        isRevealed
          ? revealedClasses(card.color)
          : showKey
            ? cn(
                "bg-tile text-tile-foreground ring-2 ring-inset",
                spymasterHint(card.color),
              )
            : "bg-tile text-tile-foreground border-black/10",
        canHold && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
        // dim spymaster-revealed cards to distinguish from open board
        isRevealed && showKey && "opacity-55",
      )}
    >
      {/* subtle tile texture */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #fff 0.5px, transparent 0.6px), radial-gradient(circle at 70% 65%, #000 0.5px, transparent 0.6px)",
          backgroundSize: "6px 6px, 8px 8px",
        }}
      />

      {/* Hold progress overlay */}
      {progress > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-bottom bg-primary/25"
          style={{ transform: `scaleY(${progress})` }}
        />
      )}
      {progress > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-black/20"
        >
          <span
            className="block h-full rounded-full bg-primary transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      )}

      <span
        className={cn(
          "relative z-10 text-balance font-bold uppercase leading-tight tracking-wide",
          "text-[clamp(0.55rem,2.2vw,1.15rem)]",
        )}
      >
        {card.word}
      </span>

      {isRevealed && card.color === "assassin" && (
        <Skull className="absolute right-1.5 top-1.5 z-10 size-4 opacity-80" />
      )}
      {isRevealed && card.color !== "assassin" && !showKey && (
        <Check className="absolute right-1.5 top-1.5 z-10 size-4 opacity-70" />
      )}
    </button>
  )
}
