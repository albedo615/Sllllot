import type { BonusFlag, Mode, Setting, SmallFlag } from './types';

/** 乱数の分母（実機と同じく 0〜65535 の乱数で抽選する） */
export const RANGE = 65536;

/** 設定ごとのボーナス当選値（/65536） */
export const BONUS_TABLE: Record<Setting, { BIG: number; REG: number }> = {
  1: { BIG: 228, REG: 164 }, // BIG 1/287.4  REG 1/399.6
  2: { BIG: 234, REG: 172 }, // BIG 1/280.1  REG 1/381.0
  3: { BIG: 243, REG: 187 }, // BIG 1/269.7  REG 1/350.5
  4: { BIG: 252, REG: 205 }, // BIG 1/260.1  REG 1/319.7
  5: { BIG: 262, REG: 226 }, // BIG 1/250.1  REG 1/290.0
  6: { BIG: 287, REG: 260 }, // BIG 1/228.3  REG 1/252.1
};

/** 通常時の小役当選値（/65536、全設定共通） */
export const SMALL_TABLE: Record<Exclude<SmallFlag, 'NONE'>, number> = {
  REPLAY: 8978, // 1/7.3
  BELL: 10240, // 1/6.4
  MELON: 728, // 1/90.0
  CHERRY: 1311, // 1/50.0
};

/** ボーナス中のベル当選値（/65536） */
export const BONUS_BELL = 58982; // 約 90%

export type Rng = () => number;

/** テスト用のシード付き乱数（mulberry32） */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DrawResult {
  small: SmallFlag;
  /** このゲームで新たに当選したボーナス */
  newBonus: BonusFlag;
}

/**
 * レバーオン時の抽選。
 * carried: 前ゲームから持ち越しているボーナス（持ち越し中は新たなボーナス抽選をしない）
 */
export function draw(rng: Rng, setting: Setting, mode: Mode, carried: BonusFlag): DrawResult {
  const r = Math.floor(rng() * RANGE);

  if (mode !== 'NORMAL') {
    return { small: r < BONUS_BELL ? 'BELL' : 'NONE', newBonus: 'NONE' };
  }

  let acc = 0;
  const bonus = BONUS_TABLE[setting];
  if (r < (acc += bonus.BIG)) return carried === 'NONE' ? { small: 'NONE', newBonus: 'BIG' } : none();
  if (r < (acc += bonus.REG)) return carried === 'NONE' ? { small: 'NONE', newBonus: 'REG' } : none();
  for (const [flag, n] of Object.entries(SMALL_TABLE) as [SmallFlag, number][]) {
    if (r < (acc += n)) return { small: flag, newBonus: 'NONE' };
  }
  return none();
}

const none = (): DrawResult => ({ small: 'NONE', newBonus: 'NONE' });
