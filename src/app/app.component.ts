import {AfterViewInit, Component, ElementRef, Input, NgZone, ViewChild} from '@angular/core';
import {Ring} from "./threadwrapper/ring";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {

  @Input() public width: number = 1000;
  @Input() public height: number = 1000;

  @ViewChild('canvas') private canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('srcImageCanvas') private srcImageCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('srcImage') private srcImage: ElementRef<HTMLImageElement>;

  constructor(private zone: NgZone) {
  }

  private pinCount = 30;
  private pinDiameter = 20;

  private ctx;
  private srcImageCtx;
  private ring: Ring;

  draw() {

    const ctx = this.canvas.nativeElement.getContext('2d');
    const imageCtx = this.srcImageCanvas.nativeElement.getContext('2d');
    this.ctx = ctx;
    this.srcImageCtx = imageCtx;

    ctx.clearRect(0, 0, this.width, this.height);

    const circleDiameter = Math.min(this.width, this.height) / 2 * 0.9;

    const ring = new Ring(circleDiameter, {x: this.width / 2, y: this.height / 2})
        .addPins(this.pinCount, this.pinDiameter)
        .draw(ctx)
      // .drawRandom(ctx, 10)
    ;

    this.ring = ring;

    // ring.pins
    // [ring.pins[0]]
    //   .forEach(p => ring.drawLines(ctx, p.getCandidateLines(), 0.3));
    // .forEach(p => p.getCandidateLines().map(getLinePixels).forEach(drawLinePixels(ctx)));

    // imageCtx.beginPath();
    // [ring.pins[4]]
    // // ring.pins
    //   .forEach(p => ring.drawLines(imageCtx, p.getCandidateLines(), 0.3))
    // imageCtx.stroke();

    // ring.drawLines(ctx,ring.pins[0].getCandidateLines(true));
    // ring.pins[0].getScoredTangents(
    //   imageCtx.getImageData(0, 0, imageCtx.canvas.width, imageCtx.canvas.height),
    //
    // ).forEach(t => ring.drawLine(ctx, t.line.line, t.score));
    //
    ring.pins.forEach(p => ring.drawLine(ctx, p.getBestTangent(
      ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
      imageCtx.getImageData(0, 0, imageCtx.canvas.width, imageCtx.canvas.height),
    ).line, 1, 1));

    ring.srcImageCtx = imageCtx;

  }


  public randomAnimationCancel: number;

  startRandomAnimation() {
    const lineIterator = this.ring.iterateRandom();
    const lines = [];

    const addRandomLine = () => {
      lines.push(lineIterator.next().value);
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ring.draw(this.ctx);
      this.ring.drawLines(this.ctx, lines);
      this.randomAnimationCancel = requestAnimationFrame(addRandomLine)
    }

    requestAnimationFrame(addRandomLine);
  }

  stopRandomAnimation() {
    cancelAnimationFrame(this.randomAnimationCancel);
    this.randomAnimationCancel = null;
  }

  public windingAnimationCancel: number;
  public totalLength = 0;

  startWindingAnimation() {

    const lineIterator = this.ring.iterateWinding(this.ctx, this.srcImageCtx.getImageData(0, 0, this.srcImageCtx.canvas.width, this.srcImageCtx.canvas.height));
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ring.draw(this.ctx);

    const addWindingLine = () => {
      const line = lineIterator.next().value;
      this.totalLength += (line.length / 1000 * 25.4) / 72; // length in m @ 72ppi

      this.windingAnimationCancel = requestAnimationFrame(addWindingLine)
    }

    requestAnimationFrame(addWindingLine);

  }

  stopWindingAnimation() {
    cancelAnimationFrame(this.windingAnimationCancel);
    this.windingAnimationCancel = null;
  }

  ngAfterViewInit() {

    const image = this.srcImage.nativeElement;

    const canvas = this.srcImageCanvas.nativeElement;
    const ctx = canvas.getContext('2d');


    image.onload = () => {

      const canvasAspect = canvas.width / canvas.height;
      const imageAspect = image.width / image.height;
      const overflowHorizontal = imageAspect > canvasAspect;

      const scale = overflowHorizontal ? (canvas.height / image.height) : (canvas.width / image.width);

      ctx.drawImage(
        image,
        Math.max((image.width - (canvas.width / scale)) / 2, 0),
        Math.max((image.height - (canvas.height / scale)) / 2, 0),
        overflowHorizontal ? canvasAspect * image.height : image.width,
        !overflowHorizontal ? canvasAspect * image.width : image.height,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      this.draw()
    }

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

