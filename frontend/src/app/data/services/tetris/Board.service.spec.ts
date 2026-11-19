import { TestBed } from '@angular/core/testing';
import { BoardService } from './Board.service';
import { PointsService } from './Points.service';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { ALL_COLOR_PIECE } from 'assets/constants/tetrisConstanst';

/** Contexto falso que anota el color con el que se pinta cada celda. */
function fakeContext() {
  const painted: Record<string, string> = {};
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    fillRect(x: number, y: number) {
      painted[`${x},${y}`] = ctx.fillStyle;
    },
    strokeRect() {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, painted };
}

function pieceAt(x: number, y: number, colorKey: number): Piece {
  return {
    shape: [[1]],
    type: PieceType.SQUARE,
    position: { x, y },
    color: ALL_COLOR_PIECE[colorKey],
    isMovable: true,
  };
}

describe('Service: Board', () => {
  let service: BoardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoardService, PointsService],
    });
    service = TestBed.inject(BoardService);
  });

  it('keeps the color of each piece after it solidifies', () => {
    service.solidifyPieceInBoard(pieceAt(0, 5, 3));
    service.solidifyPieceInBoard(pieceAt(1, 5, 5));

    const { ctx, painted } = fakeContext();
    service.drawBoard(ctx, 100, 100);

    expect(painted['0,5']).toBe(ALL_COLOR_PIECE[3].fill);
    expect(painted['1,5']).toBe(ALL_COLOR_PIECE[5].fill);
  });

  it('does not let a rotation overlap a solidified cell of any color', () => {
    service.solidifyPieceInBoard(pieceAt(2, 5, 4));

    expect(service.doesRotationCollide([[1]], { x: 2, y: 5 })).toBeTrue();
  });
});
