import {Ring} from "./ring";
import {Coordinate, Line, Tangents, TestedTangent} from "./types";
import {TangentLine} from "./line";

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

  getScoredTangents(srcImgData: ImageData, startingClockwise?: boolean): TestedTangent[] {
    return this.getCandidateLines(startingClockwise).map((l): TestedTangent => {

      let score = l.pixels.reduce((s, p) => {

        const pixelIndex = (p.y * srcImgData.width + p.x) * 4;

        let intensity = (
          srcImgData.data[pixelIndex] +
          srcImgData.data[pixelIndex + 1] +
          srcImgData.data[pixelIndex + 2]
        ) / 765;

        return s + (intensity * p.value);
      }, 0);

      score /= l.pixels.length;

      return {line: l, score};
    })
  }

  getBestTangent(srcImgData: ImageData, startingClockwise?: boolean): TangentLine {

    const best: TestedTangent =
      this.getScoredTangents(srcImgData, startingClockwise).reduce((best: TestedTangent, testedLine: TestedTangent) => {

        if (!best || testedLine.score < best.score) {
          return testedLine;
        }

        return best;

      }, null);

    return best.line
  }

}
