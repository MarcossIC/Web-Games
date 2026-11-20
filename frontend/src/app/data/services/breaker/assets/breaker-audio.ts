import type { BrickKind, PowerUpKind } from '../engine/types';
import {
  comboNoteIndex,
  fillBrownNoise,
  fillImpulseResponse,
  hardHitFrequency,
  paddleFrequency,
  panForX,
  pentatonicFrequency,
  SoundGate,
  spread,
} from './audio-math';
import { isNegativePowerUp } from './breaker-themes';

/**
 * Nova Breaker's synthesizer: every sound is built from oscillators and two shared
 * noise buffers, so there are no files to load. Sounds are described as data (parts),
 * which lets the gate know each sound's voice count and length before it plays.
 *
 * The graph:
 *
 *   voice -> [panner] -+-> bus (ducked) -> slow-motion lowpass -+
 *                      +-> lead bus (the big moments) ----------+-> compressor -> master
 *                      +-> send -> damping -> reverb -> return -+
 */

interface Filter {
  type: BiquadFilterType;
  freq: number;
  /** Sweep the cutoff to this by the end of the part. */
  to?: number;
  q?: number;
}

interface TonePart {
  kind: 'tone';
  wave: OscillatorType;
  freq: number;
  /** Glide to this frequency by the end. */
  to?: number;
  /** Start, seconds after the sound starts. */
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  detune?: number;
  filter?: Filter;
}

interface NoisePart {
  kind: 'noise';
  at?: number;
  dur: number;
  gain: number;
  attack?: number;
  filter: Filter;
  /** White hisses; brown rumbles (explosions, booms). Default: white. */
  color?: 'white' | 'brown';
}

type Part = TonePart | NoisePart;

interface PlayOptions {
  /** Skips the voice cap (never the sound's own interval). */
  priority?: boolean;
  /** Where in the world it happened: panned left or right. Missing: center. */
  x?: number;
  /** Cents of random pitch per play, with a little random volume: 0 keeps the exact note. */
  vary?: number;
  /** How much of it reaches the reverb, 0..1. */
  space?: number;
  /** Seconds to hold the rest of the mix down under this sound, which plays on the lead bus. */
  duck?: number;
}

/** What one play shares between its parts. */
interface Voice {
  start: number;
  out: AudioNode;
  detune: number;
  gainScale: number;
  /** Called by each part when it ends: the last one frees the voice's nodes. */
  ended: () => void;
}

export interface BreakerAudioOptions {
  /**
   * Starts muted. The audio never saves the flag: the page's controller owns
   * it and sends it to the scene (SET_MUTED) when the scene is READY.
   */
  muted?: boolean;
  /** Builds the context on unlock; null (or a throw) means no audio. Default: window.AudioContext. */
  createContext?: () => AudioContext | null;
  /** 0..1 source for the per-hit variation and the noise buffers. Default: Math.random. */
  random?: () => number;
}

const MASTER_GAIN = 0.8;
/** Scheduling lead, so a part never starts in the past (a click). */
const LEAD = 0.005;
/** Shortest attack: anything faster clicks. */
const MIN_ATTACK = 0.002;
/** A touch of room on everything, so the dry hits sit in the same space as the big moments. */
const DEFAULT_SPACE = 0.08;
/** Random volume of a varied sound: up to this share louder or softer. */
const GAIN_VARIATION = 0.12;
const REVERB_SECONDS = 1.4;
const REVERB_RETURN = 0.32;
/** The reverb only hears the body of a sound, never its hiss. */
const REVERB_DAMPING_HZ = 4500;

const tone = (wave: OscillatorType, freq: number, dur: number, gain: number, extra: Partial<TonePart> = {}): TonePart => ({
  kind: 'tone',
  wave,
  freq,
  dur,
  gain,
  ...extra,
});

const noise = (filter: Filter, dur: number, gain: number, extra: Partial<NoisePart> = {}): NoisePart => ({
  kind: 'noise',
  filter,
  dur,
  gain,
  ...extra,
});

/** Notes. */
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;

