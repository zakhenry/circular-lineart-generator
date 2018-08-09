import {Line, Pixel} from "./types";
import {getLinePixels} from "./util";
import {Pin} from "./pin";

export class TangentLine {

  private cachedPixels;
  private cachedLength;

  constructor(public line: Line, public fromPin, public toPin: Pin, public clockwise: boolean, public internal: boolean) {

  }

  // getter used for lazy evaluation
  get pixels(): Pixel[] {
    if (this.cachedPixels) {
      return this.cachedPixels;
    }

    this.cachedPixels = getLinePixels(this.line);
    return this.cachedPixels;
  }
  // getter used for lazy evaluation
  get length(): number {
    if (this.cachedLength) {
      return this.cachedLength;
    }

    const [to, from] = this.line;
    this.cachedLength = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    return this.cachedLength;
  }

}
