import {Ring} from "./ring";
import {Coordinate, Line, Tangents} from "./types";

export class Pin {
  private ring: Ring;

  private tangentCache: Map<Pin, Tangents> = new Map;

  constructor(public centre: Coordinate, public radius = 5, public index = 0) {

  }

  getAngle(to: Pin): number {
    return Math.atan2(to.centre.y - this.centre.y, to.centre.x - this.centre.x)
  }

  getTangent(to: Pin, external = true, endClockwise = true): [Coordinate, Coordinate] {

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
          tangents.internal[i % 2 ? 'clockwise' : 'anticlockwise'] = [fromPoint, toPoint]
        } else {
          tangents.external[i % 2 ? 'anticlockwise' : 'clockwise'] = [fromPoint, toPoint]
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

  getCandidateLines(): Line[] {
    return Array.from(this.ring.candidatePinIterator(this, false)).reduce((lines: Line[], pin) => {

      const tangents = this.getTangents(pin);
      lines.push(
        tangents.external.clockwise,
        tangents.external.anticlockwise,
        tangents.internal.clockwise,
        tangents.internal.anticlockwise,
      );

      return lines;
    }, []);
  }

  getAccessiblePins(): Pin[] {
    return Array.from(this.ring.candidatePinIterator(this));
  }

}
