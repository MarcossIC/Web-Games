import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ACTION } from '@app/data/models/snakeling/Actions';
import { SeoService } from '@app/data/services/seo.service';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { destroy, fillMatrix, ramdomNumber } from '@app/data/services/util.service';
import { ACTIONS, BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN, NEXT_POSITION, NOT_MOVE, PREVIOUS_POSITION } from 'assets/constants/snakeling';
import { Observable, Subscription, fromEvent, interval, throttleTime } from 'rxjs';

@Component({
  selector: 'app-snakeling',
  templateUrl: './snakeling.component.html',
  styleUrls: ['./snakeling.component.css']
})
export class SnakelingComponent implements OnInit, OnDestroy {

  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  private renderer: Renderer2 = inject(Renderer2);
  protected controller: SnakelingControllerService = inject(SnakelingControllerService);
  protected seo = inject(SeoService);
  protected title = inject(Title);
  private router = inject(Router);
  
  private moveListener$!: Subscription;
  private destroy$ = destroy();
  private cronometro$: Observable<number>;
  private timer$!: Subscription;
  


  constructor() { 
    this.cronometro$ = interval(180);
  }

  ngOnInit(): void {
    this.title.setTitle("Snake Game");
    this.seo.generateTags({
      title: "Snake Game",
      description: "Page to play a clasic snake Game",
      slug: "snakeling"
    });


    const boardDiv = this.renderer.selectRootElement(this.boardRef.nativeElement);
    this.controller.initGame(boardDiv, this.renderer);

    const keyboardEvents$ = fromEvent<KeyboardEvent>(window, 'keydown');
    const throttleDuration = 81;

    this.moveListener$ = keyboardEvents$
      .pipe(throttleTime(throttleDuration))
      .pipe(this.destroy$())
      .subscribe((event: any) => {
        this.controller.executeAction(event.key);
      });

    this.timer$ = this.cronometro$.pipe(this.destroy$()).subscribe(() => {
        this.controller.runGame();
    });
  }
  
  ngOnDestroy(): void {
    this.moveListener$.unsubscribe();
    this.timer$.unsubscribe();
  }

  onPress(key: string){
    this.controller.executeAction(key);
  }

  close(): void {
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  playGame(): void{
    this.controller.executeAction('p');
  }

  playAgain(): void{
    this.controller.reset();
  }
}
