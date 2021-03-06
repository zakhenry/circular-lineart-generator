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
export const LINE_PIXEL_VALUE_MULTIPLIER = 2 ** 15 - 1;
export const LINE_PIXEL_STRIDE = 3;

export function getLinePixels([from, to]: Line): Int16Array {

  let x0 = from.x;
  let y0 = from.y;
  let x1 = to.x;
  let y1 = to.y;

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

  const arr = new Int16Array((xpxl2 - xpxl1) * 6);
  for (let x = xpxl1 + 1; x < xpxl2 - 1; x++) {

    const index = x - (xpxl1 + 1);

    // @todo use this Int16Array instead of the returned pixels for performance
    arr[index * 6] = steep ? integerPart(interY) : x;
    arr[index * 6 + 1] = steep ? x : integerPart(interY);
    arr[index * 6 + 2] = remainderFractionalPart(interY) * LINE_PIXEL_VALUE_MULTIPLIER;
    arr[index * 6 + 3] = steep ? integerPart(interY) + 1 : x;
    arr[index * 6 + 4] = steep ? x : integerPart(interY) + 1;
    arr[index * 6 + 5] = fractionalPart(interY) * LINE_PIXEL_VALUE_MULTIPLIER;

    interY += gradient;
  }

  return arr;
}

export function drawLinePixels(ctx: CanvasRenderingContext2D, pixels: Int16Array, alpha = 1): void {

  for (let i = 0; i < pixels.length; i += LINE_PIXEL_STRIDE) {
    ctx.fillStyle = `hsla(0, 100%, 0%, ${(pixels[i+2] / LINE_PIXEL_VALUE_MULTIPLIER) * alpha})`;
    ctx.fillRect(pixels[i], pixels[i+1], 1, 1);
  }

}


