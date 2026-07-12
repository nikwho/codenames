import { useState } from "react";
import type { ActionLogEntry } from "@codenames/shared";

interface ActionLogProps {
  items: ActionLogEntry[];
}

export function ActionLog({ items }: ActionLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/15 sm:rounded-3xl">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4 sm:py-3"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-black uppercase tracking-wide text-slate-300">Лог действий</span>
        <span className="text-xs font-semibold text-slate-500">{open ? "Свернуть" : `${items.length}`}</span>
      </button>
      {open && (
        <div className="max-h-56 space-y-2 overflow-auto border-t border-white/10 px-3 py-3 pr-1 sm:max-h-80 sm:px-4 sm:py-4">
          {items.length === 0 && <p className="text-sm text-slate-400">Пока нет действий.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-sm">{item.message}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(item.at).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
