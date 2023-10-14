export enum PieceType {
    SQUARE,
    BAR,
    TRIANGLE,
    STAIRCASE,
    ELE,
    INVERTED_STAIRCASE,
    INVERTED_ELE
}


export const PiecesValues: Record<PieceType, number> = {
    [PieceType.SQUARE]: 0,
    [PieceType.BAR]: 2,
    [PieceType.TRIANGLE]: 3,
    [PieceType.STAIRCASE]: 4,
    [PieceType.ELE]: 5,
    [PieceType.INVERTED_STAIRCASE]: 6,
    [PieceType.INVERTED_ELE]: 7
};