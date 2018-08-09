import {Ring} from "./ring";
import {Coordinate, Line, Tangents, TestedTangent} from "./types";
import {TangentLine} from "./line";
import {drawLinePixels, LINE_PIXEL_STRIDE, LINE_PIXEL_VALUE_MULTIPLIER} from "./util";

export class Pin {
  private ring: Ring;

  private tangentCache: Map<Pin, Tangents> = new Map;

  constructor(public centre: Coordinate, public radius = 5, public index = 0) {

  }

  getAngle(to: Pin): number {
    return Math.atan2(to.centre.y - this.centre.y, to.centre.x - this.centre.x)
  }

  getTangent(to: Pin, external = true, endClockwise = true): TangentLine {

    const tangents = this.getTangents(to);

    return tangents[external ? 'external' : 'internal'][endClockwise ? 'clockwise' : 'anticlockwise'];
  }

  getTangents(to: Pin): Tangents {

    if (this.tangentCache.has(to)) {
      return this.tangentCache.get(to);
    }

    const distanceSquared = (to.centre.x - this.centre.x) ** 2 + (to.centre.y - this.centre.y) ** 2;

    if (distanceSquared <= (to.radius - this.radius) ** 2) {
      throw new Error('Pins must not overlap!');
    }

    const distance = Math.sqrt(distanceSquared);

    const tangents: Tangents = {
      internal: {
        clockwise: null,
        anticlockwise: null,
      },
      external: {
        clockwise: null,
        anticlockwise: null,
      }
    };


    const vx = (to.centre.x - this.centre.x) / distance;
    const vy = (to.centre.y - this.centre.y) / distance;
    let i = 0;

    for (let sign1 = +1; sign1 >= -1; sign1 -= 2) {
      const c = (this.radius - sign1 * to.radius) / distance;

      if (c ** 2 > 1) {
        continue;
      }

      const h = Math.sqrt(Math.max(0.0, 1.0 - c ** 2));

      for (let sign2 = 1; sign2 >= -1; sign2 -= 2) {
        const nx = vx * c - sign2 * h * vy;
        const ny = vy * c + sign2 * h * vx;

        i++;

        const fromPoint = {
          x: this.centre.x + this.radius * nx,
          y: this.centre.y + this.radius * ny
        };

        const toPoint = {
          x: to.centre.x + sign1 * to.radius * nx,
          y: to.centre.y + sign1 * to.radius * ny
        };

        if (i > 2) { // internal
          tangents.internal[i % 2 ? 'clockwise' : 'anticlockwise'] = new TangentLine([fromPoint, toPoint], this, to, i % 2 === 0, true);
        } else {
          tangents.external[i % 2 ? 'anticlockwise' : 'clockwise'] = new TangentLine([fromPoint, toPoint], this, to, i % 2 !== 0, false);
        }

      }
    }

    this.tangentCache.set(to, tangents);

    return tangents;
  }

  isNearTo(prev: Pin, count, maxDistance = 1) {

    const distance = Math.abs(this.index - prev.index);

    return distance <= maxDistance || distance > (count - maxDistance);
  }

  setRing(ring: Ring): this {
    this.ring = ring;
    return this;
  }

  draw(ctx: CanvasRenderingContext2D): this {
    ctx.beginPath();
    ctx.arc(this.centre.x, this.centre.y, this.radius, 0, Math.PI * 2, true);
    ctx.stroke();
    return this;
  }

  getCandidateLines(startingClockwise?: boolean): TangentLine[] {
    return Array.from(this.ring.candidatePinIterator(this, false)).reduce((lines: TangentLine[], pin) => {

      const tangents = this.getTangents(pin);

      if (startingClockwise || startingClockwise === undefined) {
        lines.push(
          tangents.external.clockwise,
          tangents.internal.anticlockwise,
        );
      } else if (!startingClockwise) {
        lines.push(
          tangents.internal.clockwise,
          tangents.external.anticlockwise,
        );
      }

      return lines;
    }, []);
  }

  getAccessiblePins(): Pin[] {
    return Array.from(this.ring.candidatePinIterator(this));
  }

  getScoredTangents(currentOutputData: ImageData, srcImgData: ImageData, startingClockwise?: boolean): TestedTangent[] {

    // console.log(`currentOutputData.data.reduce((s, i) => s + i)`, currentOutputData.data.reduce((s, i) => s + i));

    const candidateLines = this.getCandidateLines(startingClockwise)

    // this.ring.srcImageCtx && this.ring.srcImageCtx.clearRect(0, 0, 1000, 1000);
    // this.ring.srcImageCtx && this.ring.drawLines(this.ring.srcImageCtx, candidateLines);

    return candidateLines.map((l, i): TestedTangent => {

      const pixels = l.pixels;
      const pixelCount = pixels.length / LINE_PIXEL_STRIDE;

      let imageLineIntensity = 0;
      let currentOutputIntensity = 0;
      let newOutputIntensity = 0;

      for (let i = 0; i < pixels.length; i += LINE_PIXEL_STRIDE) {

        const pixelIndex = (pixels[i + 1] * srcImgData.width + pixels[i]) * 4;

        let intensity = (1 - (
          srcImgData.data[pixelIndex] +
          srcImgData.data[pixelIndex + 1] +
          srcImgData.data[pixelIndex + 2]
        ) / 765) * srcImgData.data[pixelIndex + 3];

        let currentIntensity = (1 - (
          currentOutputData.data[pixelIndex] +
          currentOutputData.data[pixelIndex + 1] +
          currentOutputData.data[pixelIndex + 2]
        ) / 765) * currentOutputData.data[pixelIndex + 3];

        let newIntensity = Math.max(1, currentIntensity + 0.5);

        const pixelValue = pixels[i + 2] / LINE_PIXEL_VALUE_MULTIPLIER;
        imageLineIntensity += intensity * pixelValue;
        currentOutputIntensity += currentIntensity * pixelValue;
        newOutputIntensity += newIntensity * pixelValue;
      }

      imageLineIntensity /= pixelCount;
      currentOutputIntensity /= pixelCount;
      newOutputIntensity /= pixelCount;


      // II = 0.8 (nearly black)
      // COI = 0 (never visited)
      // NOI = 1 (black)
      // score = II - COI = 0.8

      // II = 0.8 (nearly black)
      // COI = 1 (already covered)
      // NOI = 1 (black)
      // score = II - COI = -0.2

      let score = imageLineIntensity - newOutputIntensity;

      // let score = /*newOutputIntensity*/ - imageLineIntensity;
      // if (imageLineIntensity > newOutputIntensity) {
      //   score = 0;
      // }
      //
      // if (currentOutputIntensity === newOutputIntensity) {
      //   score = 0;
      // }

      return {line: l, score};
    })
  }

  getBestTangent(currentOutputData: ImageData, srcImgData: ImageData, startingClockwise?: boolean): TangentLine {

    const best: TestedTangent =
      this.getScoredTangents(currentOutputData, srcImgData, startingClockwise).reduce((best: TestedTangent, testedLine: TestedTangent) => {

        if (!best || testedLine.score > best.score) {
          return testedLine;
        }

        return best;

      }, null);

    return best.line
  }

}
