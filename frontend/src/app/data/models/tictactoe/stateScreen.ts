import { Player } from "./Player.enum";

export interface StateScreen {
    boardScreen: string[][],
    emptyCells: number[],
    turn: Player,
    movePosition?: number
}
