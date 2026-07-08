"use client"

import { cn } from "@/lib/utils"
import { useMemo } from "react"

/** Deterministic decorative QR-style pattern derived from a seed string. */
export function QrPlaceholder({
  seed,
  className,
}: {
  seed: string
  className?: string
}) {
  const cells = useMemo(() => {
    const size = 13
    let h = 2166136261
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const grid: boolean[] = []
    let state = h >>> 0
    for (let i = 0; i < size * size; i++) {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0
      grid.push((state & 0xff) > 128)
    }
    return { size, grid }
  }, [seed])

  const isFinder = (r: number, c: number, size: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 3 && c >= bc && c < bc + 3
    return inBox(0, 0) || inBox(0, size - 3) || inBox(size - 3, 0)
  }

  return (
    <div
      aria-hidden
      className={cn(
        "grid aspect-square w-full rounded-xl bg-tile p-2.5",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${cells.size}, minmax(0, 1fr))`,
        gap: 2,
      }}
    >
      {cells.grid.map((on, i) => {
        const r = Math.floor(i / cells.size)
        const c = i % cells.size
        const finder = isFinder(r, c, cells.size)
        return (
          <span
            key={i}
            className={cn(
              "rounded-[2px]",
              finder
                ? "bg-tile-foreground"
                : on
                  ? "bg-tile-foreground"
                  : "bg-transparent",
            )}
          />
        )
      })}
    </div>
  )
}
