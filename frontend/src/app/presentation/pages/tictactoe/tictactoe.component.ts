import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { SeoService } from '@app/data/services/seo.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { destroy, fillMatrix } from '@app/data/services/util.service';
import { delay, throttleTime } from 'rxjs';

@Component({
  selector: 'app-tictactoe',
  templateUrl: './tictactoe.component.html',
  styleUrls: ['./tictactoe.component.css']
})
export class TictactoeComponent implements OnInit {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  protected controller: TicTacToeControllerService = inject(TicTacToeControllerService);

  private seo = inject(SeoService);
  private title = inject(Title);
  private router = inject(Router);
  private destroy$ = destroy();
  
  constructor() { }
  ngOnInit(): void {
    this.title.setTitle("Tic Tac Toe Game");
    this.seo.generateTags({
      title: "Tic Tac Toe Game",
      description: "Page to play a Tic Tac Toe Game",
      slug: "tictactoc"
    }); 

    this.controller._notifyBot
    .pipe(this.destroy$(), delay(500))
    .subscribe(()=>this.controller.playBot());
  }


  protected cellSelected(row: number, cell: number): void {
    if(!this.controller.isOccupied(row, cell)) {
      setTimeout(() => {
        this.controller.runGame(row, cell);
      }, 120);
    }
  }
}
