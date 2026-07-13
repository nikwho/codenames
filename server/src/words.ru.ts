import { EASY_WORDS_RU } from "./words.ru.easy.js";
import { STANDARD_WORDS_RU } from "./words.ru.standard.js";
import { ADVANCED_WORDS_RU } from "./words.ru.advanced.js";
import { ADULT_WORDS_RU } from "./words.ru.adult.js";
import {
  THEMED_WORDS_RU,
  type RussianWordTheme,
} from "./words.ru.themed.js";
import { WORD_CONFLICT_GROUPS_RU } from "./words.ru.conflicts.js";

export {
  EASY_WORDS_RU,
  STANDARD_WORDS_RU,
  ADVANCED_WORDS_RU,
  ADULT_WORDS_RU,
  THEMED_WORDS_RU,
  WORD_CONFLICT_GROUPS_RU,
};
export type { RussianWordTheme };

export type RussianWordDifficulty = "easy" | "standard" | "advanced";

export interface RussianWordPoolOptions {
  /**
   * Уровни включаются накопительно:
   * easy = только easy;
   * standard = easy + standard;
   * advanced = easy + standard + advanced.
   */
  difficulty?: RussianWordDifficulty;
  /** Включить отдельный взрослый набор. По умолчанию false. */
  includeAdult?: boolean;
  /** Подключить один или несколько тематических наборов. */
  themes?: readonly RussianWordTheme[];
  /** Не размещать близкие слова на одном поле. По умолчанию true. */
  avoidClosePairs?: boolean;
  /** Источник случайных чисел; удобно подменять в тестах. */
  random?: () => number;
}

export const RUSSIAN_WORD_THEMES = Object.keys(
  THEMED_WORDS_RU,
) as RussianWordTheme[];

export function getWordsPool(
  options: RussianWordPoolOptions = {},
): string[] {
  const {
    difficulty = "standard",
    includeAdult = false,
    themes = [],
  } = options;

  const words: string[] = [...EASY_WORDS_RU];

  if (difficulty === "standard" || difficulty === "advanced") {
    words.push(...STANDARD_WORDS_RU);
  }

  if (difficulty === "advanced") {
    words.push(...ADVANCED_WORDS_RU);
  }

  if (includeAdult) {
    words.push(...ADULT_WORDS_RU);
  }

  for (const theme of themes) {
    words.push(...THEMED_WORDS_RU[theme]);
  }

  return [...new Set(words)];
}

/** Обратная совместимость: обычный пул easy + standard. */
export const WORDS_RU = getWordsPool();

/** Полный словарь со всеми необязательными наборами. */
export const ALL_WORDS_RU = getWordsPool({
  difficulty: "advanced",
  includeAdult: true,
  themes: RUSSIAN_WORD_THEMES,
});

const conflictMap = new Map<string, Set<string>>();

for (const group of WORD_CONFLICT_GROUPS_RU) {
  for (const word of group) {
    const conflicts = conflictMap.get(word) ?? new Set<string>();

    for (const otherWord of group) {
      if (otherWord !== word) {
        conflicts.add(otherWord);
      }
    }

    conflictMap.set(word, conflicts);
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = result[index]!;
    const swapValue = result[swapIndex]!;
    result[index] = swapValue;
    result[swapIndex] = currentValue;
  }

  return result;
}

function hasConflict(word: string, selected: Set<string>): boolean {
  const conflicts = conflictMap.get(word);

  if (!conflicts) {
    return false;
  }

  for (const conflict of conflicts) {
    if (selected.has(conflict)) {
      return true;
    }
  }

  return false;
}

export function pickWords(
  count: number,
  options: RussianWordPoolOptions = {},
): string[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Количество слов должно быть неотрицательным целым числом");
  }

  const {
    avoidClosePairs = true,
    random = Math.random,
  } = options;
  const pool = getWordsPool(options);

  if (count > pool.length) {
    throw new Error(
      `Недостаточно слов в словаре: нужно ${count}, доступно ${pool.length}`,
    );
  }

  if (count === 0) {
    return [];
  }

  if (!avoidClosePairs) {
    return shuffle(pool, random).slice(0, count);
  }

  // Несколько проходов защищают от неудачного жадного выбора
  // при большом количестве подключенных тематических наборов.
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const selected: string[] = [];
    const selectedSet = new Set<string>();

    for (const word of shuffle(pool, random)) {
      if (hasConflict(word, selectedSet)) {
        continue;
      }

      selected.push(word);
      selectedSet.add(word);

      if (selected.length === count) {
        return selected;
      }
    }
  }

  throw new Error(
    `Не удалось выбрать ${count} слов без близких пар. ` +
      "Уменьшите count или передайте avoidClosePairs: false.",
  );
}
