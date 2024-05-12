import { Injectable, Renderer2, inject } from '@angular/core';
import { TOTAL_CARDS } from 'assets/constants/memorama';
import { ramdomNumber } from '../util.service';
import { CardDiv } from '@app/data/models/memorama/CardDiv';
import { ChronometerServiceService } from '../chronometerService.service';

@Injectable({
  providedIn: 'root',
})
export class MemoramaControllerService {
  public currentMove: number;
  public valueUsed: number[];
  public selectedCards: CardDiv[];
  public currentAttempts: number;
  public success: number;
  public isGameOver: boolean;
  public isWin: boolean = true;
  public isPaused: boolean;
  private chronometerService: ChronometerServiceService = inject(
    ChronometerServiceService
  );
  public gameContainer!: HTMLElement;
  public cards: CardDiv[] = [];

  constructor() {
    this.currentMove = 0;
    this.currentAttempts = 0;
    this.success = 0;
    this.valueUsed = [];
    this.selectedCards = [];
    this.isGameOver = false;
    this.isPaused = true;
  }

  public verifyTime(): void {
    if (this.chronometerService.minutes >= 1) {
      this.isGameOver = true;
      this.isWin = false;
      this.chronometerService.minutes = 0;
      this.chronometerService.updated.next({
        gameOver: this.isGameOver,
        isPaused: this.isPaused,
      });
    }
  }

  public resetCardsClass(renderer: Renderer2) {
    this.cards.forEach(({ card, content }) => {
      renderer.removeClass(content, 'active');
      renderer.addClass(card, 'rotate');
    });
  }

  public resetGame(renderer: Renderer2): void {
    this.currentAttempts = 0;
    this.success = 0;
    this.resetCardsClass(renderer);
    this.isGameOver = false;
    this.resume();
    this.chronometerService.updated.next({
      gameOver: this.isGameOver,
      isPaused: this.isPaused,
    });
  }

  public play(renderer: Renderer2, event: any) {
    if (this.currentMove < 2 && !this.isGameOver && !this.isPaused) {
      const card = event.currentTarget as HTMLElement;
      const content = card.querySelectorAll('.content')[0] as HTMLElement;

      if (
        (!this.selectedCards[0] || this.selectedCards[0].card !== card) &&
        !content.classList.contains('active')
      ) {
        renderer.addClass(content, 'active');
        renderer.removeClass(card, 'rotate');
        this.selectedCards.push({ card, content });

        this.updateCardsState(renderer);
      }
    }
  }

  public updateCardsState(renderer: Renderer2) {
    if (++this.currentMove == 2) {
      this.currentAttempts++;

      if (this.cardsAreEven()) {
        this.selectedCards = [];
        this.currentMove = 0;
        this.success++;

        if (this.isTheEndGame()) {
          this.isWin = true;
          this.isGameOver = true;
          this.chronometerService.updated.next({
            gameOver: this.isGameOver,
            isPaused: this.isPaused,
          });
        }
      } else {
        setTimeout(() => {
          renderer.removeClass(this.selectedCards[0].content, 'active');
          renderer.removeClass(this.selectedCards[1].content, 'active');
          renderer.addClass(this.selectedCards[0].card, 'rotate');
          renderer.addClass(this.selectedCards[1].card, 'rotate');
          this.selectedCards = [];
          this.currentMove = 0;
        }, 450);
      }
    }
  }

  private cardsAreEven(): boolean {
    return (
      this.selectedCards[0].card.querySelectorAll('.face')[0].textContent ===
      this.selectedCards[1].card.querySelectorAll('.face')[0].textContent
    );
  }

  public isTheEndGame(): boolean {
    return this.cards.every((card) =>
      card.content.classList.contains('active')
    );
  }

  public ramdomValues(): void {
    const ramdomValue = ramdomNumber(false, TOTAL_CARDS * 0.5);
    let values = this.valueUsed.filter((value) => value === ramdomValue);
    if (values.length < 2) {
      this.valueUsed.push(ramdomValue);
    } else {
      this.ramdomValues();
    }
  }

  public resume(): void {
    this.isPaused = false;
    this.chronometerService.updated.next({
      gameOver: this.isGameOver,
      isPaused: this.isPaused,
    });
  }
  public pause(): void {
    this.isPaused = true;
    this.chronometerService.updated.next({
      gameOver: this.isGameOver,
      isPaused: this.isPaused,
    });
  }
}
