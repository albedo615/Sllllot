import type { Sym, WinKind } from './types';

export const REEL_LENGTH = 21;
export const MAX_SLIP = 4;

const map: Record<string, Sym> = {
  '7': 'SEVEN',
  X: 'BAR',
  B: 'BELL',
  M: 'MELON',
  C: 'CHERRY',
  R: 'REPLAY',
};

const parse = (s: string): Sym[] => s.split(' ').map((c) => map[c]);

/**
 * リール配列（index 0 から順）。
 * 窓には strip[s], strip[s+1], strip[s+2] が上段・中段・下段として見える。
 * リールは下方向に回るので、回転が進むと s が 1 ずつ減る。
 */
export const STRIPS: Sym[][] = [
  parse('7 R B M C R B X R B M R B 7 C R B M R B X'),
  parse('7 B R C M B R X B R M B R 7 B R C M B R X'),
  parse('7 R M B R C B X R B M R B 7 R B M R C B X'),
];

/** 有効ライン（各リールの段: 0=上, 1=中, 2=下） */
export const LINES: readonly (readonly [number, number, number])[] = [
  [1, 1, 1], // 中段
  [0, 0, 0], // 上段
  [2, 2, 2], // 下段
  [0, 1, 2], // 右下がり
  [2, 1, 0], // 右上がり
];

export const mod = (n: number, m = REEL_LENGTH): number => ((n % m) + m) % m;

export function symbolAt(reel: number, stop: number, row: number): Sym {
  return STRIPS[reel][mod(stop + row)];
}

export interface LineWin {
  line: number;
  kind: WinKind;
}

const TRIPLE: Partial<Record<Sym, WinKind>> = {
  SEVEN: 'BIG',
  BAR: 'REG',
  REPLAY: 'REPLAY',
  BELL: 'BELL',
  MELON: 'MELON',
};

/** 3リールの停止位置から、成立しているライン上の役を列挙する */
export function evaluateLines(stops: readonly number[]): LineWin[] {
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const a = symbolAt(0, stops[0], rows[0]);
    const b = symbolAt(1, stops[1], rows[1]);
    const c = symbolAt(2, stops[2], rows[2]);
    if (a === 'CHERRY') {
      wins.push({ line, kind: 'CHERRY' });
    } else if (a === b && b === c && TRIPLE[a]) {
      wins.push({ line, kind: TRIPLE[a]! });
    }
  });
  return wins;
}
