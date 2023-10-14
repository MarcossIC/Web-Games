import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { BLOCK_SIZE, BOARD_WIDTH, BOARD_HEIGHT, NEXT_PIECE_WIDTH, NEXT_PIECE_HEIGHT, NEXT_PIECE_SIZE, BLOCK_MOBILE_SIZE, BOARD_MOBILE_WIDTH, BOARD_MOBILE_HEIGHT, BLOCK_SIZE_SCREEN, BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN } from "./tetrisConstanst";
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  styleUrls: ['./tetris.component.css']
})
export class TetrisComponent implements OnInit, OnDestroy {

  @ViewChild('tetris', { static: true }) canvasRef!: ElementRef;
  @ViewChild('nextPiece', { static: true }) nextPieceRef!: ElementRef;

  private board: any;
  private nextPiece: any;
  private boardContext: any;
  private nextPieceContext: any;
  private moveListener = () => {};

  constructor(
    public controller: TetrisControllerService, 
    private renderer: Renderer2, 
    protected point: PointsService,
    private router: Router
    ) { 
  }

  ngOnInit(): void {
    //Board
    this.board = this.canvasRef.nativeElement;
    this.boardContext = this.board.getContext('2d');
    this.board.width = BLOCK_SIZE_SCREEN * BOARD_WIDTH_SCREEN;
    this.board.height = BLOCK_SIZE_SCREEN * BOARD_HEIGHT_SCREEN;
    this.boardContext.scale(BLOCK_SIZE_SCREEN, BLOCK_SIZE_SCREEN);
    
    //Next Piece Board
    this.nextPiece = this.nextPieceRef.nativeElement;
    this.nextPieceContext = this.nextPiece.getContext('2d');
    this.nextPiece.width = NEXT_PIECE_SIZE * NEXT_PIECE_WIDTH;
    this.nextPiece.height = NEXT_PIECE_SIZE * NEXT_PIECE_HEIGHT;
    this.nextPieceContext.scale(NEXT_PIECE_SIZE, NEXT_PIECE_SIZE);

    this.controller.updateNextPiece(this.nextPieceContext, this.nextPiece.width, this.nextPiece.height);
    this.controller.runGame(this.boardContext, this.boardWidth, this.boardHeight);
    
    this.moveListener = this.renderer.listen('window', 'keydown', 
      (event: KeyboardEvent)=>this.controller.executeAction(event.key)
    );
  }

  ngOnDestroy(): void {
    this.moveListener();
  }

  get boardWidth(){
    return this.board.width;
  }
  get boardHeight(){
    return this.board.height;
  }

  close(){
    this.point.resetScore();
    this.point.resetCountLine();
    this.controller.reset();

    this.controller.closeGame();
    this.point.resetScore();
    this.point.resetCountLine();
    this.router.navigate(['/games']);
  }

  restart(){
    this.controller.reset();
    this.controller.playAgain();
    this.point.resetCountLine();
    this.point.resetScore();
  }

  pause(){
    this.controller.pause();
  }

  playGame(){
    this.controller.resume();
  }


  isMobile(): boolean{
    return window.innerWidth <= 500;
  }

}
