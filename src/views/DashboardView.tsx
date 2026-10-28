import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Dumbbell,
  Play,
  Plus,
  Flame,
  Droplet,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';

interface DashboardViewProps {
  onStartWorkout: (templateId?: string, scheduleId?: string) => void;
  onOpenNutritionAI: () => void;
  onOpenBatchScheduler: () => void;
  onOpenAICoach: () => void;
  onGoToWorkouts: () => void;
  onGoToNutrition: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartWorkout,
  onOpenNutritionAI,
  onOpenBatchScheduler,
  onOpenAICoach,
  onGoToWorkouts,
  onGoToNutrition,
}) => {
  const { schedules, templates, nutritionEntries, settings, updateWaterConsumed, sessions } = useData();
  const { profile } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's scheduled workout
  const todaySchedule = schedules.find((s) => s.date === todayStr);
  const matchedTemplate = todaySchedule?.workoutTemplateId
    ? templates.find((t) => t.id === todaySchedule.workoutTemplateId)
    : templates[0];

  // Today's food entries
  const todayNutrition = nutritionEntries.filter((n) => n.date === todayStr);

  const totalCalories = todayNutrition.reduce((sum, n) => sum + (n.calories || 0), 0);
  const totalProtein = todayNutrition.reduce((sum, n) => sum + (n.protein || 0), 0);
  const totalCarbs = todayNutrition.reduce((sum, n) => sum + (n.carbs || 0), 0);
  const totalFats = todayNutrition.reduce((sum, n) => sum + (n.fats || 0), 0);

  const calProgress = Math.min(100, Math.round((totalCalories / (settings.calorieGoal || 2000)) * 100));
  const protProgress = Math.min(100, Math.round((totalProtein / (settings.proteinGoal || 150)) * 100));
  const carbsProgress = Math.min(100, Math.round((totalCarbs / (settings.carbsGoal || 200)) * 100));
  const fatsProgress = Math.min(100, Math.round((totalFats / (settings.fatsGoal || 65)) * 100));

  const waterConsumed = settings.waterConsumedMl || 0;
  const waterTarget = settings.waterGoalMl || 3000;
  const waterProgress = Math.min(100, Math.round((waterConsumed / waterTarget) * 100));

  const completedSessionsCount = sessions.filter((s) => s.status === 'completed').length;

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-zinc-400 capitalize">{formattedDate}</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Olá, <span className="text-emerald-400">{profile?.name || 'Atleta'}</span> 👋
          </h2>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBatchScheduler}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 transition"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gerar Ciclo</span>
          </button>
          <button
            onClick={onOpenAICoach}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-emerald-400 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coach IA</span>
          </button>
        </div>
      </div>

      {/* TODAY'S WORKOUT CARD */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" />
              Treino Programado para Hoje
            </span>
            {todaySchedule?.status === 'completed' && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
              </span>
            )}
            {todaySchedule?.status === 'rest' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                Dia de Descanso
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {todaySchedule ? todaySchedule.workoutName : matchedTemplate?.name || 'Treino Livre'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Grupo Muscular: <strong className="text-zinc-200">{todaySchedule?.muscleGroup || matchedTemplate?.muscleGroup || 'Peito e Tríceps'}</strong> •{' '}
                {matchedTemplate?.exercises.length || 5} exercícios programados
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onStartWorkout(
                    todaySchedule?.workoutTemplateId || matchedTemplate?.id,
                    todaySchedule?.id
                  )
                }
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>{todaySchedule?.status === 'completed' ? 'Treinar Novamente' : 'Iniciar Treino'}</span>
              </button>

              <button
                onClick={onGoToWorkouts}
                className="p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                title="Ver detalhes na aba Treinos"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S NUTRITION SUMMARY CARD */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Metas Nutricionais do Dia</h3>
              <p className="text-xs text-zinc-400">Consumo em relação às suas metas calculadas</p>
            </div>
          </div>

          <button
            onClick={onOpenNutritionAI}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Refeição (IA)</span>
          </button>
        </div>

        {/* Calories Main Circle / Bar */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400">Energia Total</span>
            <span className="text-xs font-mono text-zinc-300">
              <strong className="text-base text-emerald-400">{Math.round(totalCalories)}</strong> / {settings.calorieGoal} kcal
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 transition-all duration-500 rounded-full"
              style={{ width: `${calProgress}%` }}
            />
          </div>
        </div>

        {/* Macronutrients Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Protein */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400">Proteínas</span>
              <span className="text-zinc-400 font-mono">
                <strong>{Math.round(totalProtein)}</strong>/{settings.proteinGoal}g
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-500 rounded-full"
                style={{ width: `${protProgress}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400">Carboidratos</span>
              <span className="text-zinc-400 font-mono">
                <strong>{Math.round(totalCarbs)}</strong>/{settings.carbsGoal}g
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                style={{ width: `${carbsProgress}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-400">Gorduras</span>
              <span className="text-zinc-400 font-mono">
                <strong>{Math.round(totalFats)}</strong>/{settings.fatsGoal}g
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                style={{ width: `${fatsProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* WATER TRACKER & QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water Tracker Card */}
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Consumo de Água</h4>
                  <span className="text-[11px] text-zinc-400">Hidratação e performance</span>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-blue-400">
                {waterConsumed} / {waterTarget} ml
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${waterProgress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateWaterConsumed(250)}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-blue-300 transition"
            >
              + 250 ml
            </button>
            <button
              onClick={() => updateWaterConsumed(500)}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-cyan-300 transition"
            >
              + 500 ml
            </button>
            <button
              onClick={() => updateWaterConsumed(-250)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-500 transition"
              title="Reduzir 250ml"
            >
              -
            </button>
          </div>
        </div>

        {/* Global Progress Stats */}
        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Histórico e Consistência</h4>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                  Treinos Concluídos
                </span>
                <strong className="text-xl font-black text-white">{completedSessionsCount}</strong>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                  Peso Atual
                </span>
                <strong className="text-xl font-black text-emerald-400">
                  {profile?.currentWeight ? `${profile.currentWeight} kg` : '--'}
                </strong>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-semibold">
                  Alimentos Hoje
                </span>
                <strong className="text-xl font-black text-white">{todayNutrition.length}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={onGoToNutrition}
            className="p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition shrink-0"
            title="Ir para Nutrição"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
