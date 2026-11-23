import { Injectable, OnDestroy } from '@angular/core';
import { ChessBotLevel, PlayedMove } from '@app/data/models/chess/chess-mode';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { CHESS_BOT_MIN_THINK_MS } from 'assets/constants/chess';
import type { BotMove, BotReply, BotRequest } from './engine/chess-bot';
import type { Search } from './engine/search';

/** The engine's number for the piece a pawn becomes, by the game's symbol. */
const PROMOTION_NUMBER: Partial<Record<PieceSymbol, number>> = {
  [PieceSymbol.WHITE_KNIGHT]: 2,
  [PieceSymbol.BLACK_KNIGHT]: 2,
  [PieceSymbol.WHITE_BISHOP]: 3,
  [PieceSymbol.BLACK_BISHOP]: 3,
  [PieceSymbol.WHITE_ROOK]: 4,
  [PieceSymbol.BLACK_ROOK]: 4,
  [PieceSymbol.WHITE_QUEEN]: 5,
  [PieceSymbol.BLACK_QUEEN]: 5,
};

/** The game's symbols for what a pawn becomes, by the engine's number: white's, then black's. */
const PROMOTION_SYMBOLS: Record<number, [PieceSymbol, PieceSymbol]> = {
  2: [PieceSymbol.WHITE_KNIGHT, PieceSymbol.BLACK_KNIGHT],
  3: [PieceSymbol.WHITE_BISHOP, PieceSymbol.BLACK_BISHOP],
  4: [PieceSymbol.WHITE_ROOK, PieceSymbol.BLACK_ROOK],
  5: [PieceSymbol.WHITE_QUEEN, PieceSymbol.BLACK_QUEEN],
};

/** A move of the game as the engine reads it. Both number the board the same way. */
export function toBotMove(move: PlayedMove): BotMove {
  return {
    from: move.prevX * 8 + move.prevY,
    to: move.newX * 8 + move.newY,
    promotion: (move.promotedPieceType && PROMOTION_NUMBER[move.promotedPieceType]) || 0,
  };
}

/** A move of the engine as the game plays it. A pawn promotes on row 0 only for white. */
export function toPlayedMove(move: BotMove): PlayedMove {
  const newX = move.to >> 3;
  const symbols = PROMOTION_SYMBOLS[move.promotion];
  return {
    prevX: move.from >> 3,
    prevY: move.from & 7,
    newX,
    newY: move.to & 7,
    promotedPieceType: symbols ? symbols[newX === 0 ? 0 : 1] : PieceSymbol.UNKNOWN,
  };
}

interface Waiting {
  request: BotRequest;
  resolve: (move: BotMove | null) => void;
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * The machine the player faces. It thinks in a worker, so the page stays
 * responsive meanwhile; where there are no workers it thinks on the page.
 */
@Injectable()
export class ChessBot implements OnDestroy {
  /** How long an answer takes at least. Tests set it to 0. */
  public minThinkMs = CHESS_BOT_MIN_THINK_MS;

  private worker: Worker | null = null;
  /** False once a worker could not be had: the machine thinks on the page from then on. */
  private canUseWorker = typeof Worker !== 'undefined';
  private lastId = 0;
  private readonly waiting = new Map<number, Waiting>();
  /** The search kept for games thought on the page: it is a few megabytes, so only one. */
  private pageSearch: Search | null = null;

  /**
   * The machine's answer to the game so far, or null when it has none:
   * the game is over, or the question was dropped (`cancel`, or a newer
   * question). Who asks tells whether the answer still applies.
   */
  public async think(
    moves: readonly PlayedMove[],
    level: ChessBotLevel
  ): Promise<PlayedMove | null> {
    const request: BotRequest = { id: ++this.lastId, moves: moves.map(toBotMove), level };
    const [move] = await Promise.all([this.ask(request), wait(this.minThinkMs)]);
    return move ? toPlayedMove(move) : null;
  }

  /**
   * Gets the machine ready before it is asked anything: the worker takes
   * a moment to load, better spent while the player looks at the board
   * than after their first move.
   */
  public prepare(): void {
    this.startWorker();
  }

  /**
   * Drops what the machine is thinking about: the position changed under
   * it (an undo, a pause, a new game). Whoever was waiting is told there
   * is no move.
   */
  public cancel(): void {
    if (this.waiting.size === 0) return;
    // A worker cannot be interrupted, only stopped: left alone it would
    // finish a search nobody wants before starting the next one.
    this.worker?.terminate();
    this.worker = null;
    const unanswered = [...this.waiting.values()];
    this.waiting.clear();
    for (const { resolve } of unanswered) resolve(null);
    this.startWorker();
  }

  private ask(request: BotRequest): Promise<BotMove | null> {
    // Only the last question matters to who asks: an older one still
    // being thought about would only make this one wait.
    this.cancel();
    const worker = this.startWorker();
    if (!worker) return this.thinkOnPage(request);
    return new Promise((resolve) => {
      this.waiting.set(request.id, { request, resolve });
      worker.postMessage(request);
    });
  }

  private startWorker(): Worker | null {
    if (this.worker || !this.canUseWorker) return this.worker;
    try {
      const worker = new Worker(new URL('./engine/chess-bot.worker', import.meta.url), {
        type: 'module',
      });
      worker.addEventListener('message', ({ data }: MessageEvent<BotReply>) => {
        this.waiting.get(data.id)?.resolve(data.move);
        this.waiting.delete(data.id);
      });
      worker.addEventListener('error', () => this.giveUpOnWorker());
      this.worker = worker;
    } catch {
      this.canUseWorker = false;
    }
    return this.worker;
  }

  /** The worker failed to load or broke: what was asked of it is answered on the page. */
  private giveUpOnWorker(): void {
    this.canUseWorker = false;
    this.worker?.terminate();
    this.worker = null;
    const unanswered = [...this.waiting.values()];
    this.waiting.clear();
    for (const { request, resolve } of unanswered) {
      this.thinkOnPage(request).then(resolve);
    }
  }

  private async thinkOnPage(request: BotRequest): Promise<BotMove | null> {
    const [{ answerBotRequest }, { Search }] = await Promise.all([
      import('./engine/chess-bot'),
      import('./engine/search'),
    ]);
    this.pageSearch ??= new Search();
    // Lets the page paint the player's move before the board freezes.
    await wait(30);
    return answerBotRequest(request, this.pageSearch).move;
  }

  public ngOnDestroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.waiting.clear();
  }
}
