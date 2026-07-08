import { useState } from "react";
import type { Settings } from "@codenames/shared";

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onSave: (patch: Partial<Settings>) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);

  const setNumber = (key: keyof Settings, value: number) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Настройки</h2>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <NumberField label="Бонус к первой подсказке, сек" value={draft.familiarizationSeconds} onChange={(value) => setNumber("familiarizationSeconds", value)} />
          <NumberField label="Подсказка, сек" value={draft.clueSeconds} onChange={(value) => setNumber("clueSeconds", value)} />
          <NumberField label="Отгадывание, сек" value={draft.guessingSeconds} onChange={(value) => setNumber("guessingSeconds", value)} />
          <NumberField label="Hold-to-confirm, мс" value={draft.holdToConfirmMs} onChange={(value) => setNumber("holdToConfirmMs", value)} />
          <NumberField label="Красные" value={draft.redCards} onChange={(value) => setNumber("redCards", value)} />
          <NumberField label="Синие" value={draft.blueCards} onChange={(value) => setNumber("blueCards", value)} />
          <NumberField label="Нейтральные" value={draft.neutralCards} onChange={(value) => setNumber("neutralCards", value)} />
          <NumberField label="Убийцы" value={draft.assassinCards} onChange={(value) => setNumber("assassinCards", value)} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-sm text-slate-400">Начинает</span>
            <select
              value={draft.startingTeam}
              onChange={(event) => setDraft((current) => ({ ...current, startingTeam: event.target.value as Settings["startingTeam"] }))}
              className="field mt-1 w-full"
            >
              <option value="random">Случайно</option>
              <option value="red">Красные</option>
              <option value="blue">Синие</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4">
            <input
              type="checkbox"
              checked={draft.showActionLog}
              onChange={(event) => setDraft((current) => ({ ...current, showActionLog: event.target.checked }))}
            />
            Показывать журнал
          </label>
        </div>

        <button
          className="btn-primary mt-6 w-full"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="text-sm text-slate-400">{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="field mt-1 w-full" />
    </label>
  );
}
