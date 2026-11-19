import { describe, expect, it } from 'vitest';
import { StopController } from '../src/game/control';
import { evaluateLines, REEL_LENGTH } from '../src/game/reels';
import type { BonusFlag, SmallFlag } from '../src/game/types';

const SMALLS: SmallFlag[] = ['NONE', 'REPLAY', 'BELL', 'MELON', 'CHERRY'];
const BONUSES: BonusFlag[] = ['NONE', 'BIG', 'REG'];
const ORDERS = [
  [0, 1, 2],
  [2, 1, 0],
  [1, 0, 2],
];

/** すべての押し位置・押し順で遊んだ結果を集計する */
function playAll(small: SmallFlag, bonus: BonusFlag) {
  const c = new StopController({ small, bonus });
  let illegal = 0;
  let smallHit = 0;
  let bonusHit = 0;
  let total = 0;
  for (const order of ORDERS) {
    for (let a = 0; a < REEL_LENGTH; a++)
      for (let b = 0; b < REEL_LENGTH; b++)
        for (let d = 0; d < REEL_LENGTH; d++) {
          const press = [a, b, d];
          const stops: (number | null)[] = [null, null, null];
          for (const r of order) stops[r] = c.decide(stops, r, press[r]);
          const wins = evaluateLines(stops as number[]);
          total++;
          if (wins.some((w) => !c.isAllowed(w.kind))) illegal++;
          if (wins.some((w) => w.kind === small)) smallHit++;
          if (wins.some((w) => w.kind === bonus)) bonusHit++;
        }
  }
  return { illegal, smallRate: smallHit / total, bonusRate: bonusHit / total };
}

describe('リール制御', () => {
  for (const bonus of BONUSES)
    for (const small of SMALLS) {
      it(`小役=${small} / ボーナス=${bonus}: 成立していない役は揃わない`, () => {
        const r = playAll(small, bonus);
        expect(r.illegal).toBe(0);
        if (bonus === 'NONE' && (small === 'REPLAY' || small === 'BELL')) {
          // リプレイとベルはどこを押しても揃う
          expect(r.smallRate).toBe(1);
        }
        if (bonus !== 'NONE' && small === 'NONE') {
          // ボーナスは目押しが必要だが、適当押しでもある程度は揃う
          expect(r.bonusRate).toBeGreaterThan(0.05);
          expect(r.bonusRate).toBeLessThan(1);
        }
      });
    }
});
