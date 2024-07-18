export enum RetroRunnerKey {
  WALK_KEY = 'runnerWalking',
  RUN_KEY = 'runnerRunning',
  JUMP_KEY = 'runnerJumping',
  IDLE_KEY = 'runnerIdle',
  DEAD_KEY = 'runnerDead',

  RUNNER = 'runner',
}

export enum RetroRunnerMedia {
  FLOORBRICKS_DEFAULT = 'floorbricksDefault',
  CLOUD_DEFAULT = 'cloudDefault',
  GAMEOVER_SOUND = 'gameover',
  NATURA_BACKGROUND = 'naturaBg',

  FLOORGRASS_START = 'floorgrassST1',
  FLOORGRASS_CENTER = 'floorgrassCE1',
  FLOORGRASS_END = 'floorgrassEN1',
}

export enum RetroRunnerStates {
  RUNNER_STATE_IDLE = 0,
  RUNNER_STATE_DEAD = 1,
  RUNNER_STATE_WALK = 2,
  RUNNER_STATE_JUMP = 3,
  RUNNER_STATE_RUNWALK = 4,
}

export enum FullNaturaFrame {}
