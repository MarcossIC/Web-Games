import { Sound } from 'phaser';

export type PhaserSound =
  | Sound.NoAudioSound
  | Sound.HTML5AudioSound
  | Sound.WebAudioSound;
