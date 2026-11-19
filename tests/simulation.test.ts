import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/game/lottery';
import { Machine } from '../src/game/machine';
import { REEL_LENGTH } from '../src/game/reels';
import type { Setting } from '../src/game/types';

const GAMES = 300_000;

/** 適当押し（押し順・押し位置ともランダム）で遊んだときの機械割 */
function simulate(setting: Setting, seed: number) {
  const rng = seededRng(seed);
  const press = seededRng(seed ^ 0x9e3779b9);
  const m = new Machine(rng, { setting, medals: 1e9 });
  for (let g = 0; g < GAMES; g++) {
    m.lever();
    const order = press() < 0.5 ? [0, 1, 2] : [2, 1, 0];
    for (const r of order) m.stop(r, Math.floor(press() * REEL_LENGTH));
    m.settle();
  }
  return m.stats;
}

describe('機械割シミュレーション', () => {
  const rates: number[] = [];
  for (const setting of [1, 2, 3, 4, 5, 6] as Setting[]) {
    it(`設定${setting}`, () => {
      const s = simulate(setting, setting * 7919);
      const rate = s.medalsOut / s.medalsIn;
      rates.push(rate);
      console.log(
        `設定${setting}: 機械割 ${(rate * 100).toFixed(1)}%  ` +
          `BIG 1/${(s.games / s.big).toFixed(0)}  REG 1/${(s.games / s.reg).toFixed(0)}`,
      );
      expect(rate).toBeGreaterThan(0.9);
      expect(rate).toBeLessThan(1.15);
    }, 120_000);
  }
  it('高設定ほど出る', () => {
    expect(rates[5]).toBeGreaterThan(rates[0]);
  });
});
