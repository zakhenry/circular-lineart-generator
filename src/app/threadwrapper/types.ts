
export interface Coordinate {
  x: number;
  y: number;
}

export type Line = [Coordinate, Coordinate];


export interface TangentPair {
  clockwise: [Coordinate, Coordinate];
  anticlockwise: [Coordinate, Coordinate];
}

export interface Tangents {
  internal: TangentPair;
  external: TangentPair;
}
