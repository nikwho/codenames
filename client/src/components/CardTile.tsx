import { useRef, useState, type PointerEvent } from "react";
import type { SanitizedCard } from "@codenames/shared";

interface CardTileProps {
  card: SanitizedCard;
  disabled: boolean;
  showKey: boolean;
  holdToConfirmMs: number;
  onReveal: () => void;
}

export function CardTile({ card, disabled, showKey, holdToConfirmMs, onReveal }: CardTileProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const sentRef = useRef(false);

  const cancel = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;
    startedAtRef.current = 0;
    sentRef.current = false;
    setIsHolding(false);
    setProgress(0);
  };

  const tick = () => {
    const elapsed = performance.now() - startedAtRef.current;
    const nextProgress = Math.min(1, elapsed / holdToConfirmMs);
    setProgress(nextProgress);

    if (nextProgress >= 1) {
      if (!sentRef.current) {
        sentRef.current = true;
        onReveal();
      }
      cancel();
      return;
    }

    frameRef.current = requestAnimationFrame(tick);
  };

  const begin = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || card.revealed || isHolding) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    startedAtRef.current = performance.now();
    sentRef.current = false;
    setIsHolding(true);
    frameRef.current = requestAnimationFrame(tick);
  };

  const visibleType = card.revealed || showKey ? card.type : undefined;

  return (
    <button
      type="button"
      className={`relative flex aspect-[5/3] items-center justify-center overflow-hidden rounded-xl border-2 px-0.5 text-center font-black uppercase tracking-wide shadow-lg transition select-none touch-none sm:rounded-2xl sm:px-2 ${tileClass(visibleType, card.revealed, showKey)} ${
        disabled ? "cursor-not-allowed opacity-80" : "hover:-translate-y-0.5"
      }`}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      disabled={disabled}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, #fff 0.5px, transparent 0.6px), radial-gradient(circle at 70% 65%, #000 0.5px, transparent 0.6px)",
          backgroundSize: "6px 6px, 8px 8px"
        }}
      />
      <span className="relative z-10 text-balance text-[clamp(0.42rem,2.4vw,1.15rem)] leading-tight">{card.word}</span>
      {visibleType === "assassin" && <span className="absolute right-1 top-1 z-10 text-xs sm:right-2 sm:top-1.5 sm:text-sm">×</span>}
      {isHolding && (
        <>
          <span className="absolute inset-0 origin-bottom bg-amber-400/25" style={{ transform: `scaleY(${progress})` }} />
          <span className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded-full bg-black/25 sm:inset-x-3 sm:bottom-2">
            <span className="block h-full rounded-full bg-amber-300" style={{ width: `${progress * 100}%` }} />
          </span>
        </>
      )}
    </button>
  );
}

function tileClass(type: SanitizedCard["type"], revealed: boolean, showKey: boolean): string {
  if (!type) {
    return "border-black/10 bg-[var(--tile)] text-[var(--tile-text)]";
  }
  if (type === "red") {
    return revealed && !showKey
      ? "border-black/20 bg-[var(--red)] text-white"
      : "border-red-400/80 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_var(--red)]";
  }
  if (type === "blue") {
    return revealed && !showKey
      ? "border-black/20 bg-[var(--blue)] text-white"
      : "border-blue-400/80 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_var(--blue)]";
  }
  if (type === "assassin") {
    return revealed && !showKey
      ? "border-white/10 bg-slate-950 text-white"
      : "border-slate-300/70 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_#111827]";
  }
  return revealed && !showKey
    ? "border-black/10 bg-[#d9cba9] text-[var(--tile-text)]"
    : "border-stone-300/70 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_#d4c29e]";
}
