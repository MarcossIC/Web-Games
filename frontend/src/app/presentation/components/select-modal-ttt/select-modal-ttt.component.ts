import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { PixelEmblemComponent } from '@app-components/pixel-emblem/pixel-emblem.component';
import { TttMarkComponent } from '@app-components/ttt-mark/ttt-mark.component';

/** 8x8 pixel portraits, in the palette of PixelEmblemComponent. */
const FRIEND_FACE =
  '..OOOO..' +
  '.OOOOOO.' +
  '.OWOOWO.' +
  '.OOOOOO.' +
  '..OMMO..' +
  '...OO...' +
  '.BBBBBB.' +
  'BBBBBBBB';

/** `E` marks the eyes: they take a color per level. */
const BOT_FACE =
  '...P....' +
  '.PPPPPP.' +
  '.P....P.' +
  '.PE..EP.' +
  '.P....P.' +
  '.P.WW.P.' +
  '.PPPPPP.' +
  '..P..P..';

/** Palette key of the bot's eyes at each level: green, yellow, red. */
const BOT_EYES: Record<number, string> = { 1: 'G', 2: 'Y', 3: 'R' };

@Component({
  standalone: true,
  imports: [CommonModule, PixelEmblemComponent, TttMarkComponent],
  selector: 'select-modal-ttt',
  templateUrl: './select-modal-ttt.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './select-modal-ttt.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectModalTttComponent {
  protected controller: TicTacToeControllerService = inject(
    TicTacToeControllerService
  );
  private router = inject(Router);

  protected readonly FRIEND_FACE = FRIEND_FACE;

  protected get playsO(): boolean {
    return this.controller.mainPlayerPlaysWithO();
  }

  protected get bot(): boolean {
    return this.controller.isBotPlaying();
  }

  /** 1 Rookie, 2 Normal, 3 Master. */
  protected get level(): number {
    if (this.controller.botIsMaster()) return 3;
    if (this.controller.botIsNovice()) return 2;
    return 1;
  }

  protected get botFace(): string {
    return BOT_FACE.split('E').join(BOT_EYES[this.level]);
  }
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  constructor() {
    // The defaults are a valid game, so Enter can start it right away.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected playGame(): void {
    this.controller.initGame();
  }

  protected close(): void {
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  /** The other player always gets the mark the main player did not take. */
  protected choosePlayer(playsWithO: boolean): void {
    this.controller.updateMainPlayer(playsWithO ? Player.O : Player.X);
    this.controller.updateSecondPlayer(playsWithO ? Player.X : Player.O);
  }

  protected chooseOpponent(bot: boolean): void {
    // The controller only knows how to flip the bot, so flip it only
    // when the choice is different from what it already has.
    if (this.controller.isBotPlaying() !== bot) this.controller.changeBotState();
  }

  protected selectBotLevel(botLevel: number) {
    let bot = BotLevel.ROCKIE;
    if (botLevel === 2) bot = BotLevel.NOVICE;
    if (botLevel === 3) bot = BotLevel.MASTER;

    this.controller.updateBotLevel(bot);
  }
}
