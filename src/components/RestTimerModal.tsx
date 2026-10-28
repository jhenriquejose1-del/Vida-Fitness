import React, { useEffect, useState, useRef } from 'react';
import { playTimerSound, triggerVibration, showRestCompleteNotification, unlockAudioContext, TimerSoundType } from '../services/audioService';
import { useData } from '../context/DataContext';
import { Bell, Volume2, VolumeX, Play, Pause, RotateCcw, Plus, X, Smartphone } from 'lucide-react';

interface RestTimerProps {
  initialSeconds: number;
  exerciseName?: string;
  onFinish?: () => void;
  onClose: () => void;
}

export const RestTimerModal: React.FC<RestTimerProps> = ({
  initialSeconds,
  exerciseName,
  onFinish,
  onClose,
}) => {
  const { settings, updateSettings } = useData();
  const [targetDuration, setTargetDuration] = useState(initialSeconds);
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [soundChoice, setSoundChoice] = useState<TimerSoundType>(settings.timerSound || 'beep');
  const [isMuted, setIsMuted] = useState(settings.soundMuted || false);

  // Use timestamp for drift-free background precision
  const targetEndTimestampRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const pausedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    unlockAudioContext();
  }, []);

  // Timer loop
  useEffect(() => {
    if (isPaused) {
      pausedTimestampRef.current = Date.now();
      return;
    }

    if (pausedTimestampRef.current) {
      // Re-adjust target end after unpausing
      const pauseDuration = Date.now() - pausedTimestampRef.current;
      targetEndTimestampRef.current += pauseDuration;
      pausedTimestampRef.current = null;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = targetEndTimestampRef.current - now;
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Play sound, vibrate, and show notification
        playTimerSound(soundChoice, isMuted);
        triggerVibration(settings.vibrationEnabled);
        showRestCompleteNotification();

        if (onFinish) onFinish();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPaused, soundChoice, isMuted, settings.vibrationEnabled, onFinish]);

  const handleAdd15Seconds = () => {
    targetEndTimestampRef.current += 15 * 1000;
    setTargetDuration((prev) => prev + 15);
    setSecondsRemaining((prev) => prev + 15);
  };

  const handleReset = () => {
    targetEndTimestampRef.current = Date.now() + targetDuration * 1000;
    setSecondsRemaining(targetDuration);
    setIsPaused(false);
    pausedTimestampRef.current = null;
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSoundChange = (newSound: TimerSoundType) => {
    setSoundChoice(newSound);
    playTimerSound(newSound, false);
    updateSettings({ timerSound: newSound });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    updateSettings({ soundMuted: next });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = Math.min(100, Math.max(0, ((targetDuration - secondsRemaining) / targetDuration) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-lime-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                Descanso Ativo
              </span>
            </div>
            {exerciseName && (
              <h4 className="text-sm font-semibold text-zinc-300 truncate max-w-[200px]">
                {exerciseName}
              </h4>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular Display */}
        <div className="relative flex flex-col items-center justify-center my-6">
          <svg className="w-52 h-52 -rotate-90">
            <circle
              cx="104"
              cy="104"
              r="90"
              stroke="#27272a"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="104"
              cy="104"
              r="90"
              stroke="url(#timerGradient)"
              strokeWidth="12"
              strokeDasharray="565.48"
              strokeDashoffset={565.48 - (565.48 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-linear"
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#84cc16" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-5xl font-black font-mono tracking-tight text-white">
              {formatTime(secondsRemaining)}
            </span>
            <span className="text-xs font-medium text-zinc-400 mt-1">
              {isPaused ? 'Pausado' : `Meta: ${formatTime(targetDuration)}`}
            </span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-3 mb-6 relative z-10">
          <button
            onClick={handleAdd15Seconds}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            +15s
          </button>

          <button
            onClick={handleTogglePause}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-bold shadow-lg shadow-emerald-500/25 transition active:scale-95"
            aria-label={isPaused ? 'Continuar' : 'Pausar'}
          >
            {isPaused ? <Play className="w-6 h-6 fill-black ml-0.5" /> : <Pause className="w-6 h-6 fill-black" />}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition"
            aria-label="Reiniciar"
          >
            <RotateCcw className="w-4 h-4 text-zinc-400" />
            Reiniciar
          </button>
        </div>

        {/* Audio & Settings bar */}
        <div className="rounded-2xl bg-zinc-800/60 p-3 border border-zinc-800/80 relative z-10">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <div className="flex items-center gap-1.5 font-medium">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Som do alarme</span>
            </div>
            <button
              onClick={toggleMute}
              className={`p-1 rounded-md transition ${isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-zinc-300 hover:text-white'}`}
              title={isMuted ? 'Desmutar' : 'Mutar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(['beep', 'bell', 'digital', 'chime'] as TimerSoundType[]).map((snd) => (
              <button
                key={snd}
                onClick={() => handleSoundChange(snd)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition ${
                  soundChoice === snd
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {snd}
              </button>
            ))}
          </div>
        </div>

        {/* Skip button */}
        <div className="mt-4 text-center relative z-10">
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 transition"
          >
            Pular descanso e ir para a próxima série
          </button>
        </div>
      </div>
    </div>
  );
};
