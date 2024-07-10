export type Coords = {
  x: number;
  y: number;
};

export type CoordsInARow = [number, number];

export type SafeCoords = Map<string, Coords[]>;
