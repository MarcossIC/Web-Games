import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'select-modal-ttt',
  templateUrl: './select-modal-ttt.component.html',
  styleUrls: ['./select-modal-ttt.component.css', '../../../shared/styles/modal.css']
})
export class SelectModalTttComponent implements OnInit {
  protected controller: TicTacToeControllerService = inject(TicTacToeControllerService);
  private router = inject(Router);
  
  constructor() { }

  ngOnInit(): void {
  }

  protected playGame(): void {
    this.controller.initGame();
  }

  protected close(): void{
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  protected updatePlayer(event: any): void{
    const playWithOPlayer = event.target.checked;

    if(!playWithOPlayer){
      this.controller.updateMainPlayer(Player.X);
      this.controller.updateSecondPlayer(Player.O);
    }
    if(playWithOPlayer){
      this.controller.updateMainPlayer(Player.O);
      this.controller.updateSecondPlayer(Player.X);
    }
  }

  protected activateSecondPlayer(event: any): void{
    this.controller.changeBotState();
    this.controller.isBotPlaying();
  }

  protected selectBotLevel(botLevel: number){
    let bot = BotLevel.ROCKIE;
    if(botLevel === 2) bot = BotLevel.NOVICE;
    if(botLevel === 3) bot = BotLevel.MASTER;


    this.controller.updateBotLevel(bot);
  }
}
