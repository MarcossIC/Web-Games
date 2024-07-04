import {
  ChangeDetectorRef,
  Injectable,
  Renderer2,
  inject,
} from '@angular/core';
import { TOTAL_CARDS } from 'assets/constants/memorama';
import { ramdomNumber } from '../util.service';
import { CardDiv } from '@app/data/models/memorama/CardDiv';
import { ChronometerServiceService } from '../chronometerService.service';
import { delay, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class MemoramaControllerService {
  public currentMove: number;
  public valueUsed: number[];
  public selectedCards: CardDiv[];
  public currentAttempts: number;
  public success: number;
  public isGameOver: boolean;
  public isWin: boolean = true;
  public isPaused: boolean;
  private chronometerService = inject(ChronometerServiceService);
  private cdr = inject(ChangeDetectorRef);
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

  /**
   * Maneja el evento de clic en una carta, actualiza el estado de la carta seleccionada y llama a `updateCardsState` para evaluar el estado del juego.
   * Esta función asegura que solo se puede seleccionar una carta si no se ha alcanzado el límite de movimientos permitidos y si el juego no está terminado ni pausado.
   *
   * @param renderer - El Renderer2 para manipular el DOM.
   * @param event - El objeto del evento del clic que contiene la carta seleccionada.
   *
   * @description
   * 1. Verifica que el número de movimientos actuales sea menor a 2, el juego no esté terminado y no esté pausado.
   * 2. Obtiene el elemento HTML de la carta clicada y su contenido.
   * 3. Asegura que la carta no esté ya seleccionada ni tenga la clase `active`.
   * 4. Agrega la clase `active` al contenido de la carta seleccionada y elimina la clase `rotate` de la carta.
   * 5. Añade la carta seleccionada al array `selectedCards`.
   * 6. Llama a `updateCardsState` para manejar el estado de las cartas seleccionadas y verificar si el juego ha terminado.
   */
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

  /**
   * Actualiza el estado de las cartas basándose en el número de movimientos realizados.
   * Incrementa el número de intentos y maneja el estado de las cartas seleccionadas según si son iguales o no.
   *
   * @param renderer - El Renderer2 para manipular el DOM.
   *
   * @description
   * 1. Incrementa el contador de movimientos actuales (`this.currentMove`).
   * 2. Cuando se han realizado 2 movimientos, incrementa el contador de intentos (`this.currentAttempts`).
   * 3. Verifica si las cartas seleccionadas son iguales:
   *    - Si son iguales, llama a `handleMatchedCards()` para manejar el emparejamiento exitoso de cartas.
   *    - Si no son iguales, llama a `handleUnmatchedCards(renderer)` para manejar el caso en el que las cartas no coinciden.
   */
  public updateCardsState(renderer: Renderer2) {
    this.currentMove++;
    if (this.currentMove !== 2) return;

    this.currentAttempts++;

    if (this.cardsAreEven()) {
      this.handleMatchedCards();
    } else {
      this.handleUnmatchedCards(renderer);
    }
  }

  /**
   * Maneja el caso en el que las dos cartas seleccionadas son iguales.
   * Actualiza el estado del juego para reflejar el emparejamiento exitoso de las cartas.
   */
  private handleMatchedCards() {
    this.selectedCards = [];
    this.currentMove = 0;
    this.success++;
    if (this.isTheEndGame()) {
      this.endGame();
    }
  }

  /**
   * Maneja el caso en el que las dos cartas seleccionadas no son iguales.
   * Revierte el estado de las cartas seleccionadas después de un breve retraso.
   *
   * @param renderer - El Renderer2 para manipular el DOM.
   */
  private handleUnmatchedCards(renderer: Renderer2) {
    of(null)
      .pipe(delay(450), take(1))
      .subscribe(() => {
        this.deactivateCards(renderer);
        this.resetMove();
        this.cdr.detectChanges();
      });
  }

  private deactivateCards(renderer: Renderer2) {
    renderer.removeClass(this.selectedCards[0].content, 'active');
    renderer.removeClass(this.selectedCards[1].content, 'active');
    renderer.addClass(this.selectedCards[0].card, 'rotate');
    renderer.addClass(this.selectedCards[1].card, 'rotate');
  }

  private resetMove() {
    this.selectedCards = [];
    this.currentMove = 0;
  }

  private endGame() {
    this.isWin = true;
    this.isGameOver = true;
    this.chronometerService.updated.next({
      gameOver: this.isGameOver,
      isPaused: this.isPaused,
    });
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
