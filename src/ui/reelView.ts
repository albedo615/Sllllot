import { LINES, REEL_LENGTH, STRIPS } from '../game/reels';
import { drawSymbol } from './symbols';

/** 1 秒あたりのコマ数（1 周 0.75 秒 → 最大 4 コマのすべりで約 0.18 秒） */
const SPEED = 28;
const ACCEL_TIME = 0.25;

const REEL_W = 132;
const SYM_H = 96;
const GAP = 14;
const PAD = 22;
const WIDTH = PAD * 2 + REEL_W * 3 + GAP * 2;
const HEIGHT = PAD * 2 + SYM_H * 3;

const fmod = (x: number, m = REEL_LENGTH) => ((x % m) + m) % m;

interface ReelState {
  pos: number;
  spinning: boolean;
  target: number | null;
  elapsed: number;
}

export class ReelView {
  private ctx: CanvasRenderingContext2D;
  private reels: ReelState[];
  private litLines: number[] = [];
  private lineBlinkStart = 0;
  onReelStopped: (reel: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, initial: number[]) {
    this.ctx = canvas.getContext('2d')!;
    this.reels = initial.map((pos) => ({ pos, spinning: false, target: null, elapsed: 0 }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    let last = performance.now();
    const loop = (now: number) => {
      this.update(Math.min(0.05, (now - last) / 1000));
      last = now;
      this.draw(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = WIDTH * dpr;
    this.canvas.height = HEIGHT * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get aspect() {
    return WIDTH / HEIGHT;
  }

  startAll() {
    this.litLines = [];
    for (const r of this.reels) {
      r.spinning = true;
      r.target = null;
      r.elapsed = 0;
    }
  }

  /** 全速で回っていて、停止ボタンを受け付けられるか */
  canStop(reel: number) {
    const r = this.reels[reel];
    return r.spinning && r.target === null && r.elapsed >= ACCEL_TIME;
  }

  /** ボタンを押した瞬間の位置（次に上段に来るコマ） */
  pressPosition(reel: number) {
    return fmod(Math.floor(this.reels[reel].pos));
  }

  stopAt(reel: number, target: number) {
    this.reels[reel].target = target;
  }

  showWins(lines: number[]) {
    this.litLines = lines;
    this.lineBlinkStart = performance.now();
  }

  private update(dt: number) {
    this.reels.forEach((r, i) => {
      if (!r.spinning) return;
      r.elapsed += dt;
      const speed = SPEED * Math.min(1, r.elapsed / ACCEL_TIME);
      const step = speed * dt;
      if (r.target !== null) {
        const remaining = fmod(r.pos - r.target);
        if (step >= remaining) {
          r.pos = r.target;
          r.spinning = false;
          r.target = null;
          this.onReelStopped(i);
          return;
        }
      }
      r.pos = fmod(r.pos - step);
    });
  }

  private draw(now: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // パネル
    ctx.fillStyle = '#1a1024';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    this.reels.forEach((r, i) => {
      const x = PAD + i * (REEL_W + GAP);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, PAD, REEL_W, SYM_H * 3);
      ctx.clip();
      ctx.fillStyle = '#fbf8ef';
      ctx.fillRect(x, PAD, REEL_W, SYM_H * 3);

      const base = Math.floor(r.pos);
      const frac = r.pos - base;
      const blur = r.spinning && r.target === null && r.elapsed > ACCEL_TIME;
      for (let j = -1; j <= 3; j++) {
        const sym = STRIPS[i][fmod(base + j)];
        const cy = PAD + (j - frac) * SYM_H + SYM_H / 2;
        if (blur) {
          ctx.globalAlpha = 0.35;
          drawSymbol(ctx, sym, x + REEL_W / 2, cy - 14, 82);
          drawSymbol(ctx, sym, x + REEL_W / 2, cy + 14, 82);
          ctx.globalAlpha = 0.6;
        }
        drawSymbol(ctx, sym, x + REEL_W / 2, cy, 82);
        ctx.globalAlpha = 1;
      }

      // 円筒っぽい陰影
      const g = ctx.createLinearGradient(0, PAD, 0, PAD + SYM_H * 3);
      g.addColorStop(0, 'rgba(0,0,0,0.45)');
      g.addColorStop(0.18, 'rgba(0,0,0,0)');
      g.addColorStop(0.82, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(x, PAD, REEL_W, SYM_H * 3);
      ctx.restore();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.strokeRect(x, PAD, REEL_W, SYM_H * 3);
    });

    // 有効ラインの目印
    ctx.fillStyle = '#ffcf33';
    LINES.forEach((rows) => {
      const yl = PAD + rows[0] * SYM_H + SYM_H / 2;
      const yr = PAD + rows[2] * SYM_H + SYM_H / 2;
      triangle(ctx, PAD - 4, yl, 1);
      triangle(ctx, WIDTH - PAD + 4, yr, -1);
    });

    // 当たりライン（点滅）
    if (this.litLines.length && Math.floor((now - this.lineBlinkStart) / 220) % 2 === 0) {
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 40, 90, 0.85)';
      for (const line of this.litLines) {
        const rows = LINES[line];
        ctx.beginPath();
        rows.forEach((row, i) => {
          const px = PAD + i * (REEL_W + GAP) + REEL_W / 2;
          const py = PAD + row * SYM_H + SYM_H / 2;
          if (i === 0) ctx.moveTo(PAD - 6, py);
          ctx.lineTo(px, py);
          if (i === 2) ctx.lineTo(WIDTH - PAD + 6, py);
        });
        ctx.stroke();
      }
    }
  }
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 12 * dir, y - 7);
  ctx.lineTo(x - 12 * dir, y + 7);
  ctx.closePath();
  ctx.fill();
}
