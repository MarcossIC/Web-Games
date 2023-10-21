import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'endgame-modal-ttt',
  templateUrl: './endgame-modal-ttt.component.html',
  styleUrls: ['./endgame-modal-ttt.component.css', '../../../shared/styles/modal.css']
})
export class EndgameModalTttComponent implements OnInit {
  protected controller: TicTacToeControllerService = inject(TicTacToeControllerService);
  private router = inject(Router);
  
  constructor() { }

  ngOnInit() {
  }


  protected close(): void{
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  protected playAgain(): void {
    this.controller.playAgain();
  }
}
