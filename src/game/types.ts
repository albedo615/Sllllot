/** 図柄 */
export type Sym = 'SEVEN' | 'BAR' | 'BELL' | 'MELON' | 'CHERRY' | 'REPLAY';

/** 小役フラグ（1ゲームごとに抽選） */
export type SmallFlag = 'NONE' | 'REPLAY' | 'BELL' | 'MELON' | 'CHERRY';

/** ボーナスフラグ（揃うまで持ち越す） */
export type BonusFlag = 'NONE' | 'BIG' | 'REG';

/** 揃った役の種類 */
export type WinKind = 'BIG' | 'REG' | 'REPLAY' | 'BELL' | 'MELON' | 'CHERRY';

export interface Flags {
  small: SmallFlag;
  bonus: BonusFlag;
}

export type Mode = 'NORMAL' | 'BIG' | 'REG';

/** 設定 1〜6 */
export type Setting = 1 | 2 | 3 | 4 | 5 | 6;
