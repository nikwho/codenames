import { describe, expect, it } from "vitest";
import {
  ALL_WORDS_RU,
  EASY_WORDS_RU,
  STANDARD_WORDS_RU,
  WORDS_RU,
  getWordsPool,
  pickWords
} from "../src/words.ru.js";

describe("russian word packs", () => {
  it("keeps the default pool as easy + standard", () => {
    const expected = getWordsPool({ difficulty: "standard" });
    expect(WORDS_RU).toEqual(expected);
    expect(WORDS_RU.length).toBeGreaterThanOrEqual(EASY_WORDS_RU.length);
    expect(WORDS_RU.length).toBeGreaterThan(EASY_WORDS_RU.length);
    expect(new Set(WORDS_RU).size).toBe(WORDS_RU.length);
    expect(WORDS_RU).toEqual(expect.arrayContaining([...EASY_WORDS_RU]));
    expect(WORDS_RU).toEqual(expect.arrayContaining([...STANDARD_WORDS_RU]));
  });

  it("picks unique board words without close pairs by default", () => {
    const words = pickWords(25, { random: () => 0.42 });
    expect(words).toHaveLength(25);
    expect(new Set(words).size).toBe(25);
  });

  it("can include advanced, adult and themed packs", () => {
    const pool = getWordsPool({
      difficulty: "advanced",
      includeAdult: true,
      themes: ["military", "religion"]
    });
    expect(pool.length).toBeGreaterThan(WORDS_RU.length);
    expect(pool).toEqual(
      expect.arrayContaining(getWordsPool({ difficulty: "advanced" }))
    );
  });

  it("exposes the full dictionary separately", () => {
    expect(ALL_WORDS_RU.length).toBeGreaterThan(WORDS_RU.length);
    expect(new Set(ALL_WORDS_RU).size).toBe(ALL_WORDS_RU.length);
  });

  it("does not include the removed slur", () => {
    expect(ALL_WORDS_RU).not.toContain("негр");
  });
});
