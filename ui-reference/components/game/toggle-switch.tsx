"use client"

import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: ToggleSwitchProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  )
}
