import { TestBed } from '@angular/core/testing';
import { PlayedMove } from '@app/data/models/chess/chess-mode';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { toBotMove } from '@app/data/services/chess/ChessBot.service';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { chessTestProviders } from '@app/data/services/chess/chess-testing';
import { positionAfter } from './engine/chess-bot';
import { Position, moveFrom, moveTo } from './engine/position';

/**
 * The machine thinks on its own board, with its own rules. These games
 * check that its rules are the game's: after every move of a random game,
 * both must allow exactly the same moves and agree on check and mate.
 */

function randomSource(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every move the game allows, as "from>to" pairs of square numbers, sorted. */
function gameMoves(controller: ChessController): string[] {
  const moves: string[] = [];
  for (const [from, targets] of controller.safeCoords) {
    const [x, y] = from.split(',').map(Number);
    for (const target of targets) moves.push(`${x * 8 + y}>${target.x * 8 + target.y}`);
  }
  return moves.sort();
}

/** The same for the engine. The four promotions of a pawn are one pair of squares. */
function engineMoves(position: Position): string[] {
  const moves = new Set<string>();
  for (const move of position.legalMoves()) moves.add(`${moveFrom(move)}>${moveTo(move)}`);
  return [...moves].sort();
}

const PROMOTIONS: Record<ChessPlayers, PieceSymbol[]> = {
  [ChessPlayers.WHITE]: [
    PieceSymbol.WHITE_QUEEN, PieceSymbol.WHITE_ROOK, PieceSymbol.WHITE_BISHOP, PieceSymbol.WHITE_KNIGHT,
  ],
  [ChessPlayers.BLACK]: [
    PieceSymbol.BLACK_QUEEN, PieceSymbol.BLACK_ROOK, PieceSymbol.BLACK_BISHOP, PieceSymbol.BLACK_KNIGHT,
  ],
  [ChessPlayers.UNKNOWN]: [],
};

describe('chess engine and game', () => {
  let controller: ChessController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: chessTestProviders() });
    controller = TestBed.inject(ChessController);
    controller.start('practice');
  });

  /**
   * Whether a move is one of the rare ones: castling, a pawn taking en
   * passant (it moves sideways onto an empty square) or reaching the last row.
   */
  const isRare = (option: string): boolean => {
    const [from, to] = option.split('>').map(Number);
    const board = controller.currentChessBoardView;
    const symbol = board[from >> 3][from & 7].toLowerCase();
    const sideways = Math.abs((from & 7) - (to & 7));
    if (symbol === PieceSymbol.BLACK_KING) return sideways === 2;
    if (symbol !== PieceSymbol.BLACK_PAWN) return false;
    const lastRow = to >> 3 === 0 || to >> 3 === 7;
    return lastRow || (sideways === 1 && board[to >> 3][to & 7] === PieceSymbol.UNKNOWN);
  };

  /**
   * Picks any allowed move of the game, promoting to any piece. Half the
   * time a rare move is there it is the one picked: left to chance, whole
   * games go by without one.
   */
  const pickMove = (random: () => number): PlayedMove => {
    const allowed = gameMoves(controller);
    const rare = allowed.filter(isRare);
    const options = rare.length > 0 && random() < 0.5 ? rare : allowed;
    const [from, to] = options[Math.floor(random() * options.length)].split('>').map(Number);
    const prevX = from >> 3;
    const prevY = from & 7;
    const newX = to >> 3;
    const symbol = controller.currentChessBoardView[prevX][prevY];
    const promotes =
      (symbol === PieceSymbol.WHITE_PAWN && newX === 0) ||
      (symbol === PieceSymbol.BLACK_PAWN && newX === 7);
    const pieces = PROMOTIONS[controller.playerTurn];
    return {
      prevX, prevY, newX, newY: to & 7,
      promotedPieceType: promotes
        ? pieces[Math.floor(random() * pieces.length)]
        : PieceSymbol.UNKNOWN,
    };
  };

  /** The game so far as it is written down, to play a failing one again. */
  const movesSoFar = (): string =>
    controller.gameHistory.moveList
      .map((pair, index) => `${index + 1}. ${pair.join(' ')}`)
      .join(' ');

  it('allow the same moves all through random games', () => {
    const special = { castles: 0, enPassants: 0, promotions: 0, checks: 0, mates: 0 };
    let positions = 0;

    for (let game = 0; game < 40; game++) {
      const random = randomSource(game + 1);
      controller.restartGame();
      const position = positionAfter([])!;

      for (let ply = 0; ply < 160 && !controller.isGameOver; ply++) {
        const context = `game ${game}, move ${ply}, after ${movesSoFar()}`;
        expect(engineMoves(position)).withContext(context).toEqual(gameMoves(controller));
        expect(position.inCheck())
          .withContext(context)
          .toBe(controller.gameHistory.checkState.isInCheck);
        positions++;

        const move = pickMove(random);
        const { from, to, promotion } = toBotMove(move);
        const engineMove = position.findMove(from, to, promotion);
        expect(engineMove).withContext(context).not.toBe(0);
        if (engineMove >> 15 === 3) special.castles++;
        if (engineMove >> 15 === 2) special.enPassants++;
        if (promotion) special.promotions++;

        controller.movePiece(move.prevX, move.prevY, move.newX, move.newY, move.promotedPieceType);
        position.make(engineMove);
        if (position.inCheck()) special.checks++;
      }

      // Where the game ended by mate or with no move left, the engine sees the same.
      const over = controller.gameOverType;
      if (over === ChessGameOverType.CHECK_MATE_WHITE || over === ChessGameOverType.CHECK_MATE_BLACK) {
        special.mates++;
        expect(position.legalMoves().length).withContext(`game ${game} ends`).toBe(0);
        expect(position.inCheck()).withContext(`game ${game} ends`).toBeTrue();
      } else if (over === ChessGameOverType.DRAW_BY_DROWNED) {
        expect(position.legalMoves().length).withContext(`game ${game} ends`).toBe(0);
        expect(position.inCheck()).withContext(`game ${game} ends`).toBeFalse();
      }
    }

    // The games have to have gone through the moves worth checking.
    expect(positions).toBeGreaterThan(3000);
    expect(special.castles).withContext('castles').toBeGreaterThan(2);
    expect(special.enPassants).withContext('en passant captures').toBeGreaterThan(2);
    expect(special.promotions).withContext('promotions').toBeGreaterThan(2);
    expect(special.checks).withContext('checks').toBeGreaterThan(50);
    expect(special.mates).withContext('mates').toBeGreaterThan(0);
  });

  it('read the moves of a played game the same way', () => {
    const random = randomSource(99);
    for (let ply = 0; ply < 60 && !controller.isGameOver; ply++) {
      const move = pickMove(random);
      controller.movePiece(move.prevX, move.prevY, move.newX, move.newY, move.promotedPieceType);
    }

    const position = positionAfter(controller.playedMoves.map(toBotMove))!;

    expect(position).not.toBeNull();
    expect(position.ply).toBe(controller.ply);
    expect(engineMoves(position)).toEqual(controller.isGameOver ? [] : gameMoves(controller));
  });
});
