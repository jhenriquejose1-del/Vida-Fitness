import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { RestTimerModal } from './RestTimerModal';
import confetti from 'canvas-confetti';
import {
  Clock,
  Dumbbell,
  CheckCircle2,
  Circle,
  History,
  X,
  Award,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LiveWorkoutModalProps {
  onClose: () => void;
}

export const LiveWorkoutModal: React.FC<LiveWorkoutModalProps> = ({ onClose }) => {
  const {
    activeSession,
    updateActiveSessionSet,
    finishActiveSession,
    cancelActiveSession,
    getLastExercisePerformance,
    settings,
  } = useData();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(60);
  const [restExerciseName, setRestExerciseName] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Live timer
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.startedAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) return null;

  // Group sets by exercise
  const exerciseGroups: {
    exerciseId: string;
    exerciseName: string;
    sets: typeof activeSession.sets;
  }[] = [];

  const seenExercises = new Set<string>();
  activeSession.sets.forEach((s) => {
    if (!seenExercises.has(s.exerciseId)) {
      seenExercises.add(s.exerciseId);
      exerciseGroups.push({
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName,
        sets: activeSession.sets.filter((item) => item.exerciseId === s.exerciseId),
      });
    }
  });

  const currentExerciseGroup = exerciseGroups[activeExerciseIndex] || exerciseGroups[0];

  const totalSetsCount = activeSession.sets.length;
  const completedSetsCount = activeSession.sets.filter((s) => s.completed).length;
  const progressPercent = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  const handleToggleSet = (exerciseId: string, setNumber: number, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    updateActiveSessionSet(exerciseId, setNumber, { completed: nextCompleted });

    if (nextCompleted && settings.autoRestTimer) {
      // Find rest time for this exercise
      const currentSet = activeSession.sets.find(
        (s) => s.exerciseId === exerciseId && s.setNumber === setNumber
      );
      const restTime = currentSet?.restTimeSeconds || settings.defaultRestSeconds || 60;
      setRestTimerSeconds(restTime);
      setRestExerciseName(currentSet?.exerciseName || '');
      setShowRestTimer(true);
    }
  };

  const handleFinishWorkout = async () => {
    setFinishing(true);
    try {
      // Trigger festive confetti celebration!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#22c55e', '#84cc16', '#3b82f6', '#fbbf24'],
      });

      await finishActiveSession(workoutNotes);
      setTimeout(() => {
        setFinishing(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Erro ao finalizar treino:', err);
      setFinishing(false);
    }
  };

  const formatTimer = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const lastPerformance = currentExerciseGroup
    ? getLastExercisePerformance(currentExerciseGroup.exerciseName)
    : null;

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 text-white flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Bar */}
      <header className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Treino em Andamento
          </span>
          <h2 className="text-base font-bold text-white truncate max-w-[220px] sm:max-w-md">
            {activeSession.workoutName}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Elapsed Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700/60 font-mono text-xs font-semibold text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => {
              if (confirm('Deseja realmente cancelar e descartar a sessão atual?')) {
                cancelActiveSession();
                onClose();
              }
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
            title="Cancelar treino"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress & Summary Bar */}
      <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
        <div className="flex items-center gap-2">
          <span>Progresso:</span>
          <div className="w-24 sm:w-36 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-semibold text-zinc-200">
            {completedSetsCount}/{totalSetsCount} ({progressPercent}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span>Volume: {activeSession.totalVolumeKg.toLocaleString()} kg</span>
        </div>
      </div>

      {/* Exercise Tabs / Pill navigation */}
      <div className="px-4 py-2.5 bg-zinc-900/40 border-b border-zinc-800/40 overflow-x-auto no-scrollbar shrink-0 flex items-center gap-2">
        {exerciseGroups.map((group, idx) => {
          const isCurrent = idx === activeExerciseIndex;
          const allCompleted = group.sets.every((s) => s.completed);

          return (
            <button
              key={group.exerciseId}
              onClick={() => setActiveExerciseIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isCurrent
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : allCompleted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {allCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
              )}
              <span>{group.exerciseName}</span>
            </button>
          );
        })}
      </div>

      {/* Exercise Content Area */}
      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full pb-28">
        {currentExerciseGroup ? (
          <div className="space-y-4">
            {/* Exercise Header Card */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Exercício {activeExerciseIndex + 1} de {exerciseGroups.length}
                  </span>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {currentExerciseGroup.exerciseName}
                  </h3>
                </div>

                <button
                  onClick={() => setShowHistoryModal(currentExerciseGroup.exerciseName)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition"
                  title="Histórico de cargas deste exercício"
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Histórico</span>
                </button>
              </div>

              {/* Last Session Suggestion */}
              {lastPerformance ? (
                <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Última sessão registrada: <strong>{lastPerformance.weightKg} kg</strong> para{' '}
                    <strong>{lastPerformance.reps} reps</strong>. Cargas sugeridas já preenchidas!
                  </span>
                </div>
              ) : (
                <div className="mt-3 text-xs text-zinc-400">
                  Primeira vez registrando este exercício. Ajuste as cargas conforme sua capacidade.
                </div>
              )}
            </div>

            {/* Individual Sets Table */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg">
              <div className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-zinc-800/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                <span className="col-span-2 text-center">Série</span>
                <span className="col-span-4 text-center">Carga (kg)</span>
                <span className="col-span-3 text-center">Reps</span>
                <span className="col-span-3 text-center">Status</span>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {currentExerciseGroup.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 gap-2 px-3 py-3 items-center transition ${
                      set.completed ? 'bg-emerald-950/20' : 'hover:bg-zinc-850'
                    }`}
                  >
                    {/* Set Number */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center">
                        {set.setNumber}
                      </span>
                    </div>

                    {/* Weight (kg) individual editable input */}
                    <div className="col-span-4 flex items-center justify-center">
                      <div className="relative w-full max-w-[90px]">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={set.actualWeightKg}
                          onChange={(e) =>
                            updateActiveSessionSet(set.exerciseId, set.setNumber, {
                              actualWeightKg: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full text-center font-bold text-sm bg-zinc-800 border border-zinc-700 rounded-xl py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>

                    {/* Reps individual editable input */}
                    <div className="col-span-3 flex items-center justify-center">
                      <div className="relative w-full max-w-[70px]">
                        <input
                          type="number"
                          min="1"
                          value={set.actualReps}
                          onChange={(e) =>
                            updateActiveSessionSet(set.exerciseId, set.setNumber, {
                              actualReps: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full text-center font-bold text-sm bg-zinc-800 border border-zinc-700 rounded-xl py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Checkbox button */}
                    <div className="col-span-3 flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSet(set.exerciseId, set.setNumber, set.completed)}
                        className={`flex items-center justify-center gap-1 w-full py-1.5 px-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                          set.completed
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {set.completed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 fill-black text-emerald-500" />
                            <span className="hidden sm:inline">Pronto</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-4 h-4" />
                            <span>Concluir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={activeExerciseIndex === 0}
                onClick={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Anterior
              </button>

              <button
                onClick={() => {
                  setRestTimerSeconds(settings.defaultRestSeconds || 60);
                  setRestExerciseName(currentExerciseGroup.exerciseName);
                  setShowRestTimer(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs font-semibold text-emerald-400 hover:bg-zinc-800 transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timer Descanso ({settings.defaultRestSeconds || 60}s)</span>
              </button>

              <button
                disabled={activeExerciseIndex >= exerciseGroups.length - 1}
                onClick={() => setActiveExerciseIndex((prev) => Math.min(exerciseGroups.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 flex items-center justify-center">
        <div className="max-w-md w-full flex items-center gap-3">
          <input
            type="text"
            placeholder="Observações do treino (opcional)..."
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <button
            disabled={finishing}
            onClick={handleFinishWorkout}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Award className="w-4 h-4" />
            <span>{finishing ? 'Salvando...' : 'Finalizar Treino'}</span>
          </button>
        </div>
      </footer>

      {/* Rest Timer Modal */}
      {showRestTimer && (
        <RestTimerModal
          initialSeconds={restTimerSeconds}
          exerciseName={restExerciseName}
          onClose={() => setShowRestTimer(false)}
        />
      )}

      {/* Exercise Performance History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Histórico de Cargas
              </h3>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Progressão recente para: <strong>{showHistoryModal}</strong>
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lastPerformance ? (
                <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200">Sessão mais recente</span>
                    <p className="text-[11px] text-zinc-400">{lastPerformance.reps} repetições executadas</p>
                  </div>
                  <span className="text-base font-black text-emerald-400">{lastPerformance.weightKg} kg</span>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic py-4 text-center">
                  Nenhum registro anterior encontrado para este exercício.
                </p>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
