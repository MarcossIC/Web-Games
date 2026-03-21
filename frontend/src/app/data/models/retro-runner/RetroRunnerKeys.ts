export enum RetroRunnerKey {
  WALK_KEY = 'runnerWalking',
  RUN_KEY = 'runnerRunning',
  JUMP_KEY = 'runnerJumping',
  IDLE_KEY = 'runnerIdle',
  DEAD_KEY = 'runnerDead',
  DOWN_KEY = 'runnerDown',
  COIN_ANIM = 'coinSpin',
  STAR_ANIM = 'starSpin',
  CHEST_ANIM = 'chestOpen',
  FLAG_ANIM = 'flagWave',

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
  OVERWORLD_THEME = 'overworldTheme',
  COIN_SOUND = 'coinSound',

  FLOORGRASS_START = 'floorgrassST1',
  FLOORGRASS_CENTER = 'floorgrassCE1',
  FLOORGRASS_END = 'floorgrassEN1',
  FLOORGRASS_SMALL = 'floorgrassSmall',
  GRASS_BLOCK = 'grassBlock',

  // Decorative grass (1-24)
  NATURA_GRASS_ON = 'grass1',
  NATURA_GRASS_TW = 'grass2',
  NATURA_GRASS_TH = 'grass3',
  NATURA_GRASS_FO = 'grass4',
  NATURA_GRASS_FI = 'grass5',
  GRASS_6 = 'grass6',
  GRASS_7 = 'grass7',
  GRASS_8 = 'grass8',
  GRASS_9 = 'grass9',
  GRASS_10 = 'grass10',
  GRASS_11 = 'grass11',
  GRASS_12 = 'grass12',
  GRASS_13 = 'grass13',
  GRASS_14 = 'grass14',
  GRASS_15 = 'grass15',
  GRASS_16 = 'grass16',
  GRASS_17 = 'grass17',
  GRASS_18 = 'grass18',
  GRASS_19 = 'grass19',
  GRASS_20 = 'grass20',
  GRASS_21 = 'grass21',

  CLOUD_1 = 'cloud1',
  CLOUD_2 = 'cloud2',
  MOUNTAIN_1 = 'mountain1',
  MOUNTAIN_2 = 'mountain2',

  // Stones (obstacles) 1-11
  STONE_1 = 'stone1',
  STONE_2 = 'stone2',
  STONE_3 = 'stone3',
  STONE_4 = 'stone4',
  STONE_5 = 'stone5',
  STONE_6 = 'stone6',
  STONE_7 = 'stone7',
  STONE_8 = 'stone8',
  STONE_9 = 'stone9',
  STONE_10 = 'stone10',
  STONE_11 = 'stone11',

  // Bushes 1-15
  BUSH_1 = 'bush1',
  BUSH_2 = 'bush2',
  BUSH_3 = 'bush3',
  BUSH_4 = 'bush4',
  BUSH_5 = 'bush5',
  BUSH_6 = 'bush6',
  BUSH_7 = 'bush7',
  BUSH_8 = 'bush8',
  BUSH_9 = 'bush9',
  BUSH_10 = 'bush10',
  BUSH_11 = 'bush11',
  BUSH_12 = 'bush12',
  BUSH_13 = 'bush13',
  BUSH_14 = 'bush14',

  // Trees 1-9
  TREE_1 = 'tree1',
  TREE_2 = 'tree2',
  TREE_3 = 'tree3',
  TREE_4 = 'tree4',
  TREE_5 = 'tree5',
  TREE_6 = 'tree6',
  TREE_7 = 'tree7',
  TREE_8 = 'tree8',
  TREE_9 = 'tree9',

  // Willows 1-3
  WILLOW_1 = 'willow1',
  WILLOW_2 = 'willow2',
  WILLOW_3 = 'willow3',

  // Fences 1-6
  FENCE_1 = 'fence1',
  FENCE_2 = 'fence2',
  FENCE_3 = 'fence3',
  FENCE_4 = 'fence4',
  FENCE_5 = 'fence5',
  FENCE_6 = 'fence6',

  // Ridges 1-6
  RIDGE_1 = 'ridge1',
  RIDGE_2 = 'ridge2',
  RIDGE_3 = 'ridge3',
  RIDGE_4 = 'ridge4',
  RIDGE_5 = 'ridge5',
  RIDGE_6 = 'ridge6',

  // Boxes 1-8
  BOX_1 = 'box1',
  BOX_2 = 'box2',
  BOX_3 = 'box3',
  BOX_4 = 'box4',
  BOX_5 = 'box5',
  BOX_6 = 'box6',
  BOX_7 = 'box7',
  BOX_8 = 'box8',

  // Pointers 1-17
  POINTER_1 = 'pointer1',
  POINTER_2 = 'pointer2',
  POINTER_3 = 'pointer3',
  POINTER_4 = 'pointer4',
  POINTER_5 = 'pointer5',
  POINTER_6 = 'pointer6',
  POINTER_7 = 'pointer7',
  POINTER_8 = 'pointer8',
  POINTER_9 = 'pointer9',
  POINTER_10 = 'pointer10',
  POINTER_11 = 'pointer11',
  POINTER_12 = 'pointer12',
  POINTER_13 = 'pointer13',
  POINTER_14 = 'pointer14',
  POINTER_15 = 'pointer15',
  POINTER_16 = 'pointer16',
  POINTER_17 = 'pointer17',

  // Ladder 1-3 (with variants)
  LADDER_1 = 'ladder1',
  LADDER_1B = 'ladder1b',
  LADDER_2 = 'ladder2',
  LADDER_2B = 'ladder2b',
  LADDER_3 = 'ladder3',
  LADDER_3B = 'ladder3b',

  // Fishing / water theme
  BOAT_1 = 'boat1',
  BOAT_2 = 'boat2',
  FISH_1 = 'fish1',
  FISH_2 = 'fish2',
  FISH_3 = 'fish3',
  FISH_4 = 'fish4',
  FISH_5 = 'fish5',
  FISH_6 = 'fish6',
  FISH_7 = 'fish7',
  FISH_8 = 'fish8',
  FISHBARREL_1 = 'fishbarrel1',
  FISHBARREL_2 = 'fishbarrel2',
  FISHBARREL_3 = 'fishbarrel3',
  FISHBARREL_4 = 'fishbarrel4',
  FISHING_HUT = 'fishingHut',

  HOUSE = 'house1',

  // Animated spritesheets
  COIN_SPRITE = 'coinSprite',
  STAR_SPRITE = 'starSprite',
  CHEST_SPRITE = 'chestSprite',
  FLAG_SPRITE = 'flagSprite',
  FLAGPOLE_SPRITE = 'flagpoleSprite',
  KEY_SPRITE = 'keySprite',

  // Parallax layers
  LAYER_SKY = 'layerSky',
  LAYER_CLOUDS = 'layerClouds',
  LAYER_MOUNTAINS = 'layerMountains',
  LAYER_GRASS_FAR = 'layerGrassFar',
  LAYER_GRASS_NEAR = 'layerGrassNear',
  LAYER_2 = 'layer2',
  LAYER_7 = 'layer7',

  BG_ALT = 'bgAlt',
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
