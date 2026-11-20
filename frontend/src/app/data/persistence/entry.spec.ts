import { count, recordOf, text } from './codecs';
import { defineEntry } from './entry';
import { memoryStore } from './memory-store';

interface Saves {
  best: number;
  name: string;
  times: Record<number, number>;
}

const saves = defineEntry<Saves>({
  game: 'test-game',
  name: 'saves',
  version: 2,
  fallback: { best: 0, name: 'anon', times: {} },
  fields: { best: count(), name: text(), times: recordOf(count(1), count()) },
});

const FALLBACK: Saves = { best: 0, name: 'anon', times: {} };

describe('defineEntry', () => {
  it('lives under gg:<game>:<name>', () => {
    expect(saves.key).toBe('gg:test-game:saves');
  });

  it('refuses a game or a name that would break the key', () => {
    const bad: [string, string][] = [
      ['Tetris', 'records'],
      ['tetris', 'my records'],
      ['', 'records'],
      ['tetris', 'a:b'],
    ];
    for (const [game, name] of bad) {
      expect(() => defineEntry({ game, name, version: 1, fallback: { a: 0 }, fields: { a: count() } }))
        .withContext(`${game}/${name}`)
        .toThrowError(/lowercase/);
    }
  });

  it('reads the fallback when nothing was saved', () => {
    expect(saves.read(memoryStore())).toEqual(FALLBACK);
  });

  it('reads back what it wrote', () => {
    const store = memoryStore();

    saves.write(store, { best: 120, name: 'mar', times: { 1: 40 } });

    expect(saves.read(store)).toEqual({ best: 120, name: 'mar', times: { 1: 40 } });
  });

  it('saves the value inside an envelope that carries its version', () => {
    const store = memoryStore();

    saves.write(store, { best: 1, name: 'a', times: {} });

    expect(JSON.parse(store.read(saves.key)!)).toEqual({ v: 2, data: { best: 1, name: 'a', times: {} } });
  });

  const unreadable: [string, string][] = [
    ['invalid JSON', '{not json'],
    ['a JSON that is not an object', '42'],
    ['null', 'null'],
    ['an envelope with no data', JSON.stringify({ v: 2 })],
    ['another version', JSON.stringify({ v: 1, data: { best: 99, name: 'old', times: {} } })],
    ['no version', JSON.stringify({ data: { best: 99, name: 'old', times: {} } })],
  ];
  for (const [what, raw] of unreadable) {
    it(`reads the fallback from ${what}`, () => {
      expect(saves.read(memoryStore({ [saves.key]: raw }))).toEqual(FALLBACK);
    });
  }

  it('falls back field by field, keeping the fields that are still good', () => {
    const raw = JSON.stringify({ v: 2, data: { best: 'NaN', name: 'mar', times: { 1: 40, x: 3 } } });

    expect(saves.read(memoryStore({ [saves.key]: raw }))).toEqual({ best: 0, name: 'mar', times: { 1: 40 } });
  });

  it('never hands out its fallback: changing what it read changes nothing', () => {
    const store = memoryStore();

    saves.read(store).times[1] = 5;

    expect(saves.read(store).times).toEqual({});
  });
});
