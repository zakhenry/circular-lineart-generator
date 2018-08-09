
export interface Coordinate {
  x: number;
  y: number;
}

export interface Pixel {
  x: number;
  y: number;
  value: number;
}

export type Line = [Coordinate, Coordinate];

export type AntialiasedLine = Pixel[];

export interface TangentPair {
  clockwise: [Coordinate, Coordinate];
  anticlockwise: [Coordinate, Coordinate];
}

export interface Tangents {
  internal: TangentPair;
  external: TangentPair;
}
