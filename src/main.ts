import { Machine, newStats, type MachineState } from './game/machine';
import type { Setting } from './game/types';
import { ReelView } from './ui/reelView';
import { Sound } from './ui/sound';
import './style.css';

const STORAGE_KEY = 'sllllot-v1';
/** レバーオンから次のレバーオンまでの最短間隔（ミリ秒） */
const MIN_GAME_INTERVAL = 700;

interface Saved {
  machine: MachineState;
  settingHidden: boolean;
  muted: boolean;
  reelPos: number[];
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const saved = load();
const machine = new Machine(Math.random, saved?.machine);
let settingHidden = saved?.settingHidden ?? true;
const sound = new Sound();
sound.muted = saved?.muted ?? false;
const view = new ReelView($<HTMLCanvasElement>('reels'), saved?.reelPos ?? [5, 9, 3]);
const reelPos = saved?.reelPos?.slice() ?? [5, 9, 3];
const debug = new URLSearchParams(location.search).has('debug');

let lastLever = -Infinity;
let lastPayout = 0;

function save() {
  try {
    const data: Saved = { machine: machine.snapshot(), settingHidden, muted: sound.muted, reelPos };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 保存できない環境（プライベートモードなど）でも遊べるようにする
  }
}

// ---- 操作 ----

function bet() {
  if (machine.replayPending) return;
  if (machine.bet()) {
    sound.bet();
    render();
  }
}

function lever() {
  const now = performance.now();
  if (now - lastLever < MIN_GAME_INTERVAL) return;
  if (!machine.lever()) return;
  lastLever = now;
  lastPayout = 0;
  sound.lever();
  view.startAll();
  render();
  // 全速になったら停止ボタンを有効化
  setTimeout(render, 260);
}

function stop(reel: number) {
  if (!view.canStop(reel)) return;
  const target = machine.stop(reel, view.pressPosition(reel));
  if (target === null) return;
  reelPos[reel] = target;
  view.stopAt(reel, target);
  render();
}

view.onReelStopped = () => {
  sound.stop();
  if (!machine.allStopped || machine.phase !== 'SPINNING') return;
  // 最後のリールが止まったら精算
  const wasLampOff = !$('lamp-bonus').classList.contains('on');
  const result = machine.settle();
  lastPayout = result.payout;
  view.showWins(result.wins.map((w) => w.line));

  if (result.bonusStarted !== 'NONE') sound.bonusStart();
  else if (result.bonusEnded) sound.bonusEnd();
  else if (result.payout > 0) sound.small();
  else if (result.replay) sound.replay();

  if (wasLampOff && machine.carriedBonus !== 'NONE') setTimeout(() => sound.lamp(), 120);

  render();
  save();
};

// ---- 表示 ----

function render() {
  const s = machine.stats;
  $('d-medals').textContent = String(machine.medals);
  const inBonus = machine.mode !== 'NORMAL';
  $('d-mid-label').textContent = inBonus ? 'BONUS' : 'GAME';
  $('d-mid').textContent = String(inBonus ? machine.bonusPaid : s.gamesSinceBonus);
  $('d-payout').textContent = String(lastPayout);

  const banner = $('mode-banner');
  banner.hidden = !inBonus;
  banner.className = 'mode-banner ' + machine.mode.toLowerCase();
  banner.textContent = machine.mode === 'BIG' ? 'BIG BONUS' : 'REGULAR BONUS';

  // ボーナス当選は、そのゲームのリールがすべて止まってから点灯（後告知）
  const lampOn = machine.carriedBonus !== 'NONE' && machine.phase === 'IDLE';
  const lamp = $('lamp-bonus');
  if (lampOn) lamp.classList.add('on');
  else if (machine.carriedBonus === 'NONE') lamp.classList.remove('on');

  $('lamp-replay').classList.toggle('on', machine.replayPending);
  $('lamp-bet').classList.toggle('on', machine.phase === 'BET' || machine.replayPending);

  const idle = machine.phase === 'IDLE';
  $<HTMLButtonElement>('btn-bet').disabled = !idle || machine.replayPending || machine.medals < 3;
  $<HTMLButtonElement>('btn-lever').disabled =
    machine.phase === 'SPINNING' || (idle && !machine.replayPending && machine.medals < 3);
  document.querySelectorAll<HTMLButtonElement>('.btn-stop').forEach((b) => {
    b.disabled = !view.canStop(Number(b.dataset.reel));
  });

  // データ
  $('s-games').textContent = String(s.games);
  $('s-since').textContent = String(s.gamesSinceBonus);
  $('s-big').textContent = String(s.big);
  $('s-reg').textContent = String(s.reg);
  $('s-combined').textContent = s.big + s.reg ? `1/${(s.games / (s.big + s.reg)).toFixed(1)}` : '-';
  const diff = s.medalsOut - s.medalsIn;
  $('s-diff').textContent = (diff > 0 ? '+' : '') + diff;
  $('s-rate').textContent = s.medalsIn ? `${((s.medalsOut / s.medalsIn) * 100).toFixed(1)}%` : '-';
  $('history').innerHTML = s.history
    .map((h) => `<li class="${h.kind.toLowerCase()}">${h.kind} ${h.games}G</li>`)
    .join('');

  $<HTMLSelectElement>('setting').value = settingHidden ? 'hidden' : String(machine.setting);
  $('btn-sound').textContent = `音: ${sound.muted ? 'OFF' : 'ON'}`;

  if (debug) {
    const d = $('debug');
    d.hidden = false;
    d.textContent = `設定${machine.setting} / 小役 ${machine.small} / ボーナス ${machine.carriedBonus} / ${machine.mode}`;
  }
}

// ---- 入力 ----

$('btn-bet').addEventListener('click', bet);
$('btn-lever').addEventListener('click', lever);
document.querySelectorAll<HTMLButtonElement>('.btn-stop').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stop(Number(b.dataset.reel));
  });
});

const KEY_STOP: Record<string, number> = { j: 0, k: 1, l: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 };
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement || e.repeat) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    lever();
  } else if (e.key === 'b' || e.key === 'ArrowUp') {
    e.preventDefault();
    bet();
  } else if (e.key in KEY_STOP) {
    e.preventDefault();
    stop(KEY_STOP[e.key]);
  }
});

$<HTMLSelectElement>('setting').addEventListener('change', (e) => {
  const v = (e.target as HTMLSelectElement).value;
  if (v === 'hidden') {
    settingHidden = true;
    machine.setting = (1 + Math.floor(Math.random() * 6)) as Setting;
  } else {
    settingHidden = false;
    machine.setting = Number(v) as Setting;
  }
  $('reveal').textContent = '';
  render();
  save();
});

$('btn-reveal').addEventListener('click', () => {
  $('reveal').textContent = `この台は 設定${machine.setting} です。`;
});

$('btn-refill').addEventListener('click', () => {
  // 補充分は差枚数に含めない
  machine.medals += 1000;
  render();
  save();
});

$('btn-sound').addEventListener('click', () => {
  sound.muted = !sound.muted;
  render();
  save();
});

$('btn-reset').addEventListener('click', () => {
  if (machine.phase !== 'IDLE') return;
  if (!confirm('データとメダルをリセットしますか？（設定も選び直されます）')) return;
  machine.stats = newStats();
  machine.medals = 1000;
  machine.mode = 'NORMAL';
  machine.carriedBonus = 'NONE';
  machine.bonusPaid = 0;
  machine.replayPending = false;
  if (settingHidden) machine.setting = (1 + Math.floor(Math.random() * 6)) as Setting;
  lastPayout = 0;
  $('reveal').textContent = '';
  render();
  save();
});

render();
