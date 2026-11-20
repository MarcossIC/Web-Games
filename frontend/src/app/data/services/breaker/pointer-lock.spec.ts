import { CanvasPointerLock, type PointerLockHost } from './pointer-lock';

/** A document and a canvas that answer like a browser that grants (or refuses) the lock. */
function fakeHost(grant = true) {
  const listeners = new Set<(event: Event) => void>();
  const canvas = {
    requestPointerLock: jasmine.createSpy('requestPointerLock').and.callFake(() => {
      if (!grant) return Promise.reject(new Error('no user activation'));
      doc.pointerLockElement = canvas as unknown as Element;
      fire(1);
      return Promise.resolve();
    }),
  };
  const doc = {
    pointerLockElement: null as Element | null,
    exitPointerLock: jasmine.createSpy('exitPointerLock').and.callFake(() => {
      doc.pointerLockElement = null;
      fire(2);
    }),
    addEventListener: (_type: string, fn: (event: Event) => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: (event: Event) => void) => listeners.delete(fn),
  };
  const fire = (timeStamp: number) => listeners.forEach((fn) => fn({ timeStamp } as Event));
  /** The browser drops the lock on its own (Esc, Alt+Tab). */
  const breakLock = (timeStamp: number) => {
    doc.pointerLockElement = null;
    fire(timeStamp);
  };
  return { doc: doc as unknown as PointerLockHost, canvas: canvas as unknown as HTMLElement, raw: doc, breakLock, listeners };
}

describe('CanvasPointerLock', () => {
  it('locks the canvas when wanted and releases it when not', () => {
    const host = fakeHost();
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, () => {});
    lock.set(true);
    expect(lock.locked).toBeTrue();
    lock.set(false);
    expect(host.raw.exitPointerLock).toHaveBeenCalledTimes(1);
    expect(lock.locked).toBeFalse();
  });

  it('does not ask again while it already holds the lock', () => {
    const host = fakeHost();
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, () => {});
    lock.set(true);
    lock.set(true);
    lock.retry();
    expect(host.canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  });

  it('tells when the browser breaks a lock it wanted (Esc), with the time it happened', () => {
    const host = fakeHost();
    const lost = jasmine.createSpy('lost');
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, lost);
    lock.set(true);
    host.breakLock(1234);
    expect(lost).toHaveBeenCalledOnceWith(1234);
  });

  it('stays quiet when it releases the lock itself (a pause from P)', () => {
    const host = fakeHost();
    const lost = jasmine.createSpy('lost');
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, lost);
    lock.set(true);
    lock.set(false);
    expect(lost).not.toHaveBeenCalled();
  });

  it('swallows a refused lock, and a press on the canvas tries again only while wanted', async () => {
    const host = fakeHost(false);
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, () => {});
    lock.set(true);
    await Promise.resolve();
    expect(lock.locked).toBeFalse();
    lock.retry();
    expect(host.canvas.requestPointerLock).toHaveBeenCalledTimes(2);
    lock.set(false);
    lock.retry();
    expect(host.canvas.requestPointerLock).toHaveBeenCalledTimes(2);
  });

  it('does nothing before the canvas exists', () => {
    const host = fakeHost();
    const lock = new CanvasPointerLock(host.doc, () => null, () => {});
    expect(() => lock.set(true)).not.toThrow();
    expect(lock.locked).toBeFalse();
  });

  it('destroy releases the lock and stops listening', () => {
    const host = fakeHost();
    const lost = jasmine.createSpy('lost');
    const lock = new CanvasPointerLock(host.doc, () => host.canvas, lost);
    lock.set(true);
    lock.destroy();
    expect(host.raw.exitPointerLock).toHaveBeenCalled();
    expect(host.listeners.size).toBe(0);
    expect(lost).not.toHaveBeenCalled();
  });
});
