import { defineEntry, text } from '@app-persistence';

export interface ChessSettings {
  /** The level last played against the machine: a ChessBotLevel. */
  level: string;
  /** The side last asked for against the machine: a ChessSide. */
  side: string;
}

/**
 * What Chess keeps between visits: how the last game against the machine
 * was set up, so the next one starts from there. They are kept as text:
 * whoever reads them takes a value it does not know for the default.
 */
export const chessSettings = defineEntry<ChessSettings>({
  game: 'chess',
  name: 'settings',
  version: 1,
  fallback: { level: 'normal', side: 'white' },
  fields: { level: text(), side: text() },
});
