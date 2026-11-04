/**
 * Rest timer sounds, synthesized with the Web Audio API: no audio files to
 * download, available offline, and nothing to license.
 */

export type ToneNote = {
  /** Seconds after the tone starts. */
  at: number;
  frequency: number;
  /** Seconds until the note has faded out. */
  duration: number;
  wave: OscillatorType;
  /** Peak volume, 0 to 1. */
  gain: number;
};

export const REST_TONES = ["beeps", "chime", "bell", "marimba", "digital", "alarm"] as const;
export type RestTone = (typeof REST_TONES)[number];

export const DEFAULT_REST_TONE: RestTone = "beeps";

export const REST_TONE_LABELS: Record<RestTone, string> = {
  beeps: "Beeps",
  chime: "Chime",
  bell: "Bell",
  marimba: "Marimba",
  digital: "Digital",
  alarm: "Alarm",
};

function sequence(frequencies: number[], step: number, duration: number, wave: OscillatorType, gain: number): ToneNote[] {
  return frequencies.map((frequency, i) => ({ at: i * step, frequency, duration, wave, gain }));
}

/** A struck bell: a fundamental plus quieter overtones that ring together. */
function bellStrike(at: number, frequency: number): ToneNote[] {
  return [
    { at, frequency, duration: 1.3, wave: "sine", gain: 0.5 },
    { at, frequency: frequency * 2.01, duration: 0.8, wave: "sine", gain: 0.2 },
    { at, frequency: frequency * 3.01, duration: 0.45, wave: "sine", gain: 0.1 },
  ];
}

export const REST_TONE_NOTES: Record<RestTone, ToneNote[]> = {
  beeps: sequence([880, 880, 1175], 0.28, 0.22, "sine", 0.6),
  chime: sequence([523, 659, 784, 1047], 0.18, 0.7, "sine", 0.45),
  bell: [...bellStrike(0, 880), ...bellStrike(0.7, 880)],
  marimba: sequence([659, 784, 988, 784, 988], 0.15, 0.25, "triangle", 0.7),
  // Harsher waves carry over gym music, so they play quieter.
  digital: sequence([1400, 1400, 0, 1400, 1400], 0.12, 0.08, "square", 0.18).filter((n) => n.frequency > 0),
  alarm: sequence([700, 950, 700, 950, 700, 950], 0.2, 0.18, "sawtooth", 0.25),
};

export function isRestTone(value: unknown): value is RestTone {
  return typeof value === "string" && (REST_TONES as readonly string[]).includes(value);
}
