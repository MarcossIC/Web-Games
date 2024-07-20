export enum RetroRunnerKey {
  WALK_KEY = 'runnerWalking',
  RUN_KEY = 'runnerRunning',
  JUMP_KEY = 'runnerJumping',
  IDLE_KEY = 'runnerIdle',
  DEAD_KEY = 'runnerDead',
  DOWN_KEY = 'runnerDown',

  RUNNER = 'runner',
}

export enum RetroRunnerMedia {
  FLOORBRICKS_DEFAULT = 'floorbricksDefault',
  CLOUD_DEFAULT = 'cloudDefault',
  GAMEOVER_SOUND = 'gameover',
  CAPIBARA_SOUND = 'capiBaraGameover',
  NATURA_BACKGROUND = 'naturaBg',
  BIT_JUMP = '8bitJumpping',
  WOOSH_JUMP = 'wooshJumpping',

  FLOORGRASS_START = 'floorgrassST1',
  FLOORGRASS_CENTER = 'floorgrassCE1',
  FLOORGRASS_END = 'floorgrassEN1',
  FLOORGRASS_SMALL = 'floorgrassSmall',
  GRASS_BLOCK = 'grassBlock',
}

export enum RetroRunnerStates {
  RUNNER_STATE_IDLE = 0,
  RUNNER_STATE_DEAD = 1,
  RUNNER_STATE_WALK = 2,
  RUNNER_STATE_JUMP = 3,
  RUNNER_STATE_RUNWALK = 4,
  RUNNER_STATE_DOWN = 5,
}

export enum RetroRunnerFloor {
  FLOORGRASS_START_WIDTH = 81,
  FLOORGRASS_CENTER_WIDTH = 65,
  GRASS_BLOCK_WIDTH = 32,
}

export enum PlatformType {
  GRASS_BLOCK = 0,
  FLOOR_GRASS_SMALL = 1,
}
