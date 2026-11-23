import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  ChessBotLevel,
  ChessMode,
  ChessSide,
} from '@app/data/models/chess/chess-mode';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';
import {
  CHESS_BOT_LEVELS,
  CHESS_MODES,
  CHESS_SIDES,
} from 'assets/constants/chess';

/**
 * What the dialog shows: the menu, the page that sets up a game against
 * the machine, or the one that explains the game.
 */
export type ChessMenuView = 'menu' | 'machine' | 'help';

/**
 * The menu of the game. On opening it offers the modes; during a game it
 * is the pause menu. Picking the machine leads to its level and the side
 * to play, and both menus lead to a page that explains how to play.
 */
@Component({
  standalone: true,
  imports: [CommonModule, TrapFocusDirective],
  selector: 'welcome-chess-modal',
  templateUrl: './welcome-chessmodal.component.html',
  styleUrls: [
    './welcome-chessmodal.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeChessModal {
  protected controller = inject(ChessController);
  private router = inject(Router);
  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly modes = CHESS_MODES;
  protected readonly levels = CHESS_BOT_LEVELS;
  protected readonly sides = CHESS_SIDES;
  protected readonly view = signal<ChessMenuView>('menu');

  /** The level and side being picked: they start from the last game's. */
  protected readonly level = signal<ChessBotLevel>(
    this.controller.machineSetup().level
  );
  protected readonly side = signal<ChessSide>(this.controller.machineSetup().side);

  /** The level being picked, as a number from 1: how many bars of the meter are lit. */
  protected readonly levelRank = computed(
    () => this.levels.findIndex(({ id }) => id === this.level()) + 1
  );
  protected readonly levelHint = computed(
    () => this.levels.find(({ id }) => id === this.level())?.hint ?? ''
  );

  constructor() {
    // Enter picks the first mode, or resumes, without reaching for the mouse.
    afterNextRender(() => this.focusFirst());
  }

  /** The level last played against the machine, on its card. */
  protected lastLevelName(): string {
    const { level } = this.controller.machineSetup();
    return this.levels.find(({ id }) => id === level)?.name ?? '';
  }

  /** The game that is paused, in a line. */
  protected currentGame(): string {
    if (this.controller.mode !== 'machine') return 'Practice · Both sides';
    const level = this.levels.find(({ id }) => id === this.controller.botLevel);
    const white = this.controller.humanColor === ChessPlayers.WHITE;
    return `Machine · ${level?.name} · You play ${white ? 'White' : 'Black'}`;
  }

  protected pick(mode: ChessMode): void {
    if (mode === 'machine') this.switchTo('machine');
    else this.controller.start('practice');
  }

  protected playMachine(): void {
    this.controller.start('machine', { level: this.level(), side: this.side() });
  }

  protected showHelp(): void {
    this.switchTo('help');
  }

  protected showMenu(): void {
    this.switchTo('menu');
  }

  private switchTo(view: ChessMenuView): void {
    this.view.set(view);
    this.focusAfterRender();
  }

  /** The buttons are new elements once the view changes: focus them then. */
  private focusAfterRender(): void {
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  /** Each view marks the control to start from with `data-autofocus`. */
  private focusFirst(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>('[data-autofocus]')
      ?.focus();
  }

  protected resume(): void {
    this.controller.isPaused = false;
  }

  protected changeMode(): void {
    this.controller.backToMenu();
    this.focusAfterRender();
  }

  protected close(): void {
    this.controller.backToMenu();
    this.router.navigate(['/games']);
  }
}
