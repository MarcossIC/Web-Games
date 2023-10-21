import { GameStatus } from "./GameStatus.enum";

export interface EndGameResult {
    isEndgame: boolean,
    gameStatus: GameStatus,
    score: number
}
