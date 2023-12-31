import { Component,  ElementRef, OnDestroy, OnInit, Renderer2, ViewChild, inject } from '@angular/core';
import { NEXT_PIECE_WIDTH, NEXT_PIECE_HEIGHT, NEXT_PIECE_SIZE, BLOCK_SIZE_SCREEN, BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN } from "../../../../assets/constants/tetrisConstanst";
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { Router } from '@angular/router';
import { SeoService } from '@app/data/services/seo.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  styleUrls: ['./tetris.component.css']
})
export class TetrisComponent implements OnInit, OnDestroy {

  @ViewChild('tetris', { static: true }) canvasRef!: ElementRef;
  @ViewChild('nextPiece', { static: true }) nextPieceRef!: ElementRef;

  private board!: HTMLCanvasElement;
  private nextPiece!: HTMLCanvasElement;
  private boardContext!: CanvasRenderingContext2D;
  private nextPieceContext!: CanvasRenderingContext2D;
  private moveListener = () => {};

  protected controller = inject(TetrisControllerService);
  protected seo = inject(SeoService);
  protected title = inject(Title);
  private renderer = inject(Renderer2);
  protected point = inject(PointsService);

  constructor() { 
  }

  ngOnInit(): void {
    this.title.setTitle("Game Galaxy - Tetris");
    this.seo.generateTags({
      title: "Game Galaxy - Tetris",
      description: "Page to play tetris",
      slug: "tetris"
    });

    //Board
    this.board = this.canvasRef.nativeElement;
    this.boardContext = this.board.getContext('2d') as CanvasRenderingContext2D;
    this.board.width = BLOCK_SIZE_SCREEN * BOARD_WIDTH_SCREEN;
    this.board.height = BLOCK_SIZE_SCREEN * BOARD_HEIGHT_SCREEN;
    this.boardContext.scale(BLOCK_SIZE_SCREEN, BLOCK_SIZE_SCREEN);
    
    //Next Piece Board
    this.nextPiece = this.nextPieceRef.nativeElement;
    this.nextPieceContext = this.nextPiece.getContext('2d') as CanvasRenderingContext2D;
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
    cancelAnimationFrame(this.controller.animationFrameId);
  }

  onPress(key: string){
    this.isMobile() && this.controller.executeAction(key);
  }

  get boardWidth(){
    return this.board.width;
  }
  get boardHeight(){
    return this.board.height;
  }

  pause(): void{
    this.controller.pause();
  }

  isMobile(): boolean{
    return window.innerWidth <= 500;
  }

}


