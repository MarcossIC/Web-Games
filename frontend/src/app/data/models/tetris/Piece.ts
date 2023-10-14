import { Axis } from "./Axis";
import { PieceColor } from "./PieceColor";
import { PieceType } from "./PieceType.enum";

export interface Piece {
    position: Axis,
    type: PieceType,
    isMovable: boolean,
    shape: number[][],
    color: PieceColor
}
