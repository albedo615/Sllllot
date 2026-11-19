import { StopController } from './control';
import { draw, type Rng } from './lottery';
import { evaluateLines, type LineWin } from './reels';
import type { BonusFlag, Flags, Mode, Setting, SmallFlag } from './types';

export const BET = 3;

/** 通常時の払い出し枚数（1ラインあたり） */
export const PAYOUT = { BELL: 8, MELON: 15, CHERRY: 2 } as const;
/** ボーナス中のベル払い出し */
export const BONUS_BELL_PAYOUT = 15;
/** この枚数を超えて払い出したらボーナス終了 */
export const BONUS_LIMIT: Record<'BIG' | 'REG', number> = { BIG: 300, REG: 100 };

export type Phase = 'IDLE' | 'BET' | 'SPINNING';

export interface Stats {
  games: number;
  gamesSinceBonus: number;
  big: number;
  reg: number;
  medalsIn: number;
  medalsOut: number;
  history: { kind: 'BIG' | 'REG'; games: number }[];
}

export interface GameResult {
  wins: LineWin[];
  payout: number;
  replay: boolean;
  /** このゲームでボーナスが揃った */
  bonusStarted: BonusFlag;
  /** このゲームでボーナスが終わった */
  bonusEnded: boolean;
  /** このゲームでボーナスに当選した（告知用） */
  bonusHit: boolean;
}

const controllers = new Map<string, StopController>();
function controllerFor(flags: Flags): StopController {
  const key = `${flags.small}/${flags.bonus}`;
  let c = controllers.get(key);
  if (!c) controllers.set(key, (c = new StopController(flags)));
  return c;
}

export interface MachineState {
  medals: number;
  setting: Setting;
  mode: Mode;
  carriedBonus: BonusFlag;
  bonusPaid: number;
  replayPending: boolean;
  stats: Stats;
}

export const newStats = (): Stats => ({
  games: 0,
  gamesSinceBonus: 0,
  big: 0,
  reg: 0,
  medalsIn: 0,
  medalsOut: 0,
  history: [],
});

export class Machine {
  medals: number;
  setting: Setting;
  mode: Mode;
  carriedBonus: BonusFlag;
  bonusPaid: number;
  replayPending: boolean;
  stats: Stats;

  phase: Phase = 'IDLE';
  stops: (number | null)[] = [null, null, null];
  small: SmallFlag = 'NONE';
  private bonusHitThisGame = false;

  constructor(
    private readonly rng: Rng,
    init: Partial<MachineState> = {},
  ) {
    this.medals = init.medals ?? 1000;
    this.setting = init.setting ?? ((1 + Math.floor(rng() * 6)) as Setting);
    this.mode = init.mode ?? 'NORMAL';
    this.carriedBonus = init.carriedBonus ?? 'NONE';
    this.bonusPaid = init.bonusPaid ?? 0;
    this.replayPending = init.replayPending ?? false;
    this.stats = init.stats ?? newStats();
  }

  snapshot(): MachineState {
    return {
      medals: this.medals,
      setting: this.setting,
      mode: this.mode,
      carriedBonus: this.carriedBonus,
      bonusPaid: this.bonusPaid,
      replayPending: this.replayPending,
      stats: this.stats,
    };
  }

  get flags(): Flags {
    return { small: this.small, bonus: this.carriedBonus };
  }

  /** MAX BET。成功したら true */
  bet(): boolean {
    if (this.phase !== 'IDLE') return false;
    if (!this.replayPending) {
      if (this.medals < BET) return false;
      this.medals -= BET;
      this.stats.medalsIn += BET;
    }
    this.phase = 'BET';
    return true;
  }

  /** レバーオン。成功したら true */
  lever(): boolean {
    if (this.phase === 'IDLE' && !this.bet()) return false;
    if (this.phase !== 'BET') return false;
    this.replayPending = false;
    const result = draw(this.rng, this.setting, this.mode, this.carriedBonus);
    this.small = result.small;
    this.bonusHitThisGame = result.newBonus !== 'NONE';
    if (this.bonusHitThisGame) this.carriedBonus = result.newBonus;
    this.stops = [null, null, null];
    this.phase = 'SPINNING';
    this.stats.games++;
    if (this.mode === 'NORMAL') this.stats.gamesSinceBonus++;
    return true;
  }

  /** 第n停止。press = ボタンを押した瞬間の位置。止まる位置を返す */
  stop(reel: number, press: number): number | null {
    if (this.phase !== 'SPINNING' || this.stops[reel] !== null) return null;
    const stop = controllerFor(this.flags).decide(this.stops, reel, press);
    this.stops[reel] = stop;
    return stop;
  }

  get allStopped(): boolean {
    return this.stops.every((s) => s !== null);
  }

  /** 全リール停止後に呼ぶ。払い出しとボーナスの開始・終了を処理する */
  settle(): GameResult {
    if (this.phase !== 'SPINNING' || !this.allStopped) throw new Error('reels still spinning');
    const wins = evaluateLines(this.stops as number[]);
    const result: GameResult = {
      wins,
      payout: 0,
      replay: false,
      bonusStarted: 'NONE',
      bonusEnded: false,
      bonusHit: this.bonusHitThisGame,
    };

    for (const w of wins) {
      if (w.kind === 'REPLAY') result.replay = true;
      else if (w.kind === 'BELL') result.payout += this.mode === 'NORMAL' ? PAYOUT.BELL : BONUS_BELL_PAYOUT;
      else if (w.kind === 'MELON') result.payout += PAYOUT.MELON;
      else if (w.kind === 'CHERRY') result.payout += PAYOUT.CHERRY;
      else if (w.kind === 'BIG' || w.kind === 'REG') result.bonusStarted = w.kind;
    }

    this.medals += result.payout;
    this.stats.medalsOut += result.payout;

    if (this.mode !== 'NORMAL') {
      this.bonusPaid += result.payout;
      if (this.bonusPaid > BONUS_LIMIT[this.mode]) {
        this.mode = 'NORMAL';
        this.bonusPaid = 0;
        result.bonusEnded = true;
      }
    } else if (result.bonusStarted !== 'NONE') {
      const kind = result.bonusStarted as 'BIG' | 'REG';
      this.mode = kind;
      this.bonusPaid = 0;
      this.carriedBonus = 'NONE';
      this.stats[kind === 'BIG' ? 'big' : 'reg']++;
      this.stats.history.unshift({ kind, games: this.stats.gamesSinceBonus });
      this.stats.history.length = Math.min(this.stats.history.length, 20);
      this.stats.gamesSinceBonus = 0;
    }

    this.replayPending = result.replay;
    this.phase = 'IDLE';
    return result;
  }
}
