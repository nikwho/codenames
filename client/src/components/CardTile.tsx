import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { SanitizedCard } from "@codenames/shared";

interface CardTileProps {
  card: SanitizedCard;
  disabled: boolean;
  mode: "guesser" | "spymaster";
  votes: string[];
  ownVote: boolean;
  endsAt: number | null;
  pulse: number;
  onTap: () => void;
  onReveal: () => void;
}

export function CardTile({ card, disabled, mode, votes, ownVote, endsAt, pulse, onTap, onReveal }: CardTileProps) {
  const [now, setNow] = useState(Date.now());
  const [fontSize, setFontSize] = useState(18);
  const tileRef = useRef<HTMLButtonElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  useEffect(() => {
    if (!pulse || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = tileRef.current?.animate([
      { transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }
    ], { duration: 240 });
    return () => animation?.cancel();
  }, [pulse]);

  const showKey = mode === "spymaster";
  const visibleType = card.revealed || showKey ? card.type : undefined;

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
      className={`relative flex aspect-[5/3] items-center justify-center overflow-hidden rounded-xl border-2 px-0.5 text-center font-black uppercase tracking-wide shadow-lg transition select-none touch-manipulation sm:rounded-2xl sm:px-2 ${tileClass(visibleType, card.revealed, mode)} ${ownVote ? "ring-2 ring-amber-400" : ""} ${
        disabled ? (mode === "spymaster" ? "cursor-default" : "cursor-not-allowed opacity-80") : "hover:-translate-y-0.5"
      }`}
      style={tileStyle(visibleType, mode)}
      onPointerDown={(event) => { gesture.current = { x: event.clientX, y: event.clientY, moved: false }; }}
      onPointerMove={(event) => {
        if (gesture.current && Math.hypot(event.clientX - gesture.current.x, event.clientY - gesture.current.y) > 8) gesture.current.moved = true;
      }}
      onPointerCancel={() => { if (gesture.current) gesture.current.moved = true; }}
      onClick={(event) => {
        if (event.detail !== 0 && gesture.current?.moved) return;
        onTap();
        if (!disabled && !card.revealed) onReveal();
      }}
      aria-pressed={ownVote}
      aria-label={`${card.word}${votes.length ? `, голосов: ${votes.length}` : ""}${ownVote ? ", ваш голос, нажмите для отмены" : ""}`}
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
      <span className="absolute bottom-1 left-1 right-1 z-20 flex flex-wrap justify-center gap-1" aria-label={votes.join(", ")}>
        {votes.map((name, index) => <span key={index} title={name} className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-black/40" />)}
      </span>
      {endsAt && <span className="absolute right-1 top-1 z-20 rounded bg-black/80 px-1 text-xs text-white">{Math.max(0, Math.ceil((endsAt - now) / 1000))}</span>}
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
