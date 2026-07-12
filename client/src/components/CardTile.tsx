import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { SanitizedCard } from "@codenames/shared";

interface CardTileProps {
  card: SanitizedCard;
  disabled: boolean;
  mode: "guesser" | "spymaster";
  holdToConfirmMs: number;
  onReveal: () => void;
}

export function CardTile({ card, disabled, mode, holdToConfirmMs, onReveal }: CardTileProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const frameRef = useRef<number | null>(null);
  const tileRef = useRef<HTMLButtonElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
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

  const showKey = mode === "spymaster";
  const visibleType = card.revealed || showKey ? card.type : undefined;
  const nativeDisabled = mode !== "spymaster" && disabled;

  useLayoutEffect(() => {
    const tile = tileRef.current;
    const text = textRef.current;
    if (!tile || !text) {
      return;
    }

    const fitText = () => {
      const width = tile.clientWidth;
      const base = Math.max(8, Math.min(18, width * 0.12));
      let next = base;
      text.style.fontSize = `${next}px`;
      while (next > 8 && (text.scrollWidth > text.clientWidth || text.scrollHeight > text.clientHeight)) {
        next -= 1;
        text.style.fontSize = `${next}px`;
      }
      setFontSize(next);
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(tile);
    return () => observer.disconnect();
  }, [card.word]);

  return (
    <button
      ref={tileRef}
      type="button"
      className={`relative flex aspect-[5/3] items-center justify-center overflow-hidden rounded-xl border-2 px-0.5 text-center font-black uppercase tracking-wide shadow-lg transition select-none touch-none sm:rounded-2xl sm:px-2 ${tileClass(visibleType, card.revealed, mode)} ${
        disabled ? (mode === "spymaster" ? "cursor-default" : "cursor-not-allowed opacity-80") : "hover:-translate-y-0.5"
      }`}
      style={tileStyle(visibleType, mode)}
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      disabled={nativeDisabled}
      aria-disabled={disabled}
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
      <span
        ref={textRef}
        className="relative z-10 flex max-h-[78%] w-full max-w-full items-center justify-center overflow-hidden text-balance break-words px-0.5 leading-tight"
        style={{ fontSize }}
      >
        {card.word}
      </span>
      {visibleType === "assassin" && <span className="absolute right-1 top-1 z-10 text-xs sm:right-2 sm:top-1.5 sm:text-sm">×</span>}
      {mode === "spymaster" && card.revealed && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
          <span className="absolute left-1/2 top-1/2 h-[145%] w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-[-58deg] rounded-full bg-white/45" />
          <span className="absolute left-1/2 top-1/2 h-[145%] w-0.5 -translate-x-1/2 -translate-y-1/2 rotate-[58deg] rounded-full bg-white/45" />
        </span>
      )}
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

function tileStyle(type: SanitizedCard["type"], mode: "guesser" | "spymaster"): CSSProperties | undefined {
  if (mode !== "spymaster" || !type) {
    return undefined;
  }
  if (type === "red") {
    return { backgroundColor: "var(--red)" };
  }
  if (type === "blue") {
    return { backgroundColor: "var(--blue)" };
  }
  if (type === "assassin") {
    return { backgroundColor: "#020617" };
  }
  return { backgroundColor: "#d9cba9" };
}

function tileClass(type: SanitizedCard["type"], revealed: boolean, mode: "guesser" | "spymaster"): string {
  if (!type) {
    return "border-black/10 bg-[var(--tile)] text-[var(--tile-text)]";
  }
  if (mode === "spymaster") {
    const revealedClass = revealed ? " brightness-75 saturate-75" : "";
    if (type === "red") {
      return `border-red-300/70 bg-[var(--red)] text-white${revealedClass}`;
    }
    if (type === "blue") {
      return `border-blue-300/70 bg-[var(--blue)] text-white${revealedClass}`;
    }
    if (type === "assassin") {
      return `border-white/15 bg-slate-950 text-white${revealedClass}`;
    }
    return `border-stone-300/70 bg-[#d9cba9] text-[var(--tile-text)]${revealedClass}`;
  }
  if (type === "red") {
    return revealed
      ? "border-black/20 bg-[var(--red)] text-white"
      : "border-red-400/80 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_var(--red)]";
  }
  if (type === "blue") {
    return revealed
      ? "border-black/20 bg-[var(--blue)] text-white"
      : "border-blue-400/80 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_var(--blue)]";
  }
  if (type === "assassin") {
    return revealed
      ? "border-white/10 bg-slate-950 text-white"
      : "border-slate-300/70 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_#111827]";
  }
  return revealed
    ? "border-black/10 bg-[#d9cba9] text-[var(--tile-text)]"
    : "border-stone-300/70 bg-[var(--tile)] text-[var(--tile-text)] shadow-[inset_0_-6px_0_0_#d4c29e]";
}
