import { Injectable, inject } from '@angular/core';
import { GameStateService } from './GameState.service';
import { SecondPlayerService } from './SecondPlayer.service';
import { UserPlayerService } from './UserPlayer.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { arrayToMatrix, calcArrayPositionToMatrixCords, findEmptyBoardCells } from '../util.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicTacToeControllerService {
  private gameState: GameStateService = inject(GameStateService);
  private secondPlayer: SecondPlayerService = inject(SecondPlayerService);
  private userPlayer: UserPlayerService = inject(UserPlayerService);
  public _notifyBot: Subject<boolean> = new Subject<boolean>();

  constructor() { 
  }

  public reset(): void{
    this.gameState.resetGameState();
    this.userPlayer.reset();
    this.secondPlayer.reset();
  }

  public playAgain(): void{
    this.gameState.resetGameState();
  } 


  public initGame(): void {
    this.gameState.gameStatus = GameStatus.PLAYING;
    this.gameState.partyStatus = PartyStatus.RUNNING;
    if(this.secondPlayer.isBotPlaying && !this.isTheMainPlayerTurn()) {
      this.notifyBot();
    }
  }

  public runGame(rowX: number, cellY: number): void {
    if(this.partyIsRunning()){
      if(this.secondPlayer.isBotPlaying) {
        this.isTurnForUserPlayer() && this.play(rowX, cellY);
      }

      if(!this.secondPlayer.isBotPlaying)  this.play(rowX, cellY);
    }
  }


  private isTurnForUserPlayer(): boolean{
    return this.gameState.turn === this.userPlayer.getPlayer();
  }
  private play(rowX: number, cellY: number){
    this.gameState.updateBoard(rowX, cellY);

    const isEndGame = this.gameState.isEndGame();

    if(!isEndGame) {
      this.gameState.advanceTurn();
      if(this.secondPlayer.isBotPlaying && !this.isTurnForUserPlayer()){
        this.notifyBot();
      }
    }
    if(isEndGame){
      this.verifyWinner();
      this.gameState.partyStatus = PartyStatus.ENDED;
    }
  }

  private notifyBot(): void {
    this._notifyBot.next(true);
  }

  public playBot(): void{
    const currentBoard = arrayToMatrix( this.gameState.getBoard().flat(), 3, 3 );
    const currentPositons = findEmptyBoardCells(this.gameState.getBoard());
    const currentTurn = this.gameState.turn; 

    let rowX = 0;
    let cellY = 0;    
    if(this.secondPlayer.botAI === BotLevel.ROCKIE) {
      const positionSelected = this.secondPlayer.takeABlindMove({boardScreen: currentBoard, emptyCells: currentPositons, turn: currentTurn});
      const {x, y} = calcArrayPositionToMatrixCords(positionSelected, 3, 3);  
      rowX = y;
      cellY = x;
    }


    if(this.secondPlayer.botAI === BotLevel.NOVICE) {
      const positionSelected =this.secondPlayer.takeANoviceMove({boardScreen: currentBoard, emptyCells: currentPositons, turn: currentTurn});
      const {x, y} = calcArrayPositionToMatrixCords(positionSelected, 3, 3);  
      rowX = y;
      cellY = x;
    }

    if(this.secondPlayer.botAI === BotLevel.MASTER) 
      {
        const positionSelected = this.secondPlayer.takeAMasterMove({boardScreen: currentBoard, emptyCells: currentPositons, turn: currentTurn});
        const {x, y} = calcArrayPositionToMatrixCords(positionSelected, 3, 3);  
        rowX = y;
        cellY = x;
      }

    this.play(rowX, cellY);
  }

  private verifyWinner(): void {
    if(
      this.isOPlayerWinner() && this.mainPlayerPlaysWithO() || 
      this.isXPlayerWinner() && !this.mainPlayerPlaysWithO()
    ) this.userPlayer.win();
    
    if(
      this.isXPlayerWinner() && this.mainPlayerPlaysWithO() || 
      this.isOPlayerWinner() && !this.mainPlayerPlaysWithO()
    ) this.secondPlayer.win();
    
    if(this.isDraw()){ 
      this.secondPlayer.win();
      this.userPlayer.win();
    }
  }
  public get scorePlayerX(): number{
    return this.mainPlayerPlaysWithX()
        ? this.userPlayer.getCountWins()
        : this.secondPlayer.getCountWins();
  }

  public get scorePlayerO(): number{
    return this.mainPlayerPlaysWithO()
        ? this.userPlayer.getCountWins()
        : this.secondPlayer.getCountWins();
  }
  
  public retrieveBoard(): string[][] {
    return this.gameState.getBoard();
  }
  public updateMainPlayer(player: Player): void{
    this.userPlayer.changePlayer(player);
  }

  public updateSecondPlayer(player: Player): void{
    this.secondPlayer.changePlayer(player);
  }

  public isOccupied(rowX: number, cellY: number): boolean {
    return this.gameState.getBoard()[rowX][cellY] !== '0';
  }

  public changeBotState(): void{
    this.secondPlayer.isBotPlaying = !this.secondPlayer.isBotPlaying; 
  }

  public updateBotLevel(botLevel: BotLevel): void{
    this.secondPlayer.changeBotLevel(botLevel);
  }


  public isMainPlayerWinner(status: GameStatus, player: Player): boolean{
    return this.gameState.gameStatus === status && this.userPlayer.getPlayer() === player;
  }

  public isXPlayerWinner(): boolean{
    return this.gameState.gameStatus === GameStatus.X_WON;
  }

  public isOPlayerWinner(): boolean{
    return this.gameState.gameStatus === GameStatus.O_WON;
  }

  public isDraw(): boolean{
    return this.gameState.gameStatus === GameStatus.DRAW;
  }

  public isPlayerXTurn(): boolean{
    return this.gameState.turn === Player.X;
  }

  public isTheMainPlayerTurn(): boolean {
    return this.userPlayer.getPlayer() === this.gameState.turn;
  }

  public isTheSecondPlayerTurn(): boolean {
    return this.secondPlayer.getPlayer() === this.gameState.turn;
  }  

  public partyIsRunning(): boolean{
    return this.gameState.partyStatus === PartyStatus.RUNNING;
  }

  public partyIsEnded(): boolean{
    return this.gameState.partyStatus === PartyStatus.ENDED;
  }

  public partyIsBegging(): boolean{
    return this.gameState.partyStatus === PartyStatus.BEGGING;
  }

  public isBotPlaying(): boolean{
    return this.secondPlayer.isBotPlaying;
  }

  public mainPlayerPlaysWithO(): boolean{
    return this.userPlayer.getPlayer() === Player.O; 
  }

  public mainPlayerPlaysWithX(): boolean{
    return this.userPlayer.getPlayer() === Player.X; 
  }

  public botIsNovice(): boolean{
    return this.secondPlayer.botAI === BotLevel.NOVICE;
  }

  public botIsMaster(): boolean{
    return this.secondPlayer.botAI === BotLevel.MASTER;
  }

  public botIsRockie(): boolean{
    return this.secondPlayer.botAI === BotLevel.ROCKIE;
  }

}
