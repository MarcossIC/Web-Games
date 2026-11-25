import { Board } from './board';
import { ARM, CLEARANCE, CLIP_LENGTH, TUBE } from './config';
import { angleOf, distance, samplePolyline, wrapAngle } from './geometry';
import { SAMPLE_STEP } from './config';
import type { LevelSpec } from './types';

/**
 * What is wrong with a level as it is drawn, in words; empty when nothing
 * is. Pieces must not overlap, every clip must sit on a tube and hang from
 * one, and every ring must be in a clip. Whether it can be cleared is for
 * its solution to show.
 */
export function levelProblems(level: LevelSpec): string[] {
  const problems: string[] = [];
  let board: Board;
  try {
    board = Board.load(level);
  } catch (error) {
    return [(error as Error).message];
  }

  for (const ring of board.rings) {
    const clips = board.clips.filter((clip) => clip.from === ring.id || clip.on === ring.id);
    if (clips.length === 0) problems.push(`Ring ${ring.id} is in no clip: it would break at once.`);

    for (const blob of board.blobs({ ring: ring.id })) {
      const span = board.spanOn(ring, blob);
      if (!span) continue;
      if (Math.abs(span.a) + span.half > ring.gapHalf + 1e-6) {
        problems.push(
          `Ring ${ring.id} overlaps something at ${Math.round(blob.x)},${Math.round(blob.y)}.`
        );
        break;
      }
    }
  }

  for (const clip of board.clips) {
    const from = board.rings[clip.from];
    const on = board.rings[clip.on];
    if (clip.from === clip.on) problems.push(`Clip ${clip.id} holds its own ring.`);
    if (on.gapHalf <= 0) problems.push(`Clip ${clip.id} is on closed ring ${on.id}: it can never let go.`);
    else if (board.releaseWindow(on) <= 0) problems.push(`Ring ${on.id} opens too little to let clip ${clip.id} go.`);

    const onArc = Math.abs(wrapAngle(clip.at - on.angle)) - on.gapHalf;
    if (onArc < (CLIP_LENGTH / 2 + 2) / on.radius) {
      problems.push(`Clip ${clip.id} is not on the tube of ring ${on.id}.`);
    }
    if (from.gapHalf > 0) {
      const weldArc = Math.abs(wrapAngle(angleOf(from.center, clip.weld) - from.angle)) - from.gapHalf;
      if (weldArc < (ARM / 2 + TUBE / 2) / from.radius) {
        problems.push(`The arm of clip ${clip.id} is not on the tube of ring ${from.id}.`);
      }
    }
    const arm = distance(clip.weld, clip.sleeve);
    if (arm < TUBE / 2 + 6) problems.push(`The arm of clip ${clip.id} is too short (${arm.toFixed(1)}).`);
    if (arm > 60) problems.push(`The arm of clip ${clip.id} is too long (${arm.toFixed(1)}).`);
  }

  for (const rod of board.rods) {
    const own = samplePolyline(rod.points, SAMPLE_STEP);
    outer: for (const blob of board.blobs({ rod: rod.id })) {
      for (const p of own) {
        if (Math.hypot(blob.x - p.x, blob.y - p.y) < TUBE / 2 + blob.r + CLEARANCE - 1e-6) {
          problems.push(`Rod ${rod.id} overlaps something at ${Math.round(blob.x)},${Math.round(blob.y)}.`);
          break outer;
        }
      }
    }
  }
  return problems;
}
