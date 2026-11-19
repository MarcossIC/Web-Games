/** The pure half of the Nova Breaker synthesizer: notes, rate limiting and the mute flag. */

/** Semitones of the major pentatonic scale: C D E G A. */
const PENTATONIC = [0, 2, 4, 7, 9];

/** C5 */
export const COMBO_BASE_HZ = 523.2511;

/**
 * Frequency of a combo step on the major pentatonic scale, starting at `baseHz`.
 * Steps climb for `octaves` octaves; past that they cycle through the top octave,
 * so a long combo keeps moving without ever getting shrill.
 */
export function pentatonicFrequency(step: number, baseHz = COMBO_BASE_HZ, octaves = 2): number {
  const notes = PENTATONIC.length;
  const top = Math.max(1, Math.floor(octaves));
  let index = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  if (index >= notes * top) {
    index = notes * (top - 1) + (index % notes);
  }
  const octave = Math.floor(index / notes);
  const semitones = 12 * octave + PENTATONIC[index % notes];
  return baseHz * Math.pow(2, semitones / 12);
}

/** The combo count of a `brick-destroyed` event (1 = first brick of the combo) as a scale step. */
export function comboNoteIndex(combo: number): number {
  return Number.isFinite(combo) ? Math.max(0, Math.floor(combo) - 1) : 0;
}

/** Width of the world, in px: the x of every event lies in 0..WORLD_WIDTH. */
const WORLD_WIDTH = 960;

/**
 * Stereo pan (-1 left .. 1 right) for an event at `x`. It never goes all the way
 * (`spread` < 1), so a hit on a wall still reaches both ears. Missing x: center.
 */
export function panForX(x: number | undefined, width = WORLD_WIDTH, spread = 0.6): number {
  if (typeof x !== 'number' || !Number.isFinite(x) || width <= 0) {
    return 0;
  }
  const t = Math.max(0, Math.min(1, x / width));
  return (t * 2 - 1) * spread;
}

/** A random value in -amount..amount from a 0..1 source. */
export function spread(random: () => number, amount: number): number {
  return (random() * 2 - 1) * amount;
}

/**
 * The knock of a brick that holds: a minor third higher for every hit it is
 * closer to breaking, so the player hears how close it is.
 */
export function hardHitFrequency(hpLeft: number): number {
  const hp = Number.isFinite(hpLeft) ? Math.max(1, Math.min(4, Math.floor(hpLeft))) : 2;
  return 300 * Math.pow(2, (-(hp - 1) * 3) / 12);
}

/** The paddle thump: lowest in the middle, up to a fourth higher at either edge. */
export function paddleFrequency(offset: number): number {
  const o = Number.isFinite(offset) ? Math.min(1, Math.abs(offset)) : 0;
  return 180 * Math.pow(2, (o * 5) / 12);
}

/** Fills `data` with brown noise (white noise, integrated): a deep rumble, normalized to 0.95. */
export function fillBrownNoise(data: Float32Array, random: () => number): void {
  let last = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
    data[i] = last;
    peak = Math.max(peak, Math.abs(last));
  }
  if (peak > 0) {
    const scale = 0.95 / peak;
    for (let i = 0; i < data.length; i++) {
      data[i] *= scale;
    }
  }
}

/**
 * Fills one channel of a reverb impulse: noise under a curve that falls to
 * silence by the end. A higher `power` makes a smaller, drier room.
 */
export function fillImpulseResponse(data: Float32Array, random: () => number, power = 3): void {
  const n = data.length;
  for (let i = 0; i < n; i++) {
    data[i] = (random() * 2 - 1) * Math.pow(1 - i / n, power);
  }
}

export interface SoundGateOptions {
  /** Voices (sources) allowed at once; a sound that would go over it is dropped. */
  maxVoices: number;
  /** Minimum time between two plays of the same sound. */
  defaultIntervalMs: number;
  /** Per-sound overrides of the interval. */
  intervalsMs?: Readonly<Record<string, number>>;
}

/**
 * Decides whether a sound may play now: one play per sound per interval, and a cap
 * on voices so a 12-ball multiball does not clip or eat the CPU.
 * Voices free themselves at their scheduled end, so the gate needs no callback from
 * the audio graph (whose 'ended' events never come while the context is suspended).
 */
export class SoundGate {
  private readonly lastPlay = new Map<string, number>();
  /** End time and voice count of every play still sounding. */
  private playing: { end: number; voices: number }[] = [];

  constructor(private readonly options: SoundGateOptions) {}

  activeVoices(nowMs: number): number {
    this.playing = this.playing.filter((play) => play.end > nowMs);
    return this.playing.reduce((sum, play) => sum + play.voices, 0);
  }

  /**
   * True (and the play is recorded) when `key` may sound at `nowMs` with `voices` sources
   * lasting `durationMs`. A priority sound skips the voice cap, never its own interval.
   */
  tryPlay(key: string, nowMs: number, voices: number, durationMs: number, priority = false): boolean {
    const interval = this.options.intervalsMs?.[key] ?? this.options.defaultIntervalMs;
    const last = this.lastPlay.get(key);
    if (last !== undefined && nowMs - last < interval) {
      return false;
    }
    if (!priority && this.activeVoices(nowMs) + voices > this.options.maxVoices) {
      return false;
    }
    this.lastPlay.set(key, nowMs);
    this.playing.push({ end: nowMs + durationMs, voices });
    return true;
  }

  reset(): void {
    this.playing = [];
    this.lastPlay.clear();
  }
}

export const MUTED_STORAGE_KEY = 'breaker-muted';

export function serializeMuted(muted: boolean): string {
  return muted ? '1' : '0';
}

/** Only "1" and "true" mean muted; missing or garbage means sound on. */
export function parseMuted(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') {
    return false;
  }
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true';
}
