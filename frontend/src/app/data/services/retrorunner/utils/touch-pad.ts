import { type Finger, heldZones, type Zone } from '@app-input';
import { TouchControls } from './runner-layout';

export type { Finger } from '@app-input';

/** What the keys on the screen ask of the capybara right now. */
export interface PadState {
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
}

type PadKey = keyof PadState;

export function idlePad(): PadState {
  return { left: false, right: false, jump: false, crouch: false };
}

/** The zones of each layout, built once: readPad runs every frame. */
const ZONES = new WeakMap<TouchControls, readonly Zone<PadKey>[]>();

/** In this order: a finger where two zones meet holds the first. */
function padZones(controls: TouchControls): readonly Zone<PadKey>[] {
  let zones = ZONES.get(controls);
  if (!zones) {
    zones = (['left', 'right', 'jump', 'crouch'] as const).map((key) => ({ key, rect: controls[key].zone }));
    ZONES.set(controls, zones);
  }
  return zones;
}

/**
 * Which keys are held, from where the fingers are now (see heldZones): a
 * finger that slides from one arrow to the other turns around without
 * lifting, and no key can be left stuck. `out` is filled and returned.
 */
export function readPad(controls: TouchControls | null, fingers: readonly Finger[], out: PadState): PadState {
  return heldZones(controls ? padZones(controls) : null, fingers, out);
}
