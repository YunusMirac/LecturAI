import { describe, expect, it } from "vitest";

import { buildPrompt } from "@/lib/server/quiz-generation";
import { baseSettings, poolSettings } from "@/lib/server/quiz-fixtures";

describe("buildPrompt", () => {
  it("includes legacy single difficulty settings", () => {
    const prompt = buildPrompt(baseSettings);
    expect(prompt).toContain("Genau 5 Fragen");
    expect(prompt).toContain("Schwierigkeit: Mittel");
    expect(prompt).not.toContain('"difficulty"');
  });

  it("includes per-level pool counts for exam settings", () => {
    const prompt = buildPrompt(poolSettings);
    expect(prompt).toContain("2 leichte Fragen");
    expect(prompt).toContain("2 mittlere Fragen");
    expect(prompt).toContain("1 schwere Fragen");
    expect(prompt).toContain('"difficulty": "easy"');
    expect(prompt).toContain("Insgesamt 5 Fragen");
  });

  it("does not contain phrases that prime the AI to cite the source material", () => {
    for (const settings of [baseSettings, poolSettings]) {
      const prompt = buildPrompt(settings);
      expect(prompt).not.toMatch(/vorlesungs[\s-]?pdf/i);
      expect(prompt).not.toMatch(/angehängte[sn]?/i);
      expect(prompt).not.toMatch(/vorlesungsstoff/i);
      expect(prompt).not.toMatch(/außerhalb des pdfs/i);
    }
  });

  it("contains the standalone-question prohibition in both prompt variants", () => {
    for (const settings of [baseSettings, poolSettings]) {
      const prompt = buildPrompt(settings);
      expect(prompt).toContain("eigenständig");
      expect(prompt).toContain("KEINE Verweise auf Dokument");
    }
  });

  it("includes correct choice count for both variants", () => {
    expect(buildPrompt(baseSettings)).toContain("4 Antwortmöglichkeiten");
    expect(buildPrompt(poolSettings)).toContain("4 Antwortmöglichkeiten");
  });

  it("base prompt specifies exactly one correct answer", () => {
    const prompt = buildPrompt(baseSettings);
    expect(prompt).toContain("genau EINE richtige Antwort");
    expect(prompt).toContain("is_correct: true");
  });

  it("pool prompt specifies exactly one correct answer", () => {
    const prompt = buildPrompt(poolSettings);
    expect(prompt).toContain("genau EINE richtige Antwort");
    expect(prompt).toContain("is_correct: true");
  });
});
