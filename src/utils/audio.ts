export type MusicScene = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface MusicDynamicState {
  scene: MusicScene;
  combo: number;
  urgent: boolean;
  endgame: boolean;
}

export interface MusicAdaptiveProfile {
  bpm: number;
  gainMultiplier: number;
  filterCutoffHz: number;
  pitchSemitoneShift: number;
  enableBass: boolean;
  enablePercussion: boolean;
  sparkleIntensity: number; // 0..3
  urgentPulse: boolean;
}

export function computeMusicAdaptiveProfile(state: MusicDynamicState): MusicAdaptiveProfile {
  const combo = Math.max(0, Math.min(5, Math.floor(state.combo)));

  if (state.scene === 'paused') {
    return {
      bpm: 52,
      gainMultiplier: 0.42,
      filterCutoffHz: 520,
      pitchSemitoneShift: 0,
      enableBass: true,
      enablePercussion: false,
      sparkleIntensity: 0,
      urgentPulse: false,
    };
  }

  if (state.scene === 'won') {
    return {
      bpm: 60,
      gainMultiplier: 0.35,
      filterCutoffHz: 1900,
      pitchSemitoneShift: 2,
      enableBass: true,
      enablePercussion: false,
      sparkleIntensity: 2,
      urgentPulse: false,
    };
  }

  if (state.scene === 'lost') {
    return {
      bpm: 50,
      gainMultiplier: 0.28,
      filterCutoffHz: 660,
      pitchSemitoneShift: 0,
      enableBass: false,
      enablePercussion: false,
      sparkleIntensity: 0,
      urgentPulse: false,
    };
  }

  if (state.scene === 'menu') {
    return {
      bpm: 58,
      gainMultiplier: 0.85,
      filterCutoffHz: 1450,
      pitchSemitoneShift: 0,
      enableBass: false,
      enablePercussion: false,
      sparkleIntensity: 1,
      urgentPulse: false,
    };
  }

  // Active gameplay ('playing') — slow, mysterious, atmospheric minor groove
  const comboBpmBoost = combo >= 4 ? 4 : combo >= 2 ? 2 : 0;
  const urgentBpmBoost = state.urgent ? 12 : 0;
  const endgameBpmBoost = state.endgame && !state.urgent ? 3 : 0;

  return {
    bpm: 64 + comboBpmBoost + urgentBpmBoost + endgameBpmBoost,
    gainMultiplier: 1,
    filterCutoffHz: state.urgent ? 2150 : combo >= 3 ? 1850 : 1600,
    pitchSemitoneShift: state.endgame ? 2 : 0,
    enableBass: true,
    enablePercussion: true,
    sparkleIntensity: combo >= 4 ? 3 : combo >= 2 ? 2 : state.endgame ? 2 : 1,
    urgentPulse: state.urgent,
  };
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicFilterNode: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Interactive adaptive music state
  private musicEnabled = true;
  private musicVolume = 0.55;
  private musicTimer: number | null = null;
  private musicNextNoteTime = 0;
  private musicStep = 0;
  private pageHidden = false;
  private musicDuckUntilMs = 0;
  private musicDynamic: MusicDynamicState = {
    scene: 'menu',
    combo: 0,
    urgent: false,
    endgame: false,
  };

  private getContext(): { ctx: AudioContext; bus: GainNode } | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      compressor.knee.setValueAtTime(18, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.16, this.ctx.currentTime);

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.88, this.ctx.currentTime);
      master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.masterBus = master;

      const profile = computeMusicAdaptiveProfile(this.musicDynamic);
      const musicFilter = this.ctx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.setValueAtTime(profile.filterCutoffHz, this.ctx.currentTime);
      musicFilter.Q.setValueAtTime(0.85, this.ctx.currentTime);
      this.musicFilterNode = musicFilter;

      const musicGain = this.ctx.createGain();
      musicGain.gain.setValueAtTime(this.computeTargetMusicGain(), this.ctx.currentTime);
      musicGain.connect(musicFilter);
      musicFilter.connect(this.ctx.destination);
      this.musicBus = musicGain;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.syncMusicPlayback();
      }).catch(() => {});
    }

    if (!this.masterBus) return null;
    return { ctx: this.ctx, bus: this.masterBus };
  }

  private computeTargetMusicGain(): number {
    if (!this.musicEnabled || this.pageHidden) return 0;
    const clamped = Math.max(0, Math.min(1, this.musicVolume));
    if (clamped <= 0) return 0;
    const profile = computeMusicAdaptiveProfile(this.musicDynamic);
    const duckFactor = Date.now() < this.musicDuckUntilMs ? 0.35 : 1;
    return clamped * 0.27 * profile.gainMultiplier * duckFactor;
  }

  /**
   * Synchronously initializes and resumes the shared AudioContext during a
   * user gesture so subsequent async voice buffers & background music play with zero autoplay block.
   */
  unlock() {
    const audio = this.getContext();
    if (!audio) return;
    if (audio.ctx.state === 'suspended') {
      audio.ctx.resume().then(() => {
        this.syncMusicPlayback();
      }).catch(() => {});
    } else {
      this.syncMusicPlayback();
    }
  }

  setMusicSettings(params: { enabled: boolean; volume: number }) {
    this.musicEnabled = Boolean(params.enabled);
    this.musicVolume = Number.isFinite(params.volume)
      ? Math.max(0, Math.min(1, params.volume))
      : 0.55;
    this.syncMusicPlayback();
  }

  setMusicContext(patch: Partial<MusicDynamicState>) {
    this.musicDynamic = {
      ...this.musicDynamic,
      ...patch,
    };
    this.syncMusicPlayback();
  }

  setPageHidden(hidden: boolean) {
    this.pageHidden = hidden;
    this.syncMusicPlayback();
  }

  getMusicState() {
    const profile = computeMusicAdaptiveProfile(this.musicDynamic);
    return {
      enabled: this.musicEnabled,
      volume: this.musicVolume,
      isPlaying: this.musicTimer !== null && this.computeTargetMusicGain() > 0,
      contextState: this.ctx?.state ?? 'uninitialized',
      dynamic: this.musicDynamic,
      profile,
    };
  }

  private syncMusicPlayback() {
    if (typeof window === 'undefined') return;
    const targetGain = this.computeTargetMusicGain();
    const profile = computeMusicAdaptiveProfile(this.musicDynamic);

    if (this.ctx && this.musicBus) {
      this.musicBus.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
    if (this.ctx && this.musicFilterNode) {
      this.musicFilterNode.frequency.setTargetAtTime(
        profile.filterCutoffHz,
        this.ctx.currentTime,
        0.12
      );
    }

    const shouldSchedule =
      targetGain > 0 && this.ctx !== null && this.ctx.state === 'running';

    if (shouldSchedule && this.musicTimer === null) {
      this.startMusicScheduler();
    } else if ((!shouldSchedule || targetGain <= 0) && this.musicTimer !== null) {
      this.stopMusicScheduler();
    }
  }

  private duckMusicTemporarily(durationMs = 1500) {
    this.musicDuckUntilMs = Date.now() + durationMs;
    this.syncMusicPlayback();
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (Date.now() >= this.musicDuckUntilMs - 40) {
          this.syncMusicPlayback();
        }
      }, durationMs + 50);
    }
  }

  private triggerMusicFilterWobble() {
    if (!this.ctx || !this.musicFilterNode || !this.musicEnabled || this.musicVolume <= 0) {
      return;
    }
    const now = this.ctx.currentTime;
    const normalCutoff = computeMusicAdaptiveProfile(this.musicDynamic).filterCutoffHz;
    this.musicFilterNode.frequency.cancelScheduledValues(now);
    this.musicFilterNode.frequency.setTargetAtTime(420, now, 0.03);
    this.musicFilterNode.frequency.setTargetAtTime(normalCutoff, now + 0.24, 0.14);
  }

  private triggerMusicSparkle(combo = 1) {
    if (
      !this.ctx ||
      !this.musicBus ||
      !this.musicEnabled ||
      this.musicVolume <= 0 ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const ctx = this.ctx;
    const bus = this.musicBus;
    const profile = computeMusicAdaptiveProfile(this.musicDynamic);
    const ratio = Math.pow(2, profile.pitchSemitoneShift / 12);
    const basePool = [587.33, 698.46, 880.0, 1046.5, 1174.66]; // D minor ethereal sparkle
    const idx = Math.min(basePool.length - 2, Math.max(0, combo - 1));
    const notes = [basePool[idx] * ratio, basePool[idx + 1] * ratio];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const delay = i * 0.095;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(0.072, now + delay + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.52);

      osc.connect(g);
      g.connect(bus);
      osc.start(now + delay);
      osc.stop(now + delay + 0.56);
    });
  }

  private startMusicScheduler() {
    if (!this.ctx || !this.musicBus || this.musicTimer !== null) return;
    this.musicNextNoteTime = Math.max(this.ctx.currentTime + 0.05, this.musicNextNoteTime);

    const scheduleAhead = () => {
      if (!this.ctx || !this.musicBus) return;
      if (this.computeTargetMusicGain() <= 0 || this.ctx.state !== 'running') {
        this.stopMusicScheduler();
        return;
      }

      const horizon = this.ctx.currentTime + 0.65;
      while (this.musicNextNoteTime < horizon) {
        const profile = computeMusicAdaptiveProfile(this.musicDynamic);
        const stepDurSec = 60 / profile.bpm / 2; // Slow, unhurried eighth-note pulse
        this.scheduleMusicStep(this.musicStep, this.musicNextNoteTime, stepDurSec, profile);
        this.musicNextNoteTime += stepDurSec;
        this.musicStep = (this.musicStep + 1) % 32;
      }
    };

    scheduleAhead();
    this.musicTimer = window.setInterval(scheduleAhead, 160);
  }

  private stopMusicScheduler() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private getCurrentChordNotes(step: number, pitchShiftSemitones: number): number[] {
    // Mysterious dark atmospheric progression: Dm9 -> Bbmaj7#11 -> Gm9 -> A7(b9/b13)
    const baseChords: number[][] = [
      [146.83, 220.0, 261.63, 329.63],  // Dm9 (D3, A3, C4, E4)
      [116.54, 174.61, 220.0, 329.63],  // Bbmaj7#11 (Bb2, F3, A3, E4)
      [98.0, 146.83, 174.61, 220.0],    // Gm9 (G2, D3, F3, A3)
      [110.0, 164.81, 207.65, 293.66],  // A7b9sus / Harmonic Minor pull (A2, E3, G#3, D4)
    ];
    const barIdx = Math.floor(step / 8) % baseChords.length;
    const ratio = Math.pow(2, pitchShiftSemitones / 12);
    return baseChords[barIdx].map((f) => f * ratio);
  }

  private scheduleMusicStep(
    step: number,
    when: number,
    stepDur: number,
    profile: MusicAdaptiveProfile
  ) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const bus = this.musicBus;
    const ratio = Math.pow(2, profile.pitchSemitoneShift / 12);
    const chord = this.getCurrentChordNotes(step, profile.pitchSemitoneShift);

    // 1. Lush, slow detuned ambient pad on the start of each bar
    if (step % 8 === 0) {
      const padDur = stepDur * 7.8;
      chord.forEach((freq, idx) => {
        const detunes = idx === 0 ? [0] : [-4.5, 4.5];
        detunes.forEach((detuneCents) => {
          const osc = ctx.createOscillator();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, when);
          osc.detune.setValueAtTime(detuneCents, when);

          const g = ctx.createGain();
          const peak = idx === 0 ? 0.052 : 0.017;
          g.gain.setValueAtTime(0.0001, when);
          g.gain.linearRampToValueAtTime(peak, when + Math.min(0.65, stepDur * 1.4));
          g.gain.setValueAtTime(peak * 0.85, when + padDur * 0.55);
          g.gain.exponentialRampToValueAtTime(0.0001, when + padDur);

          osc.connect(g);
          g.connect(bus);
          osc.start(when);
          osc.stop(when + padDur + 0.08);
        });
      });
    }

    // 2. Sparse, haunting glass celesta / music-box arpeggio in slow waves
    const sparseMask = [1, 0, 0, 1, 0, 0, 1, 0];
    if (sparseMask[step % 8] === 1) {
      const arpOrder = [0, 0, 0, 2, 0, 0, 3, 0];
      const noteFreq = chord[arpOrder[step % 8]] * 2;
      const tailDur = step % 8 === 6 ? stepDur * 2.4 : stepDur * 1.9;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, when);

      const shimmer = ctx.createOscillator();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(noteFreq * 2, when);

      const gArp = ctx.createGain();
      const peak = step % 8 === 0 ? 0.048 : 0.036;
      gArp.gain.setValueAtTime(0.0001, when);
      gArp.gain.exponentialRampToValueAtTime(peak, when + 0.028);
      gArp.gain.exponentialRampToValueAtTime(0.0001, when + tailDur);

      const gShim = ctx.createGain();
      gShim.gain.setValueAtTime(0.0001, when);
      gShim.gain.exponentialRampToValueAtTime(peak * 0.22, when + 0.018);
      gShim.gain.exponentialRampToValueAtTime(0.0001, when + tailDur * 0.55);

      osc.connect(gArp);
      shimmer.connect(gShim);
      gArp.connect(bus);
      gShim.connect(bus);

      osc.start(when);
      shimmer.start(when);
      osc.stop(when + tailDur + 0.06);
      shimmer.stop(when + tailDur * 0.6 + 0.06);
    }

    // 3. Slow, enigmatic minor melody motif (D harmonic/natural minor)
    const mysteryMelody: (number | null)[] = [
      587.33, null, null, 698.46, null, 659.25, null, 554.37,
      587.33, null, null, null, 440.0, null, 466.16, null,
      392.0, null, null, 466.16, null, 440.0, null, 415.3,
      329.63, null, 349.23, null, 554.37, null, null, null,
    ];
    const melNote = mysteryMelody[step];
    if (melNote) {
      const freq = melNote * ratio;
      const noteDur = step % 8 === 0 ? stepDur * 2.8 : stepDur * 1.9;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);

      const ghost = ctx.createOscillator();
      ghost.type = 'triangle';
      ghost.frequency.setValueAtTime(freq, when + 0.006);
      ghost.detune.setValueAtTime(6, when);

      const gMain = ctx.createGain();
      const accent = step % 8 === 0 ? 0.088 : 0.065;
      gMain.gain.setValueAtTime(0.0001, when);
      gMain.gain.linearRampToValueAtTime(accent, when + 0.035);
      gMain.gain.exponentialRampToValueAtTime(0.0001, when + noteDur);

      const gGhost = ctx.createGain();
      gGhost.gain.setValueAtTime(0.0001, when + 0.006);
      gGhost.gain.linearRampToValueAtTime(accent * 0.35, when + 0.055);
      gGhost.gain.exponentialRampToValueAtTime(0.0001, when + noteDur * 0.9);

      osc.connect(gMain);
      ghost.connect(gGhost);
      gMain.connect(bus);
      gGhost.connect(bus);

      osc.start(when);
      ghost.start(when + 0.006);
      osc.stop(when + noteDur + 0.06);
      ghost.stop(when + noteDur + 0.06);
    }

    // 4. Deep resonant slow sub-drone bass during gameplay/pause
    if (profile.enableBass && (step % 8 === 0 || step % 8 === 4)) {
      const bassFreq = step % 8 === 0 ? chord[0] * 0.5 : chord[1] * 0.5;
      const bassDur = step % 8 === 0 ? stepDur * 3.5 : stepDur * 2.6;
      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, when);

      const gBass = ctx.createGain();
      gBass.gain.setValueAtTime(0.0001, when);
      gBass.gain.linearRampToValueAtTime(step % 8 === 0 ? 0.13 : 0.085, when + 0.09);
      gBass.gain.exponentialRampToValueAtTime(0.0001, when + bassDur);

      bassOsc.connect(gBass);
      gBass.connect(bus);
      bassOsc.start(when);
      bassOsc.stop(when + bassDur + 0.06);
    }

    // 5. Soft hypnotic heartbeat & dark atmospheric breath (active gameplay only)
    if (profile.enablePercussion) {
      if (step % 8 === 0 || step % 8 === 6) {
        const heart = ctx.createOscillator();
        heart.type = 'sine';
        heart.frequency.setValueAtTime(step % 8 === 0 ? 84 : 70, when);
        heart.frequency.exponentialRampToValueAtTime(38, when + 0.16);

        const gHeart = ctx.createGain();
        const peak = profile.urgentPulse ? 0.12 : 0.075;
        gHeart.gain.setValueAtTime(0.0001, when);
        gHeart.gain.exponentialRampToValueAtTime(peak, when + 0.015);
        gHeart.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);

        heart.connect(gHeart);
        gHeart.connect(bus);
        heart.start(when);
        heart.stop(when + 0.24);
      }

      if (step % 8 === 4) {
        const src = ctx.createBufferSource();
        src.buffer = this.getNoiseBuffer(ctx);

        const lp = ctx.createBiquadFilter();
        lp.type = 'bandpass';
        lp.frequency.setValueAtTime(1600, when);
        lp.Q.setValueAtTime(1.4, when);

        const gBreath = ctx.createGain();
        gBreath.gain.setValueAtTime(0.0001, when);
        gBreath.gain.linearRampToValueAtTime(0.018, when + 0.08);
        gBreath.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);

        src.connect(lp);
        lp.connect(gBreath);
        gBreath.connect(bus);
        src.start(when);
        src.stop(when + 0.26);
      }
    }

    // 6. Mysterious distant chime harmonics on combo momentum
    const shouldSparkle =
      (profile.sparkleIntensity >= 3 && step % 4 === 2) ||
      (profile.sparkleIntensity === 2 && step % 8 === 5) ||
      (profile.sparkleIntensity === 1 && step % 16 === 11);

    if (shouldSparkle) {
      const sparkleFreq = chord[(step + 1) % chord.length] * 4;
      const bell = ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(sparkleFreq, when);

      const gBell = ctx.createGain();
      const bellPeak = profile.sparkleIntensity >= 3 ? 0.044 : 0.028;
      gBell.gain.setValueAtTime(0.0001, when);
      gBell.gain.exponentialRampToValueAtTime(bellPeak, when + 0.025);
      gBell.gain.exponentialRampToValueAtTime(0.0001, when + 0.65);

      bell.connect(gBell);
      gBell.connect(bus);
      bell.start(when);
      bell.stop(when + 0.7);
    }

    // 7. Subtle tense suspended bell ping when timer is running low
    if (profile.urgentPulse && step % 4 === 2) {
      const pulse = ctx.createOscillator();
      pulse.type = 'sine';
      pulse.frequency.setValueAtTime(step % 8 === 2 ? 1108.73 : 880.0, when);

      const gPulse = ctx.createGain();
      gPulse.gain.setValueAtTime(0.0001, when);
      gPulse.gain.exponentialRampToValueAtTime(0.032, when + 0.012);
      gPulse.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);

      pulse.connect(gPulse);
      gPulse.connect(bus);
      pulse.start(when);
      pulse.stop(when + 0.32);
    }
  }

  async decodeBase64Wav(base64Audio: string): Promise<AudioBuffer | null> {
    const audio = this.getContext();
    if (!audio) return null;
    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return await audio.ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch {
      return null;
    }
  }

  playVoiceBuffer(
    buffer: AudioBuffer,
    volume = 0.96,
    playbackRate = 1.02
  ): AudioBufferSourceNode | null {
    const audio = this.getContext();
    if (!audio) return null;
    const { ctx } = audio;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(ctx.destination);
    source.start(0);
    return source;
  }

  createBufferFromPcm16(pcmBytes: Uint8Array, sampleRate = 24000): AudioBuffer | null {
    const audio = this.getContext();
    if (!audio) return null;
    const sampleCount = Math.floor(pcmBytes.byteLength / 2);
    if (sampleCount <= 0) return null;

    const buffer = audio.ctx.createBuffer(1, sampleCount, sampleRate);
    const channel = buffer.getChannelData(0);
    const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, sampleCount * 2);
    for (let i = 0; i < sampleCount; i++) {
      channel[i] = view.getInt16(i * 2, true) / 32768;
    }
    return buffer;
  }

  schedulePcm16Chunk(
    pcmBytes: Uint8Array,
    nextStartTimeSec: number,
    sampleRate = 24000,
    volume = 0.96,
    playbackRate = 1.02
  ): { source: AudioBufferSourceNode; nextTimeSec: number } | null {
    const audio = this.getContext();
    if (!audio) return null;
    const { ctx } = audio;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const buffer = this.createBufferFromPcm16(pcmBytes, sampleRate);
    if (!buffer) return null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(voiceGain);
    voiceGain.connect(ctx.destination);

    const startAt =
      nextStartTimeSec > 0
        ? Math.max(ctx.currentTime + 0.004, nextStartTimeSec)
        : ctx.currentTime + 0.012;
    source.start(startAt);
    return { source, nextTimeSec: startAt + buffer.duration / playbackRate };
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Tactile stone/ceramic transient click simulating real domino tiles touching.
   */
  private playStoneClick(
    centerFreq = 2200,
    durationSec = 0.024,
    gainPeak = 0.14,
    delaySec = 0
  ) {
    const audio = this.getContext();
    if (!audio) return;
    const { ctx, bus } = audio;

    const now = ctx.currentTime + delaySec;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, now);
    filter.Q.setValueAtTime(2.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    src.start(now);
    src.stop(now + durationSec + 0.01);
  }

  /**
   * Rich sculpted tone with optional pitch glide and warm low-pass filtering.
   */
  private playWarmTone(params: {
    freqStart: number;
    freqEnd?: number;
    durationSec: number;
    type?: OscillatorType;
    gainPeak?: number;
    delaySec?: number;
    filterFreq?: number;
  }) {
    const audio = this.getContext();
    if (!audio) return;
    const { ctx, bus } = audio;

    const {
      freqStart,
      freqEnd = freqStart,
      durationSec,
      type = 'triangle',
      gainPeak = 0.12,
      delaySec = 0,
      filterFreq = 4200,
    } = params;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + durationSec);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playSelect(enabled: boolean) {
    if (!enabled) return;
    // Crisp ceramic pick-up click + warm marimba lift
    this.playStoneClick(2600, 0.02, 0.15, 0);
    this.playWarmTone({
      freqStart: 480,
      freqEnd: 620,
      durationSec: 0.085,
      type: 'sine',
      gainPeak: 0.13,
      filterFreq: 3200,
    });
  }

  playDeselect(enabled: boolean) {
    if (!enabled) return;
    this.playStoneClick(1550, 0.018, 0.09, 0);
    this.playWarmTone({
      freqStart: 420,
      freqEnd: 310,
      durationSec: 0.075,
      type: 'sine',
      gainPeak: 0.09,
      filterFreq: 2200,
    });
  }

  /**
   * Subtle ceramic-on-felt glide & resonant micro-tap as a domino tile moves.
   */
  playDragSlide(enabled: boolean, speedNorm = 0.5) {
    if (!enabled) return;
    const clamped = Math.max(0, Math.min(1, speedNorm));
    this.playStoneClick(
      920 + clamped * 680,
      0.032,
      0.048 + clamped * 0.036,
      0
    );
    this.playWarmTone({
      freqStart: 560 + clamped * 240,
      freqEnd: 460 + clamped * 160,
      durationSec: 0.032,
      type: 'triangle',
      gainPeak: 0.032 + clamped * 0.02,
      filterFreq: 1800,
    });
  }

  /**
   * Crisp ivory-to-ivory domino edge contact click when dragging near a target tile.
   */
  playSnapHover(enabled: boolean, isMatch: boolean) {
    if (!enabled) return;
    this.playStoneClick(isMatch ? 2950 : 2150, 0.018, isMatch ? 0.12 : 0.085, 0);
    this.playWarmTone({
      freqStart: isMatch ? 1120 : 760,
      freqEnd: isMatch ? 1280 : 700,
      durationSec: 0.05,
      type: 'sine',
      gainPeak: isMatch ? 0.08 : 0.055,
      filterFreq: 3400,
    });
  }

  /**
   * Weighted domino tile settling back onto the felt/wood board when released.
   */
  playDropSettle(enabled: boolean) {
    if (!enabled) return;
    this.playStoneClick(1750, 0.02, 0.11, 0);
    this.playStoneClick(1250, 0.022, 0.08, 0.018);
    this.playWarmTone({
      freqStart: 240,
      freqEnd: 135,
      durationSec: 0.075,
      type: 'triangle',
      gainPeak: 0.11,
      filterFreq: 900,
    });
  }

  playBlocked(enabled: boolean) {
    if (!enabled) return;
    // Solid hollow wood knock
    this.playStoneClick(680, 0.03, 0.14, 0);
    this.playWarmTone({
      freqStart: 155,
      freqEnd: 92,
      durationSec: 0.11,
      type: 'triangle',
      gainPeak: 0.16,
      filterFreq: 750,
    });
  }

  playMatch(enabled: boolean, combo = 1) {
    if (!enabled) return;
    // Double tactile domino clack + Candy-Crush bubbly pops + harmonic chime locked to music
    this.playStoneClick(2300, 0.022, 0.16, 0);
    this.playStoneClick(3100, 0.022, 0.14, 0.024);

    // Tactile rising bubble pops
    const comboLift = Math.min(4, Math.max(0, combo - 1)) * 45;
    this.playWarmTone({
      freqStart: 310 + comboLift,
      freqEnd: 790 + comboLift,
      durationSec: 0.055,
      type: 'sine',
      gainPeak: 0.14,
      delaySec: 0.008,
      filterFreq: 4200,
    });
    this.playWarmTone({
      freqStart: 470 + comboLift,
      freqEnd: 1120 + comboLift,
      durationSec: 0.06,
      type: 'sine',
      gainPeak: 0.12,
      delaySec: 0.048,
      filterFreq: 4800,
    });
    this.playWarmTone({
      freqStart: 640 + comboLift,
      freqEnd: 1420 + comboLift,
      durationSec: 0.055,
      type: 'sine',
      gainPeak: 0.09,
      delaySec: 0.088,
      filterFreq: 5400,
    });

    // Harmonically aligned D-minor scale matching the slow mysterious soundtrack
    const profile = computeMusicAdaptiveProfile(this.musicDynamic);
    const ratio = Math.pow(2, profile.pitchSemitoneShift / 12);
    const scale = [587.33, 659.25, 698.46, 880.0, 1046.5, 1174.66];
    const root = scale[Math.min(Math.max(0, combo - 1), scale.length - 1)] * ratio;

    this.playWarmTone({
      freqStart: root,
      durationSec: 0.22,
      type: 'triangle',
      gainPeak: 0.12,
      delaySec: 0.02,
      filterFreq: 3600,
    });
    this.playWarmTone({
      freqStart: root * 1.25,
      durationSec: 0.26,
      type: 'sine',
      gainPeak: 0.11,
      delaySec: 0.055,
      filterFreq: 4600,
    });
    this.playWarmTone({
      freqStart: root * 1.5,
      durationSec: 0.3,
      type: 'sine',
      gainPeak: 0.09,
      delaySec: 0.09,
      filterFreq: 5200,
    });

    this.triggerMusicSparkle(combo);
  }

  playMismatch(enabled: boolean) {
    if (!enabled) return;
    this.triggerMusicFilterWobble();
    // Soft modern muted low-chime warning (not harsh sawtooth)
    this.playStoneClick(950, 0.025, 0.11, 0);
    this.playWarmTone({
      freqStart: 210,
      freqEnd: 145,
      durationSec: 0.16,
      type: 'triangle',
      gainPeak: 0.15,
      filterFreq: 680,
    });
    this.playWarmTone({
      freqStart: 198,
      freqEnd: 136,
      durationSec: 0.16,
      type: 'sine',
      gainPeak: 0.1,
      delaySec: 0.02,
      filterFreq: 620,
    });
  }

  playShuffle(enabled: boolean) {
    if (!enabled) return;
    // Rapid cascade of domino tiles sliding across felt
    const freqs = [1500, 1900, 2300, 2600, 2900, 3200];
    freqs.forEach((f, idx) => {
      this.playStoneClick(f, 0.02, 0.11, idx * 0.032);
    });
    [330, 440, 554.37, 659.25].forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        durationSec: 0.14,
        type: 'sine',
        gainPeak: 0.08,
        delaySec: 0.04 + idx * 0.045,
        filterFreq: 3200,
      });
    });
  }

  playHint(enabled: boolean) {
    if (!enabled) return;
    const notes = [659.25, 830.61, 987.77, 1318.5];
    notes.forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        durationSec: 0.24,
        type: 'sine',
        gainPeak: 0.09,
        delaySec: idx * 0.055,
        filterFreq: 4800,
      });
    });
  }

  playWin(enabled: boolean) {
    if (!enabled) return;
    this.duckMusicTemporarily(1800);
    this.triggerMusicSparkle(4);
    // Warm sub bass root + triumphant major-9th arpeggio
    this.playWarmTone({
      freqStart: 130.81,
      durationSec: 0.75,
      type: 'sine',
      gainPeak: 0.16,
      filterFreq: 450,
    });
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        durationSec: 0.38,
        type: idx % 2 === 0 ? 'triangle' : 'sine',
        gainPeak: 0.12,
        delaySec: idx * 0.08,
        filterFreq: 5200,
      });
    });
  }

  playLose(enabled: boolean) {
    if (!enabled) return;
    this.duckMusicTemporarily(2100);
    [392.0, 349.23, 293.66, 220.0].forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        freqEnd: f * 0.96,
        durationSec: 0.26,
        type: 'triangle',
        gainPeak: 0.11,
        delaySec: idx * 0.11,
        filterFreq: 1400,
      });
    });
  }

  playZoom(enabled: boolean, zoomIn: boolean) {
    if (!enabled) return;
    this.playWarmTone({
      freqStart: zoomIn ? 540 : 460,
      freqEnd: zoomIn ? 660 : 380,
      durationSec: 0.05,
      type: 'sine',
      gainPeak: 0.05,
      filterFreq: 2000,
    });
  }

  playTimerTick(enabled: boolean, urgent = false) {
    if (!enabled) return;
    this.playStoneClick(urgent ? 3100 : 2200, 0.015, urgent ? 0.08 : 0.045, 0);
    this.playWarmTone({
      freqStart: urgent ? 880 : 660,
      durationSec: 0.04,
      type: 'sine',
      gainPeak: urgent ? 0.065 : 0.035,
      filterFreq: 2800,
    });
  }

  playExplosionPopWave(enabled: boolean, waveIndex = 0) {
    if (!enabled) return;
    const baseFreq = 260 + waveIndex * 70;
    this.playStoneClick(1700 + waveIndex * 320, 0.028, 0.16, 0);
    this.playStoneClick(2450 + waveIndex * 280, 0.026, 0.14, 0.035);
    this.playWarmTone({
      freqStart: baseFreq,
      freqEnd: baseFreq * 2.4,
      durationSec: 0.07,
      type: 'sine',
      gainPeak: 0.13,
      delaySec: 0.01,
      filterFreq: 3800,
    });
    this.playWarmTone({
      freqStart: 140 - waveIndex * 12,
      freqEnd: 58,
      durationSec: 0.18,
      type: 'triangle',
      gainPeak: 0.14,
      filterFreq: 750,
    });
  }

  playBonus(enabled: boolean) {
    if (!enabled) return;
    this.triggerMusicSparkle(4);
    [698.46, 880, 1046.5, 1396.91, 1567.98].forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        durationSec: 0.2,
        type: idx % 2 === 0 ? 'sine' : 'triangle',
        gainPeak: 0.11,
        delaySec: idx * 0.045,
        filterFreq: 5600,
      });
    });
  }

  playTrap(enabled: boolean) {
    if (!enabled) return;
    this.triggerMusicFilterWobble();
    this.playStoneClick(720, 0.04, 0.16, 0);
    [320, 245, 175].forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        freqEnd: f * 0.82,
        durationSec: 0.17,
        type: 'triangle',
        gainPeak: 0.13,
        delaySec: idx * 0.065,
        filterFreq: 1150,
      });
    });
  }

  playMenuClick(enabled: boolean) {
    if (!enabled) return;
    this.playStoneClick(1950, 0.015, 0.08, 0);
    this.playWarmTone({
      freqStart: 620,
      freqEnd: 790,
      durationSec: 0.048,
      type: 'sine',
      gainPeak: 0.075,
      filterFreq: 3200,
    });
  }

  playMenuTransition(enabled: boolean, direction: 'forward' | 'back' = 'forward') {
    if (!enabled) return;
    this.playStoneClick(direction === 'forward' ? 1450 : 1080, 0.022, 0.05, 0);
    const notes = direction === 'forward' ? [523.25, 659.25] : [587.33, 440.0];
    notes.forEach((f, idx) => {
      this.playWarmTone({
        freqStart: f,
        durationSec: 0.13,
        type: 'sine',
        gainPeak: 0.07,
        delaySec: idx * 0.045,
        filterFreq: 3400,
      });
    });
  }
}

export const soundEngine = new SoundEngine();

if (typeof window !== 'undefined') {
  const handleUnlock = () => {
    soundEngine.unlock();
  };
  window.addEventListener('pointerdown', handleUnlock, { capture: true, passive: true });
  window.addEventListener('touchstart', handleUnlock, { capture: true, passive: true });
  window.addEventListener('keydown', handleUnlock, { capture: true, passive: true });

  document.addEventListener('visibilitychange', () => {
    soundEngine.setPageHidden(document.hidden);
  });
}

export function triggerHaptic(enabled: boolean, pattern: number | number[] = 14): boolean {
  if (!enabled) return false;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      return navigator.vibrate(pattern) !== false;
    } catch {
      return false;
    }
  }
  return false;
}
