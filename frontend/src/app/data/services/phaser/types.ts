import { Sound, Types } from 'phaser';

export type PhaserSound =
  | Sound.NoAudioSound
  | Sound.HTML5AudioSound
  | Sound.WebAudioSound;

export type PhaserPlayerWithBody = Types.Physics.Arcade.SpriteWithDynamicBody;
