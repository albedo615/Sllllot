/** WebAudio で鳴らす簡単な効果音 */
export class Sound {
  private ctx: AudioContext | null = null;
  muted = false;

  private get ac(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08) {
    const ac = this.ac;
    if (!ac) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private seq(notes: number[], step: number, dur = step * 0.9, type: OscillatorType = 'square', vol = 0.08) {
    notes.forEach((n, i) => n > 0 && this.tone(n, i * step, dur, type, vol));
  }

  bet() {
    this.tone(1320, 0, 0.05, 'square', 0.05);
  }
  lever() {
    this.tone(660, 0, 0.12, 'triangle', 0.12);
  }
  stop() {
    this.tone(180, 0, 0.06, 'square', 0.1);
  }
  replay() {
    this.seq([988, 1319], 0.07);
  }
  small() {
    this.seq([1047, 1319, 1568, 2093], 0.05);
  }
  lamp() {
    this.seq([1568, 2093, 2637], 0.04, 0.4, 'sine', 0.12);
  }
  bonusStart() {
    this.seq([523, 659, 784, 1047, 0, 784, 1047, 1319, 1568], 0.11, 0.1, 'square', 0.07);
  }
  bonusEnd() {
    this.seq([1047, 988, 880, 784, 1047], 0.15, 0.14, 'triangle', 0.1);
  }
}
