import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { SeoService } from '@app/data/services/seo.service';
import { fillArray } from '@app/data/services/util.service';
import { TOTAL_CARDS } from 'assets/constants/memorama';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-memorama',
  templateUrl: './memorama.component.html',
  styleUrls: ['./memorama.component.css'],
})
export class MemoramaComponent implements OnInit, OnDestroy, AfterViewInit {
  protected intervalSubscribe: Subscription;
  protected renderer: Renderer2 = inject(Renderer2);
  protected controller: MemoramaControllerService = inject(
    MemoramaControllerService
  );
  protected seo = inject(SeoService);
  protected title = inject(Title);
  public cards: number[];

  constructor() {
    this.intervalSubscribe = new Subscription();
    this.cards = fillArray(TOTAL_CARDS, 0);
  }

  ngAfterViewInit(): void {
    const gameCards = document.querySelectorAll('.game .game-card');
    gameCards.forEach((card: any) => {
      const content = card.querySelector('.content') as HTMLElement;
      this.controller.cards.push({ card, content });
    });
  }

  ngOnInit(): void {
    this.controller.valueUsed = [];
    this.cards.forEach(() => this.controller.ramdomValues());
    this.veriftGameTime();
  }

  private veriftGameTime(): void {
    // Llama a tu función cada segundo (puedes ajustar el valor según tus necesidades)
    this.intervalSubscribe = interval(1000).subscribe(() =>
      this.controller.verifyTime()
    );
  }

  ngOnDestroy(): void {
    this.intervalSubscribe.unsubscribe();
  }
}
