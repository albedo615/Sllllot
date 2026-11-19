import { evaluateLines, MAX_SLIP, mod, REEL_LENGTH } from './reels';
import type { Flags, WinKind } from './types';

interface Value {
  /** 1 = どう押してもフラグ外の役が揃わない */
  safe: number;
  /** フラグ内の役が揃う見込み（大きいほど良い） */
  score: number;
}

const better = (a: Value, b: Value) =>
  a.safe !== b.safe ? a.safe > b.safe : a.score > b.score + 1e-9;

/**
 * リール制御。
 * 押した位置から最大 4 コマまで滑らせ、
 *  1. 成立していない役は絶対に揃えない
 *  2. 成立している役はできるだけ揃える
 * ように停止位置を選ぶ。残りのリールがどう押されるかも先読みして判断する。
 */
export class StopController {
  private memo = new Map<string, Value>();

  constructor(private readonly flags: Flags) {}

  isAllowed(kind: WinKind): boolean {
    if (kind === 'BIG' || kind === 'REG') return this.flags.bonus === kind;
    return this.flags.small === kind;
  }

  /** 押した位置 press からの停止位置を決める */
  decide(stops: readonly (number | null)[], reel: number, press: number): number {
    return this.bestSlip(stops, reel, press).stop;
  }

  private bestSlip(stops: readonly (number | null)[], reel: number, press: number) {
    let best: { stop: number; value: Value } | null = null;
    for (let k = 0; k <= MAX_SLIP; k++) {
      const stop = mod(press - k);
      const next = stops.slice();
      next[reel] = stop;
      const value = this.value(next);
      if (!best || better(value, best.value)) best = { stop, value };
    }
    return best!;
  }

  private value(stops: readonly (number | null)[]): Value {
    const key = stops.map((s) => (s === null ? '-' : s)).join(',');
    const cached = this.memo.get(key);
    if (cached) return cached;

    let result: Value;
    const remaining = [0, 1, 2].filter((r) => stops[r] === null);
    if (remaining.length === 0) {
      result = this.final(stops as number[]);
    } else {
      // 次にどのリールを、どの位置で押されるか分からないので、
      // safe は最悪ケース、score は平均で評価する
      let safe = 1;
      let score = 0;
      for (const reel of remaining) {
        for (let press = 0; press < REEL_LENGTH; press++) {
          const v = this.bestSlip(stops, reel, press).value;
          safe = Math.min(safe, v.safe);
          score += v.score;
        }
      }
      result = { safe, score: score / (remaining.length * REEL_LENGTH) };
    }
    this.memo.set(key, result);
    return result;
  }

  private final(stops: number[]): Value {
    const wins = evaluateLines(stops);
    if (wins.some((w) => !this.isAllowed(w.kind))) return { safe: 0, score: 0 };
    let score = 0;
    if (wins.some((w) => w.kind === 'BIG' || w.kind === 'REG')) score += 10;
    if (wins.some((w) => w.kind !== 'BIG' && w.kind !== 'REG')) score += 5;
    return { safe: 1, score };
  }
}
