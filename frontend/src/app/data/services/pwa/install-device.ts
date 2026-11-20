/** What the install checks need from window. */
export interface InstallHost {
  navigator?: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
    /** Safari's own flag for a page opened from the home screen. */
    standalone?: boolean;
  };
  matchMedia?: (query: string) => { matches: boolean };
}

/**
 * The devices the install banner cares about. On anything else the browser
 * already shows its own install button, so the site stays out of the way.
 */
export type InstallDevice = 'android' | 'ios' | 'other';

export function installDevice(host: InstallHost | undefined): InstallDevice {
  const navigator = host?.navigator;
  const agent = navigator?.userAgent ?? '';

  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
  // iPadOS introduces itself as a Mac: only the touch screen gives it away.
  if (
    navigator?.platform === 'MacIntel' &&
    (navigator.maxTouchPoints ?? 0) > 1
  ) {
    return 'ios';
  }
  if (/Android/i.test(agent)) return 'android';
  return 'other';
}

/** True when the page already runs as the installed app. */
export function runsInstalled(host: InstallHost | undefined): boolean {
  if (host?.navigator?.standalone) return true;
  try {
    return host?.matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}
