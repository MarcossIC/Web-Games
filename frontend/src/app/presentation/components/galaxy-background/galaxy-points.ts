export interface GalaxyOptions {
  /** How many stars to generate. */
  count: number;
  /** Number of spiral arms. */
  arms: number;
  /** Radius of the disc, in scene units. */
  radius: number;
  /** How much each arm twists per unit of radius, in radians. */
  spin: number;
  /** How far a star may drift from its arm (0 = perfect lines). */
  randomness: number;
  /** Seed for the generator: the same seed always gives the same galaxy. */
  seed: number;
}

export interface GalaxyPoints {
  /** x, y, z per star. */
  positions: Float32Array;
  /** r, g, b per star, each 0..1. */
  colors: Float32Array;
}

type Rgb = readonly [number, number, number];

const CORE: Rgb = [1, 0.84, 0.92];
const MID: Rgb = [1, 0.18, 0.53];
const EDGE: Rgb = [0.35, 0.3, 0.95];

/** Small deterministic PRNG, so the galaxy is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(from: Rgb, to: Rgb, amount: number, channel: number): number {
  return from[channel] + (to[channel] - from[channel]) * amount;
}

/**
 * Builds the star positions and colors of a spiral galaxy.
 * Pure data: it has no three.js dependency, so it runs anywhere.
 */
export function buildGalaxyPoints(options: GalaxyOptions): GalaxyPoints {
  const { count, arms, radius, spin, randomness, seed } = options;
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // The power packs more stars near the core.
    const distance = Math.pow(random(), 1.6) * radius;
    const armAngle = ((i % arms) / arms) * Math.PI * 2;
    const angle = armAngle + distance * spin;
    const drift = () =>
      Math.pow(random(), 3) *
      (random() < 0.5 ? 1 : -1) *
      randomness *
      (0.7 + distance * 0.6);

    const at = i * 3;
    positions[at] = Math.cos(angle) * distance + drift();
    positions[at + 1] = drift() * 0.35;
    positions[at + 2] = Math.sin(angle) * distance + drift();

    const t = radius === 0 ? 0 : distance / radius;
    for (let channel = 0; channel < 3; channel++) {
      colors[at + channel] =
        t < 0.5
          ? mix(CORE, MID, t * 2, channel)
          : mix(MID, EDGE, (t - 0.5) * 2, channel);
    }
  }

  return { positions, colors };
}

/**
 * Builds a shell of distant stars around the scene, so there is sky in
 * every direction once the camera is inside the galaxy.
 * Returns x, y, z per star, all at `radius` from the origin.
 */
export function buildStarfieldPositions(
  count: number,
  radius: number,
  seed: number
): Float32Array {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Uniform direction on a sphere.
    const height = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - height * height);
    positions[i * 3] = Math.cos(angle) * ring * radius;
    positions[i * 3 + 1] = height * radius;
    positions[i * 3 + 2] = Math.sin(angle) * ring * radius;
  }

  return positions;
}
