let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export type TimerSoundType = 'beep' | 'bell' | 'digital' | 'chime';

export function playTimerSound(soundType: TimerSoundType = 'beep', muted = false): void {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundType === 'beep') {
      // Sport beep: high pitch crisp pulses
      [0, 0.15, 0.3].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } else if (soundType === 'bell') {
      // Resonant gym bell
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 1.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    } else if (soundType === 'chime') {
      // Ascending pleasant chord
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const offset = idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.65);
      });
    } else {
      // Digital sports watch double-beep
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    }
  } catch (err) {
    console.warn('Erro ao reproduzir som do timer:', err);
  }
}

export function triggerVibration(enabled = true): void {
  if (!enabled) return;
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch {
      // Ignore if not permitted
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
}

export function showRestCompleteNotification(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification('Tempo de Descanso Finalizado!', {
        body: 'Hora da próxima série! Mantenha a intensidade.',
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
      });
    } catch {
      // Notification might be blocked in background
    }
  }
}
