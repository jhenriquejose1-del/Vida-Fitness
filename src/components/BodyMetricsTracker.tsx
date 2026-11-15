import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Scale,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  Cloud,
  CloudOff,
  LogIn,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface BodyMetricsTrackerProps {
  heightCm: number;
  currentWeight: number;
  targetWeight: number;
  onWeightLogged?: (newWeight: number) => void;
}

interface ChartPoint {
  id: string;
  fullDate: string;
  label: string;
  weight: number;
  trend: number;
  notes?: string;
}

export const BodyMetricsTracker: React.FC<BodyMetricsTrackerProps> = ({
  heightCm,
  currentWeight,
  targetWeight,
  onWeightLogged,
}) => {
  const { user, isGuest, signInWithGoogle } = useAuth();
  const { measurements, addMeasurement, deleteMeasurement } = useData();

  const todayStr = new Date().toISOString().split('T')[0];

  const [weightInput, setWeightInput] = useState<string>(
    currentWeight ? String(currentWeight) : ''
  );
  const [dateInput, setDateInput] = useState<string>(todayStr);
  const [notesInput, setNotesInput] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [showTrendLine, setShowTrendLine] = useState<boolean>(true);
  const [showTargetLine, setShowTargetLine] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sort measurements chronologically ascending for calculations and charts
  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }, [measurements]);

  // Filter measurements based on selected time range
  const filteredMeasurements = useMemo(() => {
    if (timeRange === 'all' || sortedMeasurements.length === 0) {
      return sortedMeasurements;
    }

    const daysMap: Record<Exclude<TimeRange, 'all'>, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysMap[timeRange]);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = sortedMeasurements.filter((m) => m.date >= cutoffStr);
    return filtered.length > 0 ? filtered : sortedMeasurements.slice(-5);
  }, [sortedMeasurements, timeRange]);

  // Compute chart points with least-squares linear regression trend line
  const chartData = useMemo<ChartPoint[]>(() => {
    const n = filteredMeasurements.length;
    if (n === 0) return [];

    // Convert dates to day offsets from the first measurement for accurate slope
    const baseTime = new Date(filteredMeasurements[0].date + 'T00:00:00').getTime();
    const xs = filteredMeasurements.map((m) => {
      const t = new Date(m.date + 'T00:00:00').getTime();
      return (t - baseTime) / (1000 * 60 * 60 * 24);
    });
    const ys = filteredMeasurements.map((m) => m.weightKg);

    let slope = 0;
    let intercept = ys[0];

    if (n >= 2) {
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((sum, x, idx) => sum + x * ys[idx], 0);
      const sumXX = xs.reduce((sum, x) => sum + x * x, 0);
      const denominator = n * sumXX - sumX * sumX;

      if (denominator !== 0) {
        slope = (n * sumXY - sumX * sumY) / denominator;
        intercept = (sumY - slope * sumX) / n;
      } else {
        intercept = sumY / n;
      }
    }

    return filteredMeasurements.map((m, idx) => {
      const parts = m.date.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : m.date;
      const trendVal = Math.round((intercept + slope * xs[idx]) * 10) / 10;

      return {
        id: m.id,
        fullDate: m.date,
        label,
        weight: m.weightKg,
        trend: trendVal,
        notes: m.notes,
      };
    });
  }, [filteredMeasurements]);

  // Latest & period summary stats
  const latestMeasurement = sortedMeasurements[sortedMeasurements.length - 1];
  const displayCurrentWeight = latestMeasurement ? latestMeasurement.weightKg : currentWeight;

  const periodDelta = useMemo(() => {
    if (filteredMeasurements.length < 2) return null;
    const first = filteredMeasurements[0].weightKg;
    const last = filteredMeasurements[filteredMeasurements.length - 1].weightKg;
    const diff = Math.round((last - first) * 10) / 10;
    const pct = first > 0 ? Math.round((diff / first) * 1000) / 10 : 0;
    return { diff, pct };
  }, [filteredMeasurements]);

  const bmiData = useMemo(() => {
    if (!heightCm || heightCm <= 0 || !displayCurrentWeight || displayCurrentWeight <= 0) {
      return null;
    }
    const heightM = heightCm / 100;
    const bmi = Math.round((displayCurrentWeight / (heightM * heightM)) * 10) / 10;
    let label = 'Peso normal';
    let colorClass = 'text-emerald-400';

    if (bmi < 18.5) {
      label = 'Abaixo do peso';
      colorClass = 'text-amber-400';
    } else if (bmi >= 25 && bmi < 30) {
      label = 'Sobrepeso';
      colorClass = 'text-amber-400';
    } else if (bmi >= 30) {
      label = 'Obesidade';
      colorClass = 'text-rose-400';
    }

    return { bmi, label, colorClass };
  }, [heightCm, displayCurrentWeight]);

  const remainingToGoal = useMemo(() => {
    if (!targetWeight || !displayCurrentWeight) return null;
    const diff = Math.round((targetWeight - displayCurrentWeight) * 10) / 10;
    return diff;
  }, [targetWeight, displayCurrentWeight]);

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedWeight = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(parsedWeight) || parsedWeight < 20 || parsedWeight > 350) {
      setErrorMsg('Informe um peso válido entre 20 kg e 350 kg.');
      return;
    }

    if (!dateInput) {
      setErrorMsg('Selecione a data da medição.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanNotes = notesInput.trim().slice(0, 120);
      await addMeasurement(parsedWeight, dateInput, cleanNotes || undefined);
      if (onWeightLogged) {
        onWeightLogged(parsedWeight);
      }
      setNotesInput('');
      setSuccessMsg(`Peso de ${parsedWeight.toFixed(1)} kg registrado com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar medição:', err);
      setErrorMsg('Não foi possível salvar a medição. Verifique sua conexão ou login.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    setDeletingId(id);
    try {
      await deleteMeasurement(id);
    } catch (err) {
      console.error('Erro ao excluir medição:', err);
      setErrorMsg('Erro ao excluir registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const isCloudSynced = Boolean(user && !isGuest);

  // Reverse chronological order for history list
  const historyList = useMemo(() => {
    return [...sortedMeasurements].reverse();
  }, [sortedMeasurements]);

  return (
    <section className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Cloud Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              Body Metrics — Evolução Corporal
            </h3>
            {isCloudSynced ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <Cloud className="w-3 h-3" />
                Firestore Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                <CloudOff className="w-3 h-3" />
                Armazenamento Local
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Registre seu peso ao longo do tempo e acompanhe a tendência real com linha de regressão.
          </p>
        </div>

        {!isCloudSynced && (
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-emerald-400 transition shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Conectar Google para Sincronizar</span>
          </button>
        )}
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current Weight */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block">
            Peso Atual
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-white">
              {displayCurrentWeight ? displayCurrentWeight.toFixed(1) : '--'}
            </span>
            <span className="text-xs font-semibold text-zinc-400">kg</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-1">
            {latestMeasurement
              ? `Último: ${latestMeasurement.date.split('-').reverse().join('/')}`
              : 'Sem registros'}
          </span>
        </div>

        {/* Target Weight */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-1">
            <Target className="w-3 h-3 text-cyan-400" />
            Meta de Peso
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-cyan-400">
              {targetWeight ? targetWeight.toFixed(1) : '--'}
            </span>
            <span className="text-xs font-semibold text-zinc-400">kg</span>
          </div>
          <span className="text-[10px] text-zinc-400 block mt-1">
            {remainingToGoal === null
              ? 'Defina sua meta abaixo'
              : Math.abs(remainingToGoal) < 0.2
              ? 'Meta atingida!'
              : remainingToGoal > 0
              ? `Faltam +${remainingToGoal.toFixed(1)} kg`
              : `Faltam ${remainingToGoal.toFixed(1)} kg`}
          </span>
        </div>

        {/* Period Change */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block">
            Variação ({timeRange === 'all' ? 'Total' : timeRange.toUpperCase()})
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {periodDelta ? (
              <>
                {periodDelta.diff > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : periodDelta.diff < 0 ? (
                  <TrendingDown className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
                <span
                  className={`text-xl font-black ${
                    periodDelta.diff > 0
                      ? 'text-emerald-400'
                      : periodDelta.diff < 0
                      ? 'text-sky-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {periodDelta.diff > 0 ? `+${periodDelta.diff.toFixed(1)}` : periodDelta.diff.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-zinc-400">kg</span>
              </>
            ) : (
              <span className="text-xl font-black text-zinc-500">--</span>
            )}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-1">
            {periodDelta
              ? `${periodDelta.pct > 0 ? '+' : ''}${periodDelta.pct}% no período`
              : 'Mínimo 2 registros'}
          </span>
        </div>

        {/* BMI */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/90">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            IMC Estimado
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-black ${bmiData ? bmiData.colorClass : 'text-zinc-500'}`}>
              {bmiData ? bmiData.bmi.toFixed(1) : '--'}
            </span>
            <span className="text-[10px] font-semibold text-zinc-500">kg/m²</span>
          </div>
          <span className={`text-[10px] font-semibold block mt-1 ${bmiData ? bmiData.colorClass : 'text-zinc-500'}`}>
            {bmiData ? bmiData.label : 'Informe altura e peso'}
          </span>
        </div>
      </div>

      {/* Log Weight Form */}
      <form
        onSubmit={handleLogWeight}
        className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/90 space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Registrar Nova Medição
          </span>
          <span className="text-[11px] text-zinc-500">Salvo automaticamente no seu histórico</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          <div className="sm:col-span-3">
            <label className="text-[11px] text-zinc-400 block mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="350"
              required
              placeholder="Ex: 75.4"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[11px] text-zinc-400 block mb-1">Data</label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateInput}
                max={todayStr}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="text-[11px] text-zinc-400 block mb-1">Observação (opcional)</label>
            <input
              type="text"
              maxLength={120}
              placeholder="Ex: Em jejum, pós-treino..."
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/15 transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Salvando...' : 'Registrar'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </form>

      {/* Chart Controls & Trend Line Chart */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Timeframe Selector */}
          <div className="inline-flex rounded-xl bg-zinc-950 border border-zinc-800 p-1 text-xs">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  timeRange === range
                    ? 'bg-emerald-500 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {range === 'all' ? 'Tudo' : range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Series Toggles */}
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setShowTrendLine((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-semibold transition ${
                showTrendLine
                  ? 'bg-lime-500/15 border-lime-500/40 text-lime-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <span className="w-3 h-0.5 border-t-2 border-dashed border-lime-400 inline-block" />
              <span>Linha de Tendência</span>
            </button>

            {targetWeight > 0 && (
              <button
                type="button"
                onClick={() => setShowTargetLine((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-semibold transition ${
                  showTargetLine
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                }`}
              >
                <span className="w-3 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block" />
                <span>Meta ({targetWeight} kg)</span>
              </button>
            )}
          </div>
        </div>

        {/* Recharts Container */}
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3 sm:p-4">
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bodyWeightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tickFormatter={(v) => `${v}kg`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as ChartPoint;
                      const formattedDate = pt.fullDate.split('-').reverse().join('/');
                      return (
                        <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-3 shadow-xl text-xs space-y-1">
                          <div className="font-mono text-zinc-400 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="text-white font-bold">
                            Peso: <span className="text-emerald-400">{pt.weight.toFixed(1)} kg</span>
                          </div>
                          {showTrendLine && chartData.length >= 2 && (
                            <div className="text-zinc-300">
                              Tendência: <span className="text-lime-400 font-semibold">{pt.trend.toFixed(1)} kg</span>
                            </div>
                          )}
                          {pt.notes && (
                            <div className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-800 max-w-[200px]">
                              {pt.notes}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {showTargetLine && targetWeight > 0 && (
                    <ReferenceLine
                      y={targetWeight}
                      stroke="#22d3ee"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Meta ${targetWeight}kg`,
                        position: 'insideTopRight',
                        fill: '#22d3ee',
                        fontSize: 10,
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="weight"
                    name="Peso (kg)"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="url(#bodyWeightGradient)"
                    dot={{ fill: '#10b981', stroke: '#09090b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#84cc16', stroke: '#09090b', strokeWidth: 2 }}
                  />
                  {showTrendLine && chartData.length >= 2 && (
                    <Line
                      type="linear"
                      dataKey="trend"
                      name="Tendência"
                      stroke="#a3e635"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-center px-4">
              <Scale className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs font-semibold text-zinc-400">
                Nenhuma medição registrada ainda.
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Use o formulário acima para registrar seu primeiro peso e gerar o gráfico de tendência.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Log Table */}
      {historyList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Histórico de Medições ({historyList.length})
            </span>
          </div>

          <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
            {historyList.map((entry, idx) => {
              const prevEntry = historyList[idx + 1];
              const delta = prevEntry
                ? Math.round((entry.weightKg - prevEntry.weightKg) * 10) / 10
                : null;

              return (
                <div
                  key={entry.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-zinc-900/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                      {entry.date.split('-').reverse().join('/')}
                    </span>
                    <span className="font-black text-white shrink-0">
                      {entry.weightKg.toFixed(1)} kg
                    </span>
                    {delta !== null && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          delta > 0
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : delta < 0
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} kg
                      </span>
                    )}
                    {entry.notes && (
                      <span className="text-[11px] text-zinc-400 truncate">{entry.notes}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={deletingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0 disabled:opacity-40"
                    title="Excluir medição"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
