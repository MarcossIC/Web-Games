import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WINDOW } from '@app-services/Window.service';
import {
  DISMISSED_AT_KEY,
  InstallPrompt,
  SNOOZE_MS,
} from './install-prompt.service';

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// iPadOS and a real Mac send this same string.
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

interface FakeDevice {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  /** Safari's flag for a page opened from the home screen. */
  standalone?: boolean;
  /** The page runs in its own window, as an installed app. */
  displayStandalone?: boolean;
  storage?: Storage;
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  } as Storage;
}

function blockedStorage(): Storage {
  const refuse = () => {
    throw new DOMException('Storage is blocked', 'SecurityError');
  };
  return { getItem: refuse, setItem: refuse } as unknown as Storage;
}

function fakeWindow(device: FakeDevice): Window {
  return Object.assign(new EventTarget(), {
    navigator: {
      userAgent: device.userAgent,
      platform: device.platform,
      maxTouchPoints: device.maxTouchPoints,
      standalone: device.standalone,
    },
    matchMedia: (query: string) => ({
      matches:
        !!device.displayStandalone && query === '(display-mode: standalone)',
    }),
    localStorage: device.storage ?? memoryStorage(),
  }) as unknown as Window;
}

/** The event Chromium fires once the page can be installed. */
function installable(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(
    new Event('beforeinstallprompt', { cancelable: true }),
    {
      prompt: jasmine.createSpy('prompt').and.resolveTo(undefined),
      userChoice: Promise.resolve({ outcome }),
    }
  );
}

/** Opens the site in `win`: every call is a new visit. */
function visit(win: Window, platform = 'browser'): InstallPrompt {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: WINDOW, useValue: win },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return TestBed.inject(InstallPrompt);
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 19));
  });

  afterEach(() => jasmine.clock().uninstall());

  describe('on Android', () => {
    it('offers nothing until the browser says the site can be installed', () => {
      const install = visit(fakeWindow({ userAgent: ANDROID }));

      expect(install.offer()).toBeUndefined();
    });

    it('offers the install dialog, and keeps the browser from showing its own bar', () => {
      const win = fakeWindow({ userAgent: ANDROID });
      const install = visit(win);
      const event = installable();

      win.dispatchEvent(event);

      expect(install.offer()).toBe('prompt');
      expect(event.defaultPrevented).toBeTrue();
    });

    it('opens the browser dialog on install, and has nothing left to offer after', async () => {
      const win = fakeWindow({ userAgent: ANDROID });
      const install = visit(win);
      const event = installable('accepted');
      win.dispatchEvent(event);

      await install.install();

      expect(event.prompt).toHaveBeenCalledTimes(1);
      expect(install.offer()).toBeUndefined();
    });

    it('takes a "no" in the browser dialog as a dismissal', async () => {
      const storage = memoryStorage();
      const win = fakeWindow({ userAgent: ANDROID, storage });
      const install = visit(win);
      win.dispatchEvent(installable('dismissed'));

      await install.install();
      // Chromium may say "installable" again later in the same visit.
      win.dispatchEvent(installable());

      expect(install.offer()).toBeUndefined();
      expect(storage.getItem(DISMISSED_AT_KEY)).not.toBeNull();
    });

    it('stops offering once the app is installed', () => {
      const win = fakeWindow({ userAgent: ANDROID });
      const install = visit(win);
      win.dispatchEvent(installable());

      win.dispatchEvent(new Event('appinstalled'));

      expect(install.offer()).toBeUndefined();
    });

    it('offers nothing when it already runs as the installed app', () => {
      const win = fakeWindow({ userAgent: ANDROID, displayStandalone: true });
      const install = visit(win);

      win.dispatchEvent(installable());

      expect(install.offer()).toBeUndefined();
    });
  });

  describe('on iOS', () => {
    it('offers the manual steps at once: Safari has no install dialog', () => {
      const install = visit(fakeWindow({ userAgent: IPHONE }));

      expect(install.offer()).toBe('ios-guide');
    });

    it('recognises an iPad, which introduces itself as a Mac with a touch screen', () => {
      const install = visit(
        fakeWindow({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5 })
      );

      expect(install.offer()).toBe('ios-guide');
    });

    it('offers nothing when opened from the home screen', () => {
      const install = visit(
        fakeWindow({ userAgent: IPHONE, standalone: true })
      );

      expect(install.offer()).toBeUndefined();
    });
  });

  describe('on a computer', () => {
    it('leaves the install to the browser: no banner, and its own button untouched', () => {
      const win = fakeWindow({ userAgent: WINDOWS });
      const install = visit(win);
      const event = installable();

      win.dispatchEvent(event);

      expect(install.offer()).toBeUndefined();
      expect(event.defaultPrevented).toBeFalse();
    });

    it('does not take a real Mac for an iPad', () => {
      const install = visit(
        fakeWindow({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })
      );

      expect(install.offer()).toBeUndefined();
    });
  });

  describe('after a dismissal', () => {
    it('hides the offer at once', () => {
      const install = visit(fakeWindow({ userAgent: IPHONE }));

      install.dismiss();

      expect(install.offer()).toBeUndefined();
    });

    it('stays quiet on later visits while the snooze lasts', () => {
      const storage = memoryStorage();
      visit(fakeWindow({ userAgent: IPHONE, storage })).dismiss();

      jasmine.clock().tick(SNOOZE_MS - 1);
      const nextVisit = visit(fakeWindow({ userAgent: IPHONE, storage }));

      expect(nextVisit.offer()).toBeUndefined();
    });

    it('offers again once the snooze is over', () => {
      const storage = memoryStorage();
      visit(fakeWindow({ userAgent: IPHONE, storage })).dismiss();

      jasmine.clock().tick(SNOOZE_MS);
      const nextVisit = visit(fakeWindow({ userAgent: IPHONE, storage }));

      expect(nextVisit.offer()).toBe('ios-guide');
    });

    it('still hides the offer for this visit when storage is blocked', () => {
      const install = visit(
        fakeWindow({ userAgent: IPHONE, storage: blockedStorage() })
      );
      expect(install.offer()).toBe('ios-guide');

      install.dismiss();

      expect(install.offer()).toBeUndefined();
    });
  });

  it('offers nothing while rendering on the server, and never asks for a window', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: WINDOW,
          useFactory: () => {
            throw new Error('There is no window on the server');
          },
        },
      ],
    });

    expect(TestBed.inject(InstallPrompt).offer()).toBeUndefined();
  });
});
