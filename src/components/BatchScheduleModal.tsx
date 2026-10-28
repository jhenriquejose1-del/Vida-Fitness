import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { BatchScheduleConfig, WorkoutTemplate } from '../types';
import {
  Calendar,
  Layers,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  CheckCircle,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface BatchScheduleModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const WEEKDAYS = [
  { id: 0, label: 'Dom', full: 'Domingo' },
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
];

export const BatchScheduleModal: React.FC<BatchScheduleModalProps> = ({ onClose, onSuccess }) => {
  const { templates, generateBatchSchedule, schedules } = useData();

  // Initial date defaults: today to 30 days ahead
  const today = new Date();
  const defaultStart = today.toISOString().split('T')[0];
  const nextMonth = new Date(today);
  nextMonth.setDate(nextMonth.getDate() + 30);
  const defaultEnd = nextMonth.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(() =>
    templates.map((t) => t.id)
  );
  // Default rest days: Saturday (6) and Sunday (0)
  const [restDays, setRestDays] = useState<number[]>([0, 6]);
  const [behavior, setBehavior] = useState<'continue' | 'resetWeekly'>('continue');
  const [conflictResolution, setConflictResolution] = useState<'replaceFuture' | 'keep' | 'replaceAll'>('replaceFuture');
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Toggle template selection & ordering
  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const handleToggleRestDay = (dayIndex: number) => {
    setRestDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  // Compute live preview sequence
  const previewItems = useMemo(() => {
    if (!startDate || !endDate || selectedTemplateIds.length === 0) return [];

    const templateMap = new Map<string, WorkoutTemplate>();
    templates.forEach((t) => templateMap.set(t.id, t));

    const sequenceTemplates = selectedTemplateIds
      .map((id) => templateMap.get(id))
      .filter((t): t is WorkoutTemplate => Boolean(t));

    if (sequenceTemplates.length === 0) return [];

    const items: {
      date: string;
      weekdayName: string;
      isRest: boolean;
      workoutName: string;
      muscleGroup: string;
      conflictType?: 'completed' | 'existing';
    }[] = [];

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const current = new Date(start);

    let cycleIndex = 0;

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = current.getDay();

      const existingForDay = schedules.find((s) => s.date === dateStr);
      const isCompleted = existingForDay?.status === 'completed';

      if (behavior === 'resetWeekly' && dayOfWeek === 1) {
        cycleIndex = 0;
      }

      const isRest = restDays.includes(dayOfWeek);

      if (isRest) {
        items.push({
          date: dateStr,
          weekdayName: WEEKDAYS.find((w) => w.id === dayOfWeek)?.label || '',
          isRest: true,
          workoutName: 'DESCANSO',
          muscleGroup: 'Recuperação',
          conflictType: isCompleted ? 'completed' : existingForDay ? 'existing' : undefined,
        });
      } else {
        const tpl = sequenceTemplates[cycleIndex % sequenceTemplates.length];
        items.push({
          date: dateStr,
          weekdayName: WEEKDAYS.find((w) => w.id === dayOfWeek)?.label || '',
          isRest: false,
          workoutName: tpl.name,
          muscleGroup: tpl.muscleGroup,
          conflictType: isCompleted ? 'completed' : existingForDay ? 'existing' : undefined,
        });
        cycleIndex++;
      }

      current.setDate(current.getDate() + 1);
    }

    return items;
  }, [startDate, endDate, selectedTemplateIds, restDays, behavior, templates, schedules]);

  const totalWorkoutDays = previewItems.filter((i) => !i.isRest).length;
  const totalRestDays = previewItems.filter((i) => i.isRest).length;

  const handleGenerate = async () => {
    if (selectedTemplateIds.length === 0) {
      setErrorMsg('Selecione pelo menos um treino para o ciclo.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('A data inicial deve ser anterior à data final.');
      return;
    }

    setGenerating(true);
    setErrorMsg('');

    try {
      const config: BatchScheduleConfig = {
        startDate,
        endDate,
        selectedTemplateIds,
        cycleDays: selectedTemplateIds.length,
        restDaysOfWeek: restDays,
        behavior,
        conflictResolution,
      };

      await generateBatchSchedule(config);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao gerar treinos em lote.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-black shadow-lg shadow-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Adicionar Treinos em Lote (Ciclo)
              </h3>
              <p className="text-xs text-zinc-400">
                Preenchimento automático do calendário com repetição contínua e dias de folga
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* 1. Date Range */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              1. Período do Calendário
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-zinc-400 mb-1 block">Data Inicial:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <span className="text-xs text-zinc-400 mb-1 block">Data Final:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Templates in Cycle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                2. Treinos do Ciclo ({selectedTemplateIds.length} selecionados)
              </label>
              <span className="text-[11px] text-zinc-400">
                A sequência se repetirá nesta ordem
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {templates.map((tpl, idx) => {
                const isSelected = selectedTemplateIds.includes(tpl.id);
                const orderIdx = selectedTemplateIds.indexOf(tpl.id);

                return (
                  <button
                    type="button"
                    key={tpl.id}
                    onClick={() => handleToggleTemplate(tpl.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-extrabold text-[10px] flex items-center justify-center shrink-0">
                          {orderIdx + 1}
                        </span>
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold text-xs text-zinc-200 block truncate">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 block truncate">
                          {tpl.muscleGroup} • {tpl.exercises.length} exercícios
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Rest Days (Folga) */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              3. Dias de Folga (Sem treino)
            </label>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((day) => {
                const isRest = restDays.includes(day.id);
                return (
                  <button
                    type="button"
                    key={day.id}
                    onClick={() => handleToggleRestDay(day.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center ${
                      isRest
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                        : 'bg-zinc-800/70 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{day.label}</span>
                    <span className="text-[9px] font-normal mt-0.5">
                      {isRest ? 'Folga' : 'Treino'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Sequence Behavior */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              4. Comportamento da Sequência
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setBehavior('continue')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  behavior === 'continue'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      behavior === 'continue' ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                    }`}
                  >
                    {behavior === 'continue' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  <span>Continuar sequência após folga (Padrão)</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 pl-6">
                  Dias de descanso não consomem slots do ciclo. O próximo treino acontece no próximo
                  dia útil.
                </p>
              </label>

              <label
                onClick={() => setBehavior('resetWeekly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  behavior === 'resetWeekly'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      behavior === 'resetWeekly' ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'
                    }`}
                  >
                    {behavior === 'resetWeekly' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  <span>Reiniciar sequência a cada semana</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 pl-6">
                  Reinicia sempre no primeiro treino da lista a cada início de semana (Segunda-feira).
                </p>
              </label>
            </div>
          </div>

          {/* 5. Conflict Resolution */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              5. Conflito com Treinos Agendados
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setConflictResolution('replaceFuture')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  conflictResolution === 'replaceFuture'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <strong className="block font-semibold">Substituir somente futuros</strong>
                <span className="text-[10px] text-zinc-500">Mantém histórico e já realizados</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictResolution('keep')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  conflictResolution === 'keep'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <strong className="block font-semibold">Manter existentes</strong>
                <span className="text-[10px] text-zinc-500">Apenas preenche dias vazios</span>
              </button>

              <button
                type="button"
                onClick={() => setConflictResolution('replaceAll')}
                className={`p-2.5 rounded-xl border text-left text-xs transition ${
                  conflictResolution === 'replaceAll'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <strong className="block font-semibold">Substituir tudo</strong>
                <span className="text-[10px] text-zinc-500">Recria todo o período</span>
              </button>
            </div>
          </div>

          {/* Live Preview Toggle & Table */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Ocultar prévia dos treinos' : 'Visualizar prévia antes de gerar'}</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
                {totalWorkoutDays} treinos • {totalRestDays} descansos
              </span>
            </button>

            {showPreview && (
              <div className="mt-3 rounded-2xl bg-zinc-950 border border-zinc-800 p-3 max-h-56 overflow-y-auto space-y-1.5 text-xs">
                {previewItems.slice(0, 45).map((item) => (
                  <div
                    key={item.date}
                    className={`flex items-center justify-between p-2 rounded-xl ${
                      item.isRest ? 'bg-zinc-900/40 text-zinc-500' : 'bg-zinc-900 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-400">{item.date}</span>
                      <span className="w-7 text-[10px] text-zinc-500 uppercase">{item.weekdayName}</span>
                      <span className={`font-semibold ${item.isRest ? 'text-amber-400/80' : 'text-emerald-400'}`}>
                        {item.workoutName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{item.muscleGroup}</span>
                      {item.conflictType === 'completed' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px]">
                          Já concluído
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={generating || previewItems.length === 0}
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{generating ? 'Gerando calendário...' : `Confirmar e Gerar (${previewItems.length} dias)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
