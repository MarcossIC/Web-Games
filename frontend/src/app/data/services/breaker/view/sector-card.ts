import { formatTime } from '../engine/records';
import { formatScore, paceLabel, sectorLabel } from './hud-format';

export const CARD = {
  /** The card continues by itself after this long. */
  AUTO_CONTINUE_MS: 2500,
  /** A click or Space this soon after the card shows is the rally's, not a skip. */
  MIN_SKIP_MS: 500,
} as const;

export interface ClearedSector {
  sector: number;
  timeMs: number;
  parTimeMs: number;
  bonus: number;
  noMiss: boolean;
  /** The part of `bonus` paid for destroying the core, on boss sectors. */
  bossBonus?: number;
}

export interface SectorCardText {
  title: string;
  time: string;
  par: string;
  bonus: string;
  /** Best clear time of the sector, this one included. */
  best: string;
  isNewBest: boolean;
  /** "NO MISS" or empty. */
  noMiss: string;
  /** "CORE +5,000" on a boss sector (the core's share of the bonus), or empty. */
  core: string;
}

/**
 * The SECTOR CLEARED card. `previousBestMs` is the sector's best time from
 * the records saved before this run (the run is only recorded at game over).
 */
export function sectorCardText(cleared: ClearedSector, previousBestMs: number | undefined): SectorCardText {
  const isNewBest = previousBestMs === undefined || !(previousBestMs > 0) || cleared.timeMs < previousBestMs;
  const best = isNewBest ? cleared.timeMs : (previousBestMs as number);
  const pace = paceLabel(cleared.timeMs, cleared.parTimeMs);
  return {
    title: `${sectorLabel(cleared.sector)} CLEARED`,
    time: formatTime(cleared.timeMs),
    par: pace.slice(pace.indexOf('PAR')),
    bonus: `+${formatScore(cleared.bonus)}`,
    best: `BEST ${formatTime(best)}`,
    isNewBest,
    noMiss: cleared.noMiss ? 'NO MISS' : '',
    core: cleared.bossBonus && cleared.bossBonus > 0 ? `CORE +${formatScore(cleared.bossBonus)}` : '',
  };
}

/** Whether the card may go: after the auto delay, or on a press once the skip guard passed. */
export function cardCanContinue(elapsedMs: number, pressed: boolean): boolean {
  if (elapsedMs >= CARD.AUTO_CONTINUE_MS) return true;
  return pressed && elapsedMs >= CARD.MIN_SKIP_MS;
}
