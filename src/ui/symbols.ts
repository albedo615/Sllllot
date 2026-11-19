import type { Sym } from '../game/types';

type Ctx = CanvasRenderingContext2D;

/** 図柄を (cx, cy) を中心に、size 四方の大きさで描く */
export function drawSymbol(ctx: Ctx, sym: Sym, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 100;
  ctx.scale(s, s);
  DRAW[sym](ctx);
  ctx.restore();
}

const DRAW: Record<Sym, (ctx: Ctx) => void> = {
  SEVEN(ctx) {
    ctx.font = '900 92px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#3a0008';
    ctx.strokeText('7', 0, 6);
    const g = ctx.createLinearGradient(0, -40, 0, 50);
    g.addColorStop(0, '#ff6b6b');
    g.addColorStop(0.5, '#e8001c');
    g.addColorStop(1, '#8c0010');
    ctx.fillStyle = g;
    ctx.fillText('7', 0, 6);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffd34d';
    ctx.strokeText('7', 0, 6);
  },

  BAR(ctx) {
    roundRect(ctx, -44, -24, 88, 48, 8);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd34d';
    ctx.stroke();
    ctx.font = '900 32px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('BAR', 0, 2);
  },

  BELL(ctx) {
    const g = ctx.createLinearGradient(-30, -30, 30, 40);
    g.addColorStop(0, '#fff6a8');
    g.addColorStop(0.45, '#ffcc00');
    g.addColorStop(1, '#c07a00');
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.bezierCurveTo(26, -38, 26, -8, 28, 10);
    ctx.quadraticCurveTo(30, 22, 40, 28);
    ctx.lineTo(-40, 28);
    ctx.quadraticCurveTo(-30, 22, -28, 10);
    ctx.bezierCurveTo(-26, -8, -26, -38, 0, -38);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a4a00';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 34, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#c07a00';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -42, 5, 0, Math.PI * 2);
    ctx.stroke();
  },

  MELON(ctx) {
    // 切ったスイカ（半月）
    ctx.beginPath();
    ctx.moveTo(-42, -12);
    ctx.arc(0, -12, 42, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#1f8a2e';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-35, -12);
    ctx.arc(0, -12, 35, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#f2f7d0';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-31, -12);
    ctx.arc(0, -12, 31, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#f0324a';
    ctx.fill();
    ctx.fillStyle = '#222';
    for (const [x, y] of [
      [-16, -2],
      [0, 4],
      [16, -2],
      [-8, 10],
      [8, 10],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x, y, 2.6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d4a16';
    ctx.beginPath();
    ctx.moveTo(-42, -12);
    ctx.arc(0, -12, 42, 0, Math.PI, false);
    ctx.closePath();
    ctx.stroke();
  },

  CHERRY(ctx) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2f6b1a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 12);
    ctx.quadraticCurveTo(-8, -20, 12, -38);
    ctx.moveTo(20, 16);
    ctx.quadraticCurveTo(18, -14, 12, -38);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, -38, 12, 6, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#3c9a22';
    ctx.fill();
    for (const [x, y] of [
      [-20, 22],
      [20, 26],
    ]) {
      const g = ctx.createRadialGradient(x - 6, y - 6, 2, x, y, 20);
      g.addColorStop(0, '#ff8fa0');
      g.addColorStop(0.4, '#e0102e');
      g.addColorStop(1, '#6b0012');
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4a000c';
      ctx.stroke();
    }
  },

  REPLAY(ctx) {
    roundRect(ctx, -46, -22, 92, 44, 22);
    const g = ctx.createLinearGradient(0, -22, 0, 22);
    g.addColorStop(0, '#5fb8ff');
    g.addColorStop(1, '#0b4fae');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#06275a';
    ctx.stroke();
    ctx.font = 'bold 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('REPLAY', 0, 1);
  },
};

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
