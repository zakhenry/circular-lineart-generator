import {Pin} from "./pin";
import {Coordinate, Line} from "./types";
import {getRandomArrayElement} from "./util";
import {TangentLine} from "./line";

export class Ring {
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
    const [from, to] = this.pins[1].getTangent(firstPin, false, false).line;

    const maxAngle = Math.atan2(to.y - from.y, to.x - from.x);

    for (let skipCount = 0; skipCount < this.pins.length; skipCount++) {
      const next = testPinIterator.next().value;

      const [extFrom, extTo] = firstPin.getTangent(next, true, false).line;

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

  drawLine(ctx: CanvasRenderingContext2D, line: Line, color: number = 1, alpha = 1, brightness = .5): this {

    const [from, to] = line;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.strokeStyle = `hsla(${360 * color}, 100%, ${brightness*100}%, ${alpha})`;

    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    return this;
  }

  drawLines(ctx: CanvasRenderingContext2D, lines: TangentLine[], alpha = 1): this {

    lines.forEach((tangentLine, index) => {

      this.drawLine(ctx, tangentLine.line, index / lines.length, alpha);

    });

    return this;
  }

  * iterateRandom(): IterableIterator<TangentLine> {

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

    const lines = Array.from({length: count}).map((_, index, arr) => randomLineIterator.next().value);

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

  * candidatePinIterator(startingPin: Pin, iterateClockwise = true): IterableIterator<Pin> {
    const maxDistance = this.getNeighboringPinSkipCount();

    const initialIndex = this.pins.indexOf(startingPin);

    const startingIndex = this.wrapInt(initialIndex + maxDistance);
    const endingIndex = this.wrapInt(initialIndex - maxDistance);

    let index = iterateClockwise ? startingIndex : endingIndex;

    while (true) {


      index += iterateClockwise ? 1 : -1;

      if (index >= this.pins.length || index < 0) {
        index = this.wrapInt(index);
      }

      if (index === (iterateClockwise ? endingIndex : startingIndex)) {
        break;
      }

      yield this.pins[index];
    }

  }

  * iterateWinding(outputCtx: CanvasRenderingContext2D, imageCtx: CanvasRenderingContext2D): IterableIterator<TangentLine> {

    let pin = this.pins[0]; //todo start somewhere else

    let windingClockwise: boolean;
    while(true) {
      // @todo this is not comparing with the current state
      const bestTangent = pin.getBestTangent(imageCtx.getImageData(0, 0, imageCtx.canvas.width, imageCtx.canvas.height), windingClockwise);

      pin = bestTangent.toPin;
      windingClockwise = bestTangent.internal ? !bestTangent.clockwise : bestTangent.clockwise;

      yield bestTangent;
    }

  }

}
