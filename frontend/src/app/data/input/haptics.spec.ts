import { vibrate } from './haptics';

describe('vibrate', () => {
  it('asks the device to vibrate with the pattern', () => {
    const host = { vibrate: jasmine.createSpy('vibrate').and.returnValue(true) };
    expect(vibrate([30, 20, 30], host)).toBeTrue();
    expect(host.vibrate).toHaveBeenCalledOnceWith([30, 20, 30]);
  });

  it('does nothing on a device that cannot vibrate', () => {
    expect(vibrate(40, {})).toBeFalse();
    expect(vibrate(40, undefined)).toBeFalse();
  });

  it('does nothing when the browser refuses', () => {
    const host = {
      vibrate: () => {
        throw new Error('blocked');
      },
    };
    expect(vibrate(40, host)).toBeFalse();
  });
});
