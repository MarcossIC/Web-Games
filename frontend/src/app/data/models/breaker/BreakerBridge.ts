/**
 * What the Angular page and the Phaser scenes of Nova Breaker say to each
 * other through the shared EventBus (`@app/data/services/phaser/EventBus`).
 *
 * The page owns the flow (How to play, pause, game over) and the keys that
 * drive it (P, Esc). The scene owns the run: it only plays while the page
 * lets it, and it reports what the page has to show.
 */
export enum BreakerBridgeEvents {
  // ---- Page -> scene
  /** Start the run (first time) or resume it after a pause. */
  PLAY = 'breaker-play',
  /** Freeze the run: simulation, tweens and particles. */
  PAUSE = 'breaker-pause',
  /** Throw the run away and start a new one from sector 1, playing at once. */
  RESTART = 'breaker-restart',
  /** Payload: boolean. Mute or unmute every sound. */
  SET_MUTED = 'breaker-set-muted',

  // ---- Scene -> page
  /** The textures are built and the first sector is drawn, waiting for PLAY. */
  READY = 'breaker-ready',
  /** The window lost focus or the tab was hidden while playing. */
  AUTO_PAUSED = 'breaker-auto-paused',
  /** The last life is gone: GAME_OVER follows after a short delay, and the run can no longer be paused. */
  RUN_ENDING = 'breaker-run-ending',
  /** Payload: RunSummary (from engine/types). No lives left. */
  GAME_OVER = 'breaker-game-over',
}
