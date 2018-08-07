import {AfterViewInit, Component, ElementRef, Input, ViewChild} from '@angular/core';

interface Coordinate {
  x: number;
  y: number;
}

type Line = [Coordinate, Coordinate];

class Ring {
  public pins: Pin[];

  private neighboringPinSkipCount: number;

  constructor(public diameter, public centre: Coordinate) {

  }

  public addPins(count: number, pinDiameter = 10): this {
    this.pins = Array.from({length: count})
      .map((a, index) => Math.PI * 2 * index / count)
      .map((a, index) => new Pin({
        x: this.centre.x + Math.cos(a) * this.diameter,
        y: this.centre.y + Math.sin(a) * this.diameter,
      }, pinDiameter / 2, index).setRing(this));

    return this;
  }

  getNeighboringPinSkipCount(): number {

    if (this.neighboringPinSkipCount) {
      return this.neighboringPinSkipCount;
    }

    const firstPin = this.pins[0];
    const testPinIterator = this.pinIterator(firstPin);
    const [from, to] = this.pins[1].getTangent(firstPin, false, false);

    const maxAngle = Math.atan2(to.y - from.y, to.x - from.x);

    for (let skipCount = 0; skipCount < this.pins.length; skipCount++) {
      const next = testPinIterator.next().value;

      const [extFrom, extTo] = firstPin.getTangent(next, true, false);

      const extAngle = Math.atan2(extFrom.y - extTo.y, extFrom.x - extTo.x);

      if (extAngle > maxAngle) {

        // @todo is this actually a degenerate case when there is no actual overlap?
        if (skipCount == 1) {
          skipCount = 0;
        }

        this.neighboringPinSkipCount = skipCount;
        return skipCount;
      }
    }

    this.neighboringPinSkipCount = 0;
    return 0;
  }

  private ctx: CanvasRenderingContext2D;

  draw(ctx: CanvasRenderingContext2D): this {
    this.ctx = ctx;
    this.pins.forEach(p => p.draw(ctx));
    return this;
  }

  drawLine(ctx: CanvasRenderingContext2D, line: Line, color: number = 1, alpha = 1): this {

    const [from, to] = line;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.strokeStyle = `hsla(${360 * color}, 100%, 50%, ${alpha})`;

    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    return this;
  }

  drawLines(ctx: CanvasRenderingContext2D, lines: Line[], alpha = 1): this {

    lines.forEach((line, index) => {

      this.drawLine(ctx, line, index / lines.length, alpha);

    });

    return this;
  }

  * iterateRandom(): IterableIterator<Line> {

    let prev = getRandomArrayElement(this.pins);

    let clockwise = true;

    while (true) {
      const next: Pin = getRandomArrayElement(prev.getAccessiblePins());

      const nextWinding = Math.random() > 0.5;

      clockwise = nextWinding ? clockwise : !clockwise;

      const line = prev.getTangent(next, nextWinding, clockwise);

      prev = next;

      yield line;
    }
  }

  drawRandom(ctx: CanvasRenderingContext2D, count = 1000): this {

    const randomLineIterator = this.iterateRandom();

    const lines = Array.from({length: count}).map((_, index, arr): Line => randomLineIterator.next().value);

    this.drawLines(ctx, lines);
    return this;
  }

  wrapInt(num: number): number {
    return (num % this.pins.length + this.pins.length) % this.pins.length;
  }

  * pinIterator(startingPin: Pin): IterableIterator<Pin> {

    const startingIndex = this.pins.indexOf(startingPin)
    let index = startingIndex;

    while (true) {

      index++;

      if (index >= this.pins.length) {
        index = this.wrapInt(index);
      }

      if (index === startingIndex) {
        break;
      }

      yield this.pins[index];
    }
  }

  * candidatePinIterator(startingPin: Pin, clockwise = true): IterableIterator<Pin> {
    const maxDistance = this.getNeighboringPinSkipCount();

    const initialIndex = this.pins.indexOf(startingPin);

    const startingIndex = this.wrapInt(initialIndex + maxDistance);
    const endingIndex = this.wrapInt(initialIndex - maxDistance);

    let index = clockwise ? startingIndex : endingIndex;

    while (true) {


      index += clockwise ? 1 : -1;

      if (index >= this.pins.length || index < 0) {
        index = this.wrapInt(index);
      }

      if (index === (clockwise ? endingIndex : startingIndex)) {
        break;
      }

      yield this.pins[index];
    }

  }

}

interface TangentPair {
  clockwise: [Coordinate, Coordinate];
  anticlockwise: [Coordinate, Coordinate];
}

interface Tangents {
  internal: TangentPair;
  external: TangentPair;
}

class Pin {
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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {

  @Input() public width: number = 1000;
  @Input() public height: number = 1000;

  @ViewChild('canvas') private canvas: ElementRef<HTMLCanvasElement>;

  constructor() {
  }

  private pinCount = 50;
  private pinDiameter = 20;

  private ctx;
  private ring: Ring;

  draw() {

    const ctx = this.canvas.nativeElement.getContext('2d');
    this.ctx = ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    const circleDiameter = Math.min(this.width, this.height) / 2 * 0.9;

    const ring = new Ring(circleDiameter, {x: this.width / 2, y: this.height / 2})
      .addPins(this.pinCount, this.pinDiameter)
      .draw(ctx)
      // .drawRandom(ctx, 10)
    ;

    this.ring = ring;

    ring.pins
    // [ring.pins[0]]
      .forEach(p => ring.drawLines(ctx, p.getCandidateLines(), 0.3))

  }

  public animationCancel: number;

  startRandomAnimation() {
    const lineIterator = this.ring.iterateRandom();
    const lines = [];
    const addRandomLine = () => {
      lines.push(lineIterator.next().value);
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ring.draw(this.ctx);
      this.ring.drawLines(this.ctx, lines);
      this.animationCancel = requestAnimationFrame(addRandomLine)
    }

    requestAnimationFrame(addRandomLine);
  }

  stopRandomAnimation() {
    cancelAnimationFrame(this.animationCancel);
    this.animationCancel = null;
  }

  ngAfterViewInit() {
    this.draw()
  }

  setPinCount(e) {
    this.pinCount = e;
    this.draw();
  }

  setPinDiameter(e) {
    this.pinDiameter = e;
    this.draw();
  }

}

function* getRandomArrayElementIterator<T>(arr: T[]): IterableIterator<T> {
  while (true) {
    yield getRandomArrayElement(arr);
  }
}


function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