/** Rising arpeggio, two partials per note. */
function arpeggio(notes: readonly number[], step: number, dur: number, gain: number): Part[] {
  return notes.flatMap((freq, i) => [
    tone('triangle', freq, dur, gain, { at: i * step }),
    tone('sine', freq * 2, dur * 0.6, gain * 0.3, { at: i * step }),
  ]);
}

function defaultContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export class BreakerAudio {
  /** Sources allowed at once. */
  static readonly MAX_VOICES = 24;
  /** The widest random pitch any sound uses. */
  static readonly MAX_VARY_CENTS = 60;
  /** Resting level of the bus the everyday sounds play on. */
  static readonly BUS_GAIN = 0.9;
  /** Where that bus drops while a big moment plays. */
  static readonly DUCK_LEVEL = 0.32;
  /** Cutoff of the bus in slow motion: the world sounds under water, the big moment does not. */
  static readonly SLOW_CUTOFF_HZ = 900;
  static readonly OPEN_CUTOFF_HZ = 18000;

  private ctx: AudioContext | null = null;
  /** True once unlock tried to make a context, whether or not it got one. */
  private unlocked = false;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private lead: GainNode | null = null;
  private reverbIn: AudioNode | null = null;
  private slowFilter: BiquadFilterNode | null = null;
  private whiteNoise: AudioBuffer | null = null;
  private brownNoise: AudioBuffer | null = null;
  private slow = false;
  private _muted: boolean;
  private readonly createContext: () => AudioContext | null;
  private readonly random: () => number;
  private readonly gate = new SoundGate({
    maxVoices: BreakerAudio.MAX_VOICES,
    defaultIntervalMs: 30,
    intervalsMs: {
      brick: 22,
      steel: 40,
      paddle: 40,
      explosion: 70,
      laser: 50,
      capsuleSpawn: 60,
      powerUp: 80,
      comboLost: 200,
      lastBrick: 500,
      sectorClear: 500,
      gameOver: 500,
      bossHit: 60,
      bossShot: 150,
      bossDown: 1500,
    },
  });

  constructor(options: BreakerAudioOptions = {}) {
    this.createContext = options.createContext ?? defaultContext;
    this.random = options.random ?? Math.random;
    this._muted = options.muted ?? false;
  }

  get muted(): boolean {
    return this._muted;
  }

  /** A context exists and is not closed. */
  get ready(): boolean {
    return this.ctx !== null && this.ctx.state !== 'closed';
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, this.ctx.currentTime, 0.02);
    }
  }

  /**
   * The engine's slow motion (the last brick's outro): the everyday sounds go dark,
   * the lead bus stays bright. Safe to call every frame: only a change does anything.
   */
  setSlowMotion(on: boolean): void {
    if (on === this.slow) {
      return;
    }
    this.slow = on;
    if (this.ctx && this.slowFilter) {
      const cutoff = on ? BreakerAudio.SLOW_CUTOFF_HZ : BreakerAudio.OPEN_CUTOFF_HZ;
      this.slowFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, on ? 0.08 : 0.05);
    }
  }

  /**
   * Call from the first pointer or key event: browsers only start audio after a gesture.
   * Creates the context once; later calls only resume it if the browser suspended it.
   */
  unlock(): void {
    if (!this.unlocked) {
      this.unlocked = true;
      try {
        this.ctx = this.createContext();
      } catch {
        this.ctx = null;
      }
      if (this.ctx) {
        this.buildGraph(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
  }

  /** Closes the context. The instance stays usable as a no-op. */
  destroy(): Promise<void> {
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    this.bus = null;
    this.lead = null;
    this.reverbIn = null;
    this.slowFilter = null;
    this.whiteNoise = null;
    this.brownNoise = null;
    this.gate.reset();
    if (!ctx || ctx.state === 'closed') {
      return Promise.resolve();
    }
    return ctx.close().catch(() => undefined);
  }

  // ------------------------------------------------------------- sounds

  launch(x?: number): void {
    this.play(
      'launch',
      [tone('triangle', 320, 0.14, 0.22, { to: 960 }), noise({ type: 'bandpass', freq: 2000, to: 5000, q: 0.8 }, 0.12, 0.08)],
      { x, vary: 20 },
    );
  }

  /**
   * A hit in the middle of the paddle thumps low, toward the edges it brightens:
   * `offset` is the event's, -1 (left edge) .. 1 (right edge).
   */
  paddle(perfect: boolean, offset = 0, x?: number): void {
    const f = paddleFrequency(offset);
    const thump: Part[] = [tone('triangle', f, 0.09, 0.3, { to: f * 0.67 }), tone('sine', f * 2.9, 0.07, 0.12)];
    if (!perfect) {
      this.play('paddle', thump, { x, vary: 25 });
      return;
    }
    this.play(
      'paddle',
      [
        ...thump,
        tone('sine', E6, 0.35, 0.14),
        tone('sine', 1975.5, 0.4, 0.08, { at: 0.03 }),
        tone('triangle', 2637, 0.25, 0.04, { at: 0.05 }),
      ],
      { x, space: 0.3 },
    );
  }

  wall(x?: number): void {
    this.play(
      'wall',
      [tone('triangle', 880, 0.05, 0.12, { to: 760 }), noise({ type: 'highpass', freq: 3500 }, 0.03, 0.05)],
      { x, vary: 40 },
    );
  }

  /**
   * The combo "pling": pass the `combo` of the brick-destroyed event (1 = first brick).
   * The note climbs the pentatonic scale for two octaves, then cycles the top one.
   * The kind of brick adds its own body: a crunch for the hard ones, glass for a prism.
   */
  brick(combo: number, kind: BrickKind = 'normal', x?: number): void {
    const f = pentatonicFrequency(comboNoteIndex(combo));
    const parts: Part[] = [
      tone('sine', f, 0.26, 0.22),
      tone('triangle', f * 2, 0.14, 0.07),
      tone('sine', f * 3.01, 0.07, 0.04),
      noise({ type: 'highpass', freq: 5000 }, 0.025, 0.06),
    ];
    const crunch: Part[] = [
      tone('triangle', 150, 0.12, 0.2, { to: 90 }),
      noise({ type: 'bandpass', freq: 1800, q: 1 }, 0.09, 0.14),
    ];
    switch (kind) {
      case 'tough':
        parts.push(...crunch);
        break;
      case 'armored':
      case 'steel':
        // The crunch of a tough brick, plus a metal ring.
        parts.push(...crunch, tone('sine', 1377, 0.16, 0.05), tone('sine', 2213, 0.1, 0.03));
        break;
      case 'prism':
        parts.push(tone('sine', f * 1.5, 0.4, 0.08, { at: 0.03 }), tone('sine', f * 4.01, 0.3, 0.04, { at: 0.05 }));
        break;
      case 'capsule':
        parts.push(tone('sine', f * 2, 0.1, 0.06, { to: f * 3, at: 0.02 }));
        break;
    }
    this.play('brick', parts, { x, space: kind === 'prism' ? 0.25 : 0.12 });
  }

  /**
   * A brick was hit but holds (tough, armored). The knock rises as `hpLeft` falls,
   * and one hit from breaking it cracks.
   */
  brickHard(hpLeft = 2, x?: number): void {
    const f = hardHitFrequency(hpLeft);
    const parts: Part[] = [
      tone('triangle', f, 0.09, 0.22, { to: f * 0.8 }),
      noise({ type: 'bandpass', freq: 1400, q: 1.2 }, 0.07, 0.12),
    ];
    if (hpLeft <= 1) {
      parts.push(noise({ type: 'highpass', freq: 3000 }, 0.05, 0.09, { at: 0.01 }));
    }
    this.play('brickHard', parts, { x, vary: 35 });
  }

  steel(x?: number): void {
    this.play(
      'steel',
      [
        tone('sine', 523, 0.32, 0.12),
        tone('sine', 1377, 0.22, 0.08),
        tone('sine', 2213, 0.16, 0.06),
        tone('sine', 3171, 0.12, 0.04),
        noise({ type: 'highpass', freq: 4000 }, 0.04, 0.08),
      ],
      { x, vary: 30, space: 0.25 },
    );
  }

  explosion(x?: number): void {
    this.play(
      'explosion',
      [
        noise({ type: 'lowpass', freq: 2400, to: 160, q: 0.7 }, 0.6, 0.5, { attack: 0.004, color: 'brown' }),
        tone('sine', 110, 0.45, 0.45, { to: 38 }),
        noise({ type: 'bandpass', freq: 900 }, 0.12, 0.2),
      ],
      { x, vary: 60, space: 0.3 },
    );
  }

  capsuleSpawn(x?: number): void {
    this.play(
      'capsuleSpawn',
      [tone('sine', 880, 0.12, 0.1, { to: 1320 }), tone('sine', 1320, 0.1, 0.06, { to: 1760, at: 0.06 })],
      { x },
    );
  }

  /** Positive kinds: a rising arpeggio. Shrink and fast: a descending buzz. */
  powerUp(kind: PowerUpKind, x?: number): void {
    if (isNegativePowerUp(kind)) {
      this.play(
        'powerUp',
        [
          tone('sawtooth', 320, 0.4, 0.14, { to: 110, filter: { type: 'lowpass', freq: 1400 } }),
          tone('sawtooth', 327, 0.4, 0.1, { to: 112, detune: 12, filter: { type: 'lowpass', freq: 1400 } }),
          tone('square', 80, 0.3, 0.06, { filter: { type: 'lowpass', freq: 600 } }),
        ],
        { priority: true, x, space: 0.2 },
      );
      return;
    }
    const notes = kind === 'nova' ? [E5, G5, C6, E6] : [C5, E5, G5, C6];
    const parts = arpeggio(notes, 0.055, 0.16, 0.16);
    if (kind === 'life') {
      parts.push(tone('sine', E6, 0.3, 0.12, { at: 0.24 }));
    }
    this.play('powerUp', parts, { priority: true, x, space: 0.3 });
  }

  laser(x?: number): void {
    this.play(
      'laser',
      [
        tone('square', 1600, 0.08, 0.07, { to: 420, filter: { type: 'lowpass', freq: 3200 } }),
        tone('sine', 2400, 0.05, 0.05, { to: 800 }),
      ],
      { x, vary: 50 },
    );
  }

  ballLost(x?: number): void {
    this.play(
      'ballLost',
      [
        tone('sine', 660, 0.45, 0.22, { to: 160 }),
        tone('triangle', 330, 0.5, 0.12, { to: 80 }),
        noise({ type: 'lowpass', freq: 600 }, 0.3, 0.1, { color: 'brown' }),
      ],
      { priority: true, x, space: 0.3 },
    );
  }

  /** The barrier saved a ball. */
  barrier(x?: number): void {
    this.play(
      'barrier',
      [
        tone('sine', C6, 0.25, 0.12, { to: 1568 }),
        noise({ type: 'bandpass', freq: 3000, to: 6000, q: 2 }, 0.25, 0.07),
        tone('sine', C5, 0.3, 0.1),
      ],
      { priority: true, x, space: 0.3 },
    );
  }

  lifeLost(): void {
    this.play(
      'lifeLost',
      [
        ...[392, 329.63, 261.63].map((f, i) => tone('triangle', f, 0.26, 0.2, { at: i * 0.14 })),
        tone('sawtooth', 98, 0.5, 0.05, { filter: { type: 'lowpass', freq: 400 } }),
      ],
      { priority: true, space: 0.4, duck: 0.5 },
    );
  }

  lifeGained(): void {
    this.play('lifeGained', arpeggio([C5, E5, G5, C6, E6], 0.06, 0.18, 0.15), { priority: true, space: 0.35 });
  }

  /** The Overdrive meter is full. */
  overdriveReady(): void {
    this.play(
      'overdriveReady',
      [
        tone('sawtooth', 220, 0.45, 0.08, { to: 880, filter: { type: 'lowpass', freq: 600, to: 4000 } }),
        tone('sine', 1760, 0.4, 0.12, { at: 0.4 }),
        tone('sine', 2637, 0.35, 0.06, { at: 0.42 }),
      ],
      { priority: true, space: 0.35 },
    );
  }

  nova(): void {
    this.play(
      'nova',
      [
        noise({ type: 'bandpass', freq: 400, to: 6000, q: 1.5 }, 0.8, 0.18, { attack: 0.05 }),
        ...[261.63, 329.63, 392, 493.88].map((f) =>
          tone('sawtooth', f, 0.9, 0.05, { attack: 0.03, filter: { type: 'lowpass', freq: 800, to: 5000 } }),
        ),
        tone('sine', 130.81, 0.9, 0.2, { attack: 0.02 }),
      ],
      { priority: true, space: 0.5, duck: 0.5 },
    );
  }

  comboLost(): void {
    this.play('comboLost', [
      tone('triangle', E5, 0.12, 0.1, { to: 622.25 }),
      tone('triangle', C5, 0.2, 0.1, { at: 0.1 }),
    ]);
  }

  /** The last brick of the sector: a boom and a long bell, over the muffled slow motion. */
  lastBrick(x?: number): void {
    this.play(
      'lastBrick',
      [
        tone('sine', 90, 1.0, 0.5, { to: 30 }),
        noise({ type: 'lowpass', freq: 3000, to: 200 }, 0.9, 0.35, { attack: 0.003, color: 'brown' }),
        tone('sine', 2093, 1.4, 0.1),
        tone('sine', 3136, 1.2, 0.06, { at: 0.02 }),
      ],
      { priority: true, x, space: 0.6, duck: 0.9 },
    );
  }

  sectorClear(): void {
    const notes = [C5, E5, G5, C6];
    this.play(
      'sectorClear',
      [
        ...notes.flatMap((f, i) => [
          tone('triangle', f, 0.2, 0.16, { at: i * 0.09 }),
          tone('square', f, 0.12, 0.03, { at: i * 0.09, filter: { type: 'lowpass', freq: 2500 } }),
        ]),
        ...notes.map((f) => tone('triangle', f, 0.7, 0.08, { at: 0.36, attack: 0.01 })),
      ],
      { priority: true, space: 0.45 },
    );
  }

  gameOver(): void {
    this.play(
      'gameOver',
      [
        ...[392, 311.13, 261.63, 196].map((f, i) => tone('triangle', f, 0.4, 0.18, { at: i * 0.22 })),
        tone('sawtooth', 65.41, 1.4, 0.08, { attack: 0.05, filter: { type: 'lowpass', freq: 300 } }),
      ],
      { priority: true, space: 0.5, duck: 1.0 },
    );
  }

  /** The core takes a hit: a heavy armored thud; the eye rings higher. Blocked hits are a dull tap. */
  bossHit(damage: number, weak: boolean, x?: number): void {
    if (damage <= 0) {
      this.play('bossHit', [tone('triangle', 180, 0.06, 0.12, { to: 150 })], { x, vary: 30 });
      return;
    }
    this.play(
      'bossHit',
      [
        tone('square', 120, 0.16, 0.16, { to: 70, filter: { type: 'lowpass', freq: 900 } }),
        noise({ type: 'bandpass', freq: 700, q: 1.4 }, 0.1, 0.18),
        tone('sine', weak ? 1567.98 : 880, 0.18, weak ? 0.12 : 0.07, { at: 0.01 }),
        ...(weak ? [tone('sine', 2349.32, 0.14, 0.06, { at: 0.04 })] : []),
      ],
      // The eye's ring is a note the player learns: it keeps its pitch.
      { x, vary: weak ? 0 : 30, space: 0.2 },
    );
  }

  /** The core fires: a charged zap that drops. */
  bossShot(x?: number): void {
    this.play(
      'bossShot',
      [
        tone('sawtooth', 900, 0.16, 0.08, { to: 260, filter: { type: 'lowpass', freq: 2400, to: 700 } }),
        tone('sine', 440, 0.12, 0.06, { to: 220 }),
      ],
      { x, vary: 40 },
    );
  }

  /** The core goes down: a long rumble under a falling scream, then a bright chord. */
  bossDown(x?: number): void {
    this.play(
      'bossDown',
      [
        noise({ type: 'lowpass', freq: 3200, to: 120, q: 0.8 }, 1.6, 0.5, { attack: 0.004, color: 'brown' }),
        tone('sine', 140, 1.4, 0.5, { to: 28 }),
        tone('sawtooth', 1200, 0.9, 0.08, { to: 90, filter: { type: 'lowpass', freq: 3000, to: 400 } }),
        ...[C5, E5, G5, C6, E6].map((f, i) => tone('triangle', f, 0.9, 0.07, { at: 0.5 + i * 0.07, attack: 0.01 })),
      ],
      { priority: true, x, space: 0.6, duck: 1.2 },
    );
  }

  /**
   * A boss sector starts: a low two-tone klaxon, three wails. Nothing like the
   * rising Nova-ready chime, so the player never reads it as "Nova is ready".
   */
  bossAlarm(): void {
    const wail = [0, 0.32, 0.64].flatMap((at) => [
      tone('square', 330, 0.16, 0.07, { at, filter: { type: 'lowpass', freq: 1400 } }),
      tone('square', 247, 0.16, 0.07, { at: at + 0.16, filter: { type: 'lowpass', freq: 1400 } }),
    ]);
    this.play(
      'bossAlarm',
      [...wail, tone('sawtooth', 82.41, 0.96, 0.08, { attack: 0.02, filter: { type: 'lowpass', freq: 400 } })],
      { priority: true, space: 0.35 },
    );
  }

  /** Menus and countdowns. */
  uiTick(): void {
    this.play('uiTick', [tone('sine', 1800, 0.03, 0.06)], { space: 0 });
  }

  // ------------------------------------------------------------- engine

  private buildGraph(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = this._muted ? 0 : MASTER_GAIN;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    compressor.connect(master);
    master.connect(ctx.destination);

    const slowFilter = ctx.createBiquadFilter();
    slowFilter.type = 'lowpass';
    slowFilter.frequency.value = this.slow ? BreakerAudio.SLOW_CUTOFF_HZ : BreakerAudio.OPEN_CUTOFF_HZ;
    slowFilter.Q.value = 0.7;
    slowFilter.connect(compressor);

    const bus = ctx.createGain();
    bus.gain.value = BreakerAudio.BUS_GAIN;
    bus.connect(slowFilter);

    const lead = ctx.createGain();
    lead.gain.value = BreakerAudio.BUS_GAIN;
    lead.connect(compressor);

    // The room: a generated impulse (noise falling to silence), stereo when the device is.
    const channels = Math.min(2, Math.max(1, ctx.destination.channelCount || 2));
    const impulse = ctx.createBuffer(channels, Math.floor(ctx.sampleRate * REVERB_SECONDS), ctx.sampleRate);
    for (let c = 0; c < channels; c++) {
      fillImpulseResponse(impulse.getChannelData(c), this.random);
    }
    const damping = ctx.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = REVERB_DAMPING_HZ;
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = REVERB_RETURN;
    damping.connect(reverb);
    reverb.connect(reverbReturn);
    reverbReturn.connect(compressor);

    // One second of each noise, shared by every noisy part.
    const white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const whiteData = white.getChannelData(0);
    for (let i = 0; i < whiteData.length; i++) {
      whiteData[i] = this.random() * 2 - 1;
    }
    const brown = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    fillBrownNoise(brown.getChannelData(0), this.random);

    this.master = master;
    this.bus = bus;
    this.lead = lead;
    this.reverbIn = damping;
    this.slowFilter = slowFilter;
    this.whiteNoise = white;
    this.brownNoise = brown;
  }

  private play(key: string, parts: Part[], options: PlayOptions = {}): void {
    const ctx = this.ctx;
    // Muted or not running: schedule nothing. A suspended context would queue the
    // sounds and fire them all at once when it resumes.
    if (!ctx || !this.bus || !this.lead || this._muted || ctx.state !== 'running') {
      return;
    }
    const length = Math.max(...parts.map((part) => (part.at ?? 0) + part.dur));
    if (!this.gate.tryPlay(key, performance.now(), parts.length, length * 1000, options.priority ?? false)) {
      return;
    }
    const start = ctx.currentTime + LEAD;
    const voice = this.voice(ctx, start, parts.length, options);
    if (options.duck !== undefined) {
      this.duck(ctx, options.duck);
    }
    for (const part of parts) {
      if (part.kind === 'tone') {
        this.playTone(ctx, voice, part);
      } else {
        this.playNoise(ctx, voice, part);
      }
    }
  }

  /** The nodes one play shares: its panner (or a plain gain), its route and its reverb send. */
  private voice(ctx: AudioContext, start: number, partCount: number, options: PlayOptions): Voice {
    const target = options.duck !== undefined ? this.lead! : this.bus!;
    let out: AudioNode;
    if (options.x !== undefined && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = panForX(options.x);
      out = panner;
    } else {
      out = ctx.createGain();
    }
    out.connect(target);

    const space = options.space ?? DEFAULT_SPACE;
    let send: GainNode | null = null;
    if (space > 0 && this.reverbIn) {
      send = ctx.createGain();
      send.gain.value = space;
      out.connect(send);
      send.connect(this.reverbIn);
    }

    const vary = Math.min(BreakerAudio.MAX_VARY_CENTS, options.vary ?? 0);
    let left = partCount;
    return {
      start,
      out,
      detune: vary > 0 ? spread(this.random, vary) : 0,
      gainScale: vary > 0 ? 1 + spread(this.random, GAIN_VARIATION) : 1,
      ended: () => {
        if (--left === 0) {
          out.disconnect();
          send?.disconnect();
        }
      },
    };
  }

  /** Pulls the everyday bus down under a big moment, then lets it drift back. */
  private duck(ctx: AudioContext, holdSec: number): void {
    const gain = this.bus!.gain;
    const now = ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(BreakerAudio.DUCK_LEVEL, now + 0.03);
    gain.setTargetAtTime(BreakerAudio.BUS_GAIN, now + 0.03 + holdSec, 0.25);
  }

  private envelope(ctx: AudioContext, voice: Voice, start: number, part: Part): GainNode {
    const gain = ctx.createGain();
    const attack = Math.max(MIN_ATTACK, part.attack ?? MIN_ATTACK);
    const end = start + part.dur;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(part.gain * voice.gainScale, start + Math.min(attack, part.dur / 2));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(voice.out);
    return gain;
  }

  private filterFor(ctx: AudioContext, start: number, dur: number, filter: Filter): BiquadFilterNode {
    const node = ctx.createBiquadFilter();
    node.type = filter.type;
    node.frequency.setValueAtTime(filter.freq, start);
    if (filter.to !== undefined) {
      node.frequency.exponentialRampToValueAtTime(Math.max(20, filter.to), start + dur);
    }
    if (filter.q !== undefined) {
      node.Q.value = filter.q;
    }
    return node;
  }

  private playTone(ctx: AudioContext, voice: Voice, part: TonePart): void {
    const start = voice.start + (part.at ?? 0);
    const osc = ctx.createOscillator();
    osc.type = part.wave;
    osc.frequency.setValueAtTime(part.freq, start);
    if (part.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, part.to), start + part.dur);
    }
    const detune = (part.detune ?? 0) + voice.detune;
    if (detune !== 0) {
      osc.detune.value = detune;
    }
    const gain = this.envelope(ctx, voice, start, part);
    const filter = part.filter ? this.filterFor(ctx, start, part.dur, part.filter) : null;
    if (filter) {
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }
    osc.onended = () => {
      osc.disconnect();
      filter?.disconnect();
      gain.disconnect();
      voice.ended();
    };
    osc.start(start);
    osc.stop(start + part.dur + 0.02);
  }

  private playNoise(ctx: AudioContext, voice: Voice, part: NoisePart): void {
    const buffer = part.color === 'brown' ? this.brownNoise : this.whiteNoise;
    if (!buffer) {
      voice.ended();
      return;
    }
    const start = voice.start + (part.at ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.filterFor(ctx, start, part.dur, part.filter);
    const gain = this.envelope(ctx, voice, start, part);
    source.connect(filter);
    filter.connect(gain);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      voice.ended();
    };
    // A random offset into the buffer, so two hits never sound identical.
    source.start(start, this.random() * 0.5);
    source.stop(start + part.dur + 0.02);
  }
}
