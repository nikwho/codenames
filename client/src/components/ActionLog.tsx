import type { ActionLogEntry } from "@codenames/shared";

interface ActionLogProps {
  items: ActionLogEntry[];
}

export function ActionLog({ items }: ActionLogProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/15 p-3 sm:rounded-3xl sm:p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-300">Лог действий</h2>
      <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1 sm:mt-4 sm:max-h-80">
        {items.length === 0 && <p className="text-sm text-slate-400">Пока нет действий.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-sm">{item.message}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(item.at).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
