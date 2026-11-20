import { count, defineEntry } from '@app-persistence';

export interface InstallPromptSaves {
  /** When the visitor last said no to installing, in ms since the epoch; 0 = never. */
  dismissedAt: number;
}

/** What the install suggestion remembers between visits. */
export const installPromptSaves = defineEntry<InstallPromptSaves>({
  game: 'app',
  name: 'install-prompt',
  version: 1,
  fallback: { dismissedAt: 0 },
  fields: { dismissedAt: count() },
});
