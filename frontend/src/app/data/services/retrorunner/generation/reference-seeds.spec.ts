import { ChunkPlan } from './chunk-plan';
import { WorldGenerator } from './world-generator';

/**
 * Three worlds written down. A change that alters them by accident is a
 * regression: a shared seed would open another world. A change that alters
 * them on purpose (a number in balance.ts, a new pattern) updates them here,
 * in the same commit, after looking at the new shape.
 *
 * Shape: one letter per chunk up to x = 20000. G ground, R rest, _ gap,
 * U and D stairs up and down, P pyramid, C floating chain, H house scene,
 * 2 dual path, F fishing hut.
 */
const REFERENCE = [
  { key: 'A1B2C3D4', shape: 'GG_UGDGG2G2_PGG_2RGHGPGFG_GGGU_HGG2GGDP', digest: 'ab93215c' },
  { key: '00000001', shape: 'GGPGG_PG_GGGGG_GGH_G_GRGG_G_G_GCGFPGPPHGGPG', digest: 'd8da6fef' },
  { key: 'CAFEBABE', shape: 'GG_GGGGG2GG_HG_2HPPHGGG2UGG2_H2CGGGH_P', digest: 'edaf41c3' },
];

const LETTER: Record<string, string> = {
  ground: 'G',
  rest: 'R',
  gap: '_',
  'staircase-up': 'U',
  'staircase-down': 'D',
  pyramid: 'P',
  'floating-chain': 'C',
  'house-scene': 'H',
  'dual-path': '2',
  'fishing-hut': 'F',
};

/** FNV-1a, 32 bits: enough to notice any change in a plan. */
function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('reference seeds', () => {
  for (const reference of REFERENCE) {
    it(`still plan the world of ${reference.key}`, () => {
      const generator = new WorldGenerator({ key: reference.key, floorY: 314 });
      const plans: ChunkPlan[] = [];
      while (plans.length === 0 || plans[plans.length - 1].endX < 20000) plans.push(generator.next());

      expect(plans.map((plan) => LETTER[plan.pattern ?? plan.kind]).join('')).toBe(reference.shape);
      expect(digest(JSON.stringify(plans))).toBe(reference.digest);
    });
  }
});
