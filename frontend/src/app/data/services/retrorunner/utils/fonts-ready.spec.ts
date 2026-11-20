import { fontsReady } from './fonts-ready';

/** A font set whose loads are settled by the test. */
function fakeFonts() {
  const asked: string[] = [];
  const settle: { resolve: () => void; reject: (reason: unknown) => void }[] = [];
  return {
    asked,
    settle,
    load: (font: string) => {
      asked.push(font);
      return new Promise<void>((resolve, reject) => settle.push({ resolve, reject }));
    },
  };
}

describe('fontsReady', () => {
  beforeEach(() => jasmine.clock().install());
  afterEach(() => jasmine.clock().uninstall());

  /** Whether `promise` is done, without waiting for it. */
  async function isDone(promise: Promise<void>): Promise<boolean> {
    let done = false;
    promise.then(() => (done = true));
    // Lets the promises that are ready run.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    return done;
  }

  it('asks for every typeface the game writes with', () => {
    const fonts = fakeFonts();

    fontsReady(fonts, ['16px Silkscreen', '36px Audiowide'], 2000);

    expect(fonts.asked).toEqual(['16px Silkscreen', '36px Audiowide']);
  });

  it('waits until all of them arrived', async () => {
    const fonts = fakeFonts();
    const ready = fontsReady(fonts, ['16px Silkscreen', '36px Audiowide'], 2000);

    fonts.settle[0].resolve();
    expect(await isDone(ready)).toBeFalse();

    fonts.settle[1].resolve();
    expect(await isDone(ready)).toBeTrue();
  });

  it('does not hold the game for a typeface that is slow to arrive', async () => {
    const fonts = fakeFonts();
    const ready = fontsReady(fonts, ['16px Silkscreen'], 2000);

    jasmine.clock().tick(1999);
    expect(await isDone(ready)).toBeFalse();

    jasmine.clock().tick(1);
    expect(await isDone(ready)).toBeTrue();
  });

  it('goes on without a typeface that could not be loaded: the browser has another', async () => {
    const fonts = fakeFonts();
    const ready = fontsReady(fonts, ['16px Silkscreen'], 2000);

    fonts.settle[0].reject(new Error('offline'));

    expect(await isDone(ready)).toBeTrue();
  });

  it('is ready at once where the browser cannot be asked', async () => {
    expect(await isDone(fontsReady(undefined, ['16px Silkscreen'], 2000))).toBeTrue();
  });
});
