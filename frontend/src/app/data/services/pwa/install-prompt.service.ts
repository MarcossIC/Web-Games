import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { WINDOW } from '@app-services/Window.service';
import { GAME_STORE } from '@app-persistence';
import { installDevice, runsInstalled } from './install-device';
import { installPromptSaves } from './pwa-saves';

/**
 * What the site can offer a visitor who has not installed it:
 * - `prompt`: the browser's own install dialog (Chromium on Android).
 * - `ios-guide`: the steps to add it by hand. No browser on iOS has an
 *   install dialog a page can open.
 */
export type InstallOffer = 'prompt' | 'ios-guide';

/** Chromium's "this page can be installed" event; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** How long a "no" is respected before the site offers again. */
export const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Decides whether to suggest installing the site, and carries out the
 * answer. Phones and tablets only: on a computer the browser shows its own
 * install button in the address bar, and that one is left alone.
 */
@Injectable({ providedIn: 'root' })
export class InstallPrompt {
  private readonly host = isPlatformBrowser(inject(PLATFORM_ID))
    ? inject(WINDOW)
    : undefined;
  private readonly device = installDevice(this.host);
  private readonly store = inject(GAME_STORE);

  /** The browser's install event, kept until the visitor answers. */
  private readonly pending = signal<BeforeInstallPromptEvent | undefined>(
    undefined
  );
  private readonly hidden = signal(true);

  /** What to offer right now, or undefined for nothing. */
  readonly offer = computed<InstallOffer | undefined>(() => {
    if (this.hidden()) return undefined;
    if (this.device === 'ios') return 'ios-guide';
    return this.pending() ? 'prompt' : undefined;
  });

  constructor() {
    const host = this.host;
    if (!host || this.device === 'other' || runsInstalled(host)) return;

    this.hidden.set(this.isSnoozed());

    host.addEventListener('beforeinstallprompt', (event) => {
      // Android would open a bar of its own here, even after a "no" to ours.
      event.preventDefault();
      this.pending.set(event as BeforeInstallPromptEvent);
    });
    host.addEventListener('appinstalled', () => this.hidden.set(true));
  }

  /** Opens the browser's install dialog and waits for the answer. */
  async install(): Promise<void> {
    const event = this.pending();
    if (!event) return;

    // The browser lets each event open its dialog only once.
    this.pending.set(undefined);
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'dismissed') this.dismiss();
  }

  dismiss(): void {
    this.hidden.set(true);
    // Where the storage is blocked, the store keeps it for this visit only.
    installPromptSaves.write(this.store, { dismissedAt: Date.now() });
  }

  private isSnoozed(): boolean {
    const at = installPromptSaves.read(this.store).dismissedAt;
    return at > 0 && Date.now() - at < SNOOZE_MS;
  }
}
