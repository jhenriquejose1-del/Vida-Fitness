import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { playTimerSound, TimerSoundType } from '../services/audioService';
import { UserGoal, ExperienceLevel } from '../types';
import {
  User,
  Scale,
  Target,
  Settings,
  Bell,
  Volume2,
  Smartphone,
  Save,
  Plus,
  Trash2,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ProfileViewProps {
  onOpenExport: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenExport }) => {
  const { profile, updateProfile, isGuest } = useAuth();
  const { settings, updateSettings, measurements, addMeasurement, deleteMeasurement } = useData();

  // Profile form state
  const [name, setName] = useState(profile?.name || '');
  const [height, setHeight] = useState(profile?.height || 175);
  const [currentWeight, setCurrentWeight] = useState(profile?.currentWeight || 75);
  const [targetWeight, setTargetWeight] = useState(profile?.targetWeight || 80);
  const [goal, setGoal] = useState<UserGoal>(profile?.goal || 'hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experienceLevel || 'intermediate');
  const [workoutDays, setWorkoutDays] = useState(profile?.workoutDaysAvailable || 5);
  const [foodPreferences, setFoodPreferences] = useState(profile?.foodPreferences || '');
  const [physicalRestrictions, setPhysicalRestrictions] = useState(profile?.physicalRestrictions || '');

  // Goals & Timer Settings
  const [calorieGoal, setCalorieGoal] = useState(settings.calorieGoal || 2200);
  const [proteinGoal, setProteinGoal] = useState(settings.proteinGoal || 160);
  const [carbsGoal, setCarbsGoal] = useState(settings.carbsGoal || 220);
  const [fatsGoal, setFatsGoal] = useState(settings.fatsGoal || 65);
  const [waterGoalMl, setWaterGoalMl] = useState(settings.waterGoalMl || 3000);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(settings.defaultRestSeconds || 60);
  const [autoRestTimer, setAutoRestTimer] = useState(settings.autoRestTimer);
  const [timerSound, setTimerSound] = useState<TimerSoundType>(settings.timerSound || 'beep');
  const [vibrationEnabled, setVibrationEnabled] = useState(settings.vibrationEnabled);

  // New weight entry modal/field
  const [newWeightInput, setNewWeightInput] = useState('');
  const [newWeightNotes, setNewWeightNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveProfile = async () => {
    await updateProfile({
      name,
      height: Number(height),
      currentWeight: Number(currentWeight),
      targetWeight: Number(targetWeight),
      goal,
      experienceLevel,
      workoutDaysAvailable: Number(workoutDays),
      foodPreferences,
      physicalRestrictions,
    });

    await updateSettings({
      calorieGoal: Number(calorieGoal),
      proteinGoal: Number(proteinGoal),
      carbsGoal: Number(carbsGoal),
      fatsGoal: Number(fatsGoal),
      waterGoalMl: Number(waterGoalMl),
      defaultRestSeconds: Number(defaultRestSeconds),
      autoRestTimer,
      timerSound,
      vibrationEnabled,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddNewWeight = async () => {
    const val = parseFloat(newWeightInput);
    if (!val || val <= 0) return;
    await addMeasurement(val, undefined, newWeightNotes);
    setCurrentWeight(val);
    await updateProfile({ currentWeight: val });
    setNewWeightInput('');
    setNewWeightNotes('');
  };

  const testAudio = (snd: TimerSoundType) => {
    setTimerSound(snd);
    playTimerSound(snd, false);
  };

  const weightChartData = measurements.map((m) => ({
    date: m.date.substring(5), // MM-DD
    peso: m.weightKg,
  }));

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-400" />
            Perfil & Configurações
          </h2>
          <p className="text-xs text-zinc-400">
            Dados biométricos, metas de macronutrientes e preferências do temporizador
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Exportar Dados</span>
          </button>

          <button
            onClick={handleSaveProfile}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Tudo</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-fadeIn">
          ✓ Configurações e perfil salvos com sucesso!
        </div>
      )}

      {/* WEIGHT EVOLUTION & MEASUREMENT SECTION */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              Evolução do Peso Corporal
            </h3>
            <p className="text-xs text-zinc-400">
              Atual: <strong className="text-white">{currentWeight} kg</strong> • Meta:{' '}
              <strong className="text-emerald-400">{targetWeight} kg</strong>
            </p>
          </div>

          {/* Quick new measurement input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Novo peso (kg)"
              value={newWeightInput}
              onChange={(e) => setNewWeightInput(e.target.value)}
              className="w-32 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white"
            />
            <button
              onClick={handleAddNewWeight}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar
            </button>
          </div>
        </div>

        {/* Weight Evolution Line Chart */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="peso"
                name="Peso (kg)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* USER PERSONAL INFO */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          Dados Pessoais & Objetivos
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">Nome Completo:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Altura (cm):</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Peso Objetivo (kg):</label>
            <input
              type="number"
              step="0.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Objetivo Físico:</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as UserGoal)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            >
              <option value="hypertrophy">Hipertrofia Muscular</option>
              <option value="weight_loss">Emagrecimento / Perda de Gordura</option>
              <option value="maintenance">Manutenção & Saúde</option>
              <option value="conditioning">Condicionamento Físico</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Nível de Experiência:</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            >
              <option value="beginner">Iniciante (menos de 1 ano)</option>
              <option value="intermediate">Intermediário (1 a 3 anos)</option>
              <option value="advanced">Avançado (mais de 3 anos)</option>
            </select>
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Dias Disponíveis / Semana:</label>
            <input
              type="number"
              min="1"
              max="7"
              value={workoutDays}
              onChange={(e) => setWorkoutDays(parseInt(e.target.value, 10) || 5)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-zinc-400 block mb-1">Restrições Físicas / Articulares:</label>
            <input
              type="text"
              placeholder="Ex: sem impacto, dor no ombro direito, evitar agachamento profundo..."
              value={physicalRestrictions}
              onChange={(e) => setPhysicalRestrictions(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
            />
          </div>
        </div>
      </div>

      {/* NUTRITIONAL TARGETS */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-rose-400" />
          Metas Diárias de Nutrição & Água
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">Calorias (kcal):</label>
            <input
              type="number"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(parseInt(e.target.value, 10) || 2000)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white font-bold"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Proteínas (g):</label>
            <input
              type="number"
              value={proteinGoal}
              onChange={(e) => setProteinGoal(parseInt(e.target.value, 10) || 150)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-rose-400 font-bold"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Carboidratos (g):</label>
            <input
              type="number"
              value={carbsGoal}
              onChange={(e) => setCarbsGoal(parseInt(e.target.value, 10) || 200)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-amber-400 font-bold"
            />
          </div>

          <div>
            <label className="text-zinc-400 block mb-1">Gorduras (g):</label>
            <input
              type="number"
              value={fatsGoal}
              onChange={(e) => setFatsGoal(parseInt(e.target.value, 10) || 60)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-blue-400 font-bold"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="text-zinc-400 block mb-1">Meta Água (ml):</label>
            <input
              type="number"
              step="100"
              value={waterGoalMl}
              onChange={(e) => setWaterGoalMl(parseInt(e.target.value, 10) || 3000)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-cyan-400 font-bold"
            />
          </div>
        </div>
      </div>

      {/* REST TIMER SETTINGS */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-400" />
          Configurações do Temporizador de Descanso
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
            <div>
              <span className="font-bold text-white block">Iniciar Descanso Automaticamente</span>
              <span className="text-[11px] text-zinc-400">
                Abre o temporizador imediatamente após clicar em concluir série
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoRestTimer}
              onChange={(e) => setAutoRestTimer(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">Tempo Padrão Global (segundos):</label>
              <input
                type="number"
                value={defaultRestSeconds}
                onChange={(e) => setDefaultRestSeconds(parseInt(e.target.value, 10) || 60)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Som do Alarme (toque para ouvir):</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['beep', 'bell', 'digital', 'chime'] as TimerSoundType[]).map((snd) => (
                  <button
                    key={snd}
                    type="button"
                    onClick={() => testAudio(snd)}
                    className={`py-2 px-1 rounded-xl text-center capitalize font-bold transition ${
                      timerSound === snd
                        ? 'bg-emerald-500 text-black'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {snd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-zinc-400" />
              <div>
                <span className="font-bold text-white block">Vibração no Dispositivo</span>
                <span className="text-[11px] text-zinc-400">Vibra ao encerrar o descanso em aparelhos compatíveis</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={vibrationEnabled}
              onChange={(e) => setVibrationEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
