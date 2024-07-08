export type CaptureCounter = {
  pawns: number;
  bishop: number;
  queen: number;
  knight: number;
  rook: number;
};

export interface PieceCaptureCounter {
  white: CaptureCounter;
  black: CaptureCounter;
}
