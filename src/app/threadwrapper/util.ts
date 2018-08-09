import {AntialiasedLine, Line, Pixel} from "./types";

export function* getRandomArrayElementIterator<T>(arr: T[]): IterableIterator<T> {
  while (true) {
    yield getRandomArrayElement(arr);
  }
}


export function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function integerPart(x: number): number {
  return Math.floor(x)
}

function round(x: number): number {
  return integerPart(x + 0.5)
}

function fractionalPart(x: number): number {
  return x - Math.floor(x)
}

function remainderFractionalPart(x: number): number {
  return 1 - fractionalPart(x)
}

/**
 * This is a slightly simplified variant of Xiaolin Wu's line algorithm with the start and end point section of the algorithm removed
 * as we don't care about start & end points.
 */
export function getLinePixels([from, to]: Line): AntialiasedLine {

  let x0 = from.x;
  let y0 = from.y;
  let x1 = to.x;
  let y1 = to.y;

  const pixels: AntialiasedLine = [];

  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }

  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }

  const deltaX = x1 - x0;
  const deltaY = y1 - y0;
  let gradient = deltaY / deltaX;
  if (deltaX === 0) {
    gradient = 1;
  }

  const xEnd = round(x0);
  const yEnd = y0 + gradient * (xEnd - x0);
  const xpxl1 = round(x0);
  const xpxl2 = round(x1);
  let interY = yEnd + gradient;

  for (let x = xpxl1 + 1; x < xpxl2 - 1; x++) {
    pixels.push({
      x: steep ? integerPart(interY) : x,
      y: steep ? x : integerPart(interY),
      value: remainderFractionalPart(interY)
    }, {
      x: steep ? integerPart(interY) + 1 : x,
      y: steep ? x : integerPart(interY) + 1,
      value: fractionalPart(interY)
    });

    interY += gradient;
  }

  return pixels;
}

export function drawLinePixels(ctx: CanvasRenderingContext2D): (line: AntialiasedLine) => void {


  return (line: AntialiasedLine) => {
    if (1) {
      ctx.beginPath();
      ctx.strokeStyle = `hsla(1, 100%, 0%, 1)`;
      ctx.moveTo(line[0].x + 100, line[0].y);
      ctx.lineTo(line[line.length - 1].x + 100, line[line.length - 1].y);
      ctx.stroke();
    }
    line.forEach(pixel => {
      // ctx.fillStyle = `rgba(0, 0, 0, ${pixel.value})`;
      ctx.fillStyle = `hsla(${360 * pixel.value}, 100%, 0%, ${pixel.value})`
      ctx.fillRect( pixel.x, pixel.y, 1, 1 );
    })

  }

}


