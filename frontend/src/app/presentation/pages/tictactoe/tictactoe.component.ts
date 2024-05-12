import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { SeoService } from '@app/data/services/seo.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { destroy } from '@app/data/services/util.service';
import { delay } from 'rxjs';

@Component({
  selector: 'app-tictactoe',
  templateUrl: './tictactoe.component.html',
  styleUrls: ['./tictactoe.component.css'],
})
export class TictactoeComponent implements OnInit {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  protected controller: TicTacToeControllerService = inject(
    TicTacToeControllerService
  );

  private seo = inject(SeoService);
  private router = inject(Router);
  private destroy$ = destroy();

  constructor() {}
  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Tic Tac Toe Game',
      description: 'Page to play a Tic Tac Toe Game',
      slug: 'tictactoc',
    });

    this.controller._notifyBot
      .pipe(this.destroy$(), delay(500))
      .subscribe(() => this.controller.playBot());
  }

  protected cellSelected(row: number, cell: number): void {
    if (!this.controller.isOccupied(row, cell)) {
      setTimeout(() => {
        this.controller.runGame(row, cell);
      }, 120);
    }
  }
}
