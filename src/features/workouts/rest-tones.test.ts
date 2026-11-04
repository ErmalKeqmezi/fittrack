import { describe, expect, it } from "vitest";

import { DEFAULT_REST_TONE, isRestTone, REST_TONE_LABELS, REST_TONE_NOTES, REST_TONES } from "./rest-tones";

describe("rest tones", () => {
  it.each(REST_TONES.map((tone) => [tone]))("%s is playable and short", (tone) => {
    const notes = REST_TONE_NOTES[tone];
    expect(REST_TONE_LABELS[tone]).toBeTruthy();
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.frequency).toBeGreaterThan(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.at).toBeGreaterThanOrEqual(0);
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...notes.map((n) => n.at + n.duration))).toBeLessThanOrEqual(3);
  });

  it("recognises saved tones and rejects anything else", () => {
    expect(isRestTone(DEFAULT_REST_TONE)).toBe(true);
    expect(isRestTone("bell")).toBe(true);
    expect(isRestTone("airhorn")).toBe(false);
    expect(isRestTone(null)).toBe(false);
  });
});
