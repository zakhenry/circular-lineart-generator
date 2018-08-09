import {TangentLine} from "./line";

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
  clockwise: TangentLine;
  anticlockwise: TangentLine;
}

export interface TestedTangent {
  line: TangentLine;
  score: number;
}

export interface Tangents {
  internal: TangentPair;
  external: TangentPair;
}
