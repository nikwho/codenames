import { useState } from "react";
import {
  WORD_DIFFICULTY_LABELS,
  WORD_THEME_LABELS,
  WORD_THEMES,
  type Settings,
  type WordDifficulty,
  type WordTheme
} from "@codenames/shared";

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

  const toggleTheme = (theme: WordTheme) => {
    setDraft((current) => {
      const enabled = current.wordThemes.includes(theme);
      return {
        ...current,
        wordThemes: enabled
          ? current.wordThemes.filter((item) => item !== theme)
          : [...current.wordThemes, theme]
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
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

        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-lg font-semibold">Словарь</h3>
          <p className="mt-1 text-sm text-slate-400">Сложность накопительная: обычный = лёгкий + стандарт, сложный добавляет advanced.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm text-slate-400">Сложность</span>
              <select
                value={draft.wordDifficulty}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    wordDifficulty: event.target.value as WordDifficulty
                  }))
                }
                className="field mt-1 w-full"
              >
                {(Object.keys(WORD_DIFFICULTY_LABELS) as WordDifficulty[]).map((level) => (
                  <option key={level} value={level}>
                    {WORD_DIFFICULTY_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-900 p-4">
              <input
                type="checkbox"
                checked={draft.includeAdultWords}
                onChange={(event) => setDraft((current) => ({ ...current, includeAdultWords: event.target.checked }))}
              />
              Взрослый набор
            </label>
          </div>

          <div className="mt-4">
            <span className="text-sm text-slate-400">Тематические наборы</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {WORD_THEMES.map((theme) => (
                <label key={theme} className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3">
                  <input type="checkbox" checked={draft.wordThemes.includes(theme)} onChange={() => toggleTheme(theme)} />
                  {WORD_THEME_LABELS[theme]}
                </label>
              ))}
            </div>
          </div>
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
