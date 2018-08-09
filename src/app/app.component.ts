import {AfterViewInit, Component, ElementRef, Input, ViewChild} from '@angular/core';
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

