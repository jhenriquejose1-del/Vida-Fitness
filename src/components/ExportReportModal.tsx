import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Printer, X, Check, Dumbbell, Utensils, Scale } from 'lucide-react';

interface ExportReportModalProps {
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ onClose }) => {
  const { sessions, sets, nutritionEntries, measurements, settings } = useData();
  const { profile } = useAuth();

  const [activeReport, setActiveReport] = useState<'workouts' | 'nutrition' | 'measurements'>('workouts');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // CSV Generation Functions
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportWorkoutsCSV = () => {
    const headers = ['Data', 'Nome do Treino', 'Duracao (min)', 'Volume Total (kg)', 'Series Realizadas', 'Status'];
    const rows = sessions.map((s) => [
      s.date,
      `"${s.workoutName.replace(/"/g, '""')}"`,
      Math.round(s.durationSeconds / 60),
      s.totalVolumeKg,
      s.sets.filter((x) => x.completed).length,
      s.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('fitevolution_treinos.csv', csv);
  };

  const handleExportNutritionCSV = () => {
    const headers = ['Data', 'Refeicao', 'Alimento', 'Quantidade', 'Unidade', 'Calorias (kcal)', 'Proteina (g)', 'Carboidrato (g)', 'Gordura (g)', 'Fonte'];
    const rows = nutritionEntries.map((n) => [
      n.date,
      n.mealType,
      `"${n.name.replace(/"/g, '""')}"`,
      n.quantity,
      n.unit,
      n.calories,
      n.protein,
      n.carbs,
      n.fats,
      `"${(n.source || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('fitevolution_nutricao.csv', csv);
  };

  const handleExportMeasurementsCSV = () => {
    const headers = ['Data', 'Peso (kg)', 'Notas'];
    const rows = measurements.map((m) => [m.date, m.weightKg, `"${(m.notes || '').replace(/"/g, '""')}"`]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV('fitevolution_pesos.csv', csv);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Relatórios & Exportação</h3>
              <p className="text-xs text-zinc-400">Exportação em PDF para impressão e arquivos CSV para planilhas</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Arquivo {downloadSuccess} exportado com sucesso!</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex items-center gap-2 my-4 shrink-0">
          <button
            onClick={() => setActiveReport('workouts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeReport === 'workouts' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Histórico de Treinos
          </button>
          <button
            onClick={() => setActiveReport('nutrition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeReport === 'nutrition' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Relatório Nutricional
          </button>
          <button
            onClick={() => setActiveReport('measurements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeReport === 'measurements' ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Evolução de Peso
          </button>
        </div>

        {/* Printable preview area */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-5 text-xs text-zinc-300 print:text-black print:bg-white print:p-0">
          <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white print:text-black">FitEvolution AI — Relatório Oficial</h2>
              <p className="text-[11px] text-zinc-400 print:text-zinc-600">
                Atleta: <strong>{profile?.name || 'Atleta'}</strong> • Emitido em: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 print:border text-[10px] font-bold">
              {activeReport.toUpperCase()}
            </span>
          </div>

          {activeReport === 'workouts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center p-3 rounded-xl bg-zinc-900 print:bg-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Total de Sessões</span>
                  <strong className="text-base text-white print:text-black">{sessions.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Volume Total Levantado</span>
                  <strong className="text-base text-emerald-400 print:text-emerald-700">
                    {sessions.reduce((acc, s) => acc + s.totalVolumeKg, 0).toLocaleString()} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Total de Séries</span>
                  <strong className="text-base text-white print:text-black">{sets.length}</strong>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 print:text-black">
                    <th className="py-2">Data</th>
                    <th className="py-2">Treino</th>
                    <th className="py-2">Duração</th>
                    <th className="py-2">Volume</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {sessions.slice(0, 30).map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 font-mono text-[11px]">{s.date}</td>
                      <td className="py-2 font-semibold text-white print:text-black">{s.workoutName}</td>
                      <td className="py-2">{Math.round(s.durationSeconds / 60)} min</td>
                      <td className="py-2 text-emerald-400 print:text-black font-semibold">{s.totalVolumeKg} kg</td>
                      <td className="py-2 capitalize">{s.status === 'completed' ? 'Concluído' : s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'nutrition' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-center p-3 rounded-xl bg-zinc-900 print:bg-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Itens Registrados</span>
                  <strong className="text-base text-white print:text-black">{nutritionEntries.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Meta Diária Calorias</span>
                  <strong className="text-base text-emerald-400 print:text-emerald-700">{settings.calorieGoal} kcal</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Meta Proteica</span>
                  <strong className="text-base text-rose-400 print:text-rose-700">{settings.proteinGoal} g</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Meta Água</span>
                  <strong className="text-base text-blue-400 print:text-blue-700">{settings.waterGoalMl} ml</strong>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 print:text-black">
                    <th className="py-2">Data</th>
                    <th className="py-2">Refeição</th>
                    <th className="py-2">Alimento</th>
                    <th className="py-2">Porção</th>
                    <th className="py-2">Calorias</th>
                    <th className="py-2">P / C / G</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {nutritionEntries.slice(0, 30).map((n) => (
                    <tr key={n.id}>
                      <td className="py-2 font-mono text-[11px]">{n.date}</td>
                      <td className="py-2 capitalize">{n.mealType}</td>
                      <td className="py-2 font-semibold text-white print:text-black">{n.name}</td>
                      <td className="py-2">{n.quantity} {n.unit}</td>
                      <td className="py-2 text-emerald-400 font-bold">{n.calories} kcal</td>
                      <td className="py-2 font-mono text-[11px]">{n.protein}g / {n.carbs}g / {n.fats}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'measurements' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center p-3 rounded-xl bg-zinc-900 print:bg-zinc-100">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Peso Atual</span>
                  <strong className="text-base text-white print:text-black">{profile?.currentWeight || '--'} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Peso Meta</span>
                  <strong className="text-base text-emerald-400 print:text-emerald-700">{profile?.targetWeight || '--'} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Registros</span>
                  <strong className="text-base text-white print:text-black">{measurements.length}</strong>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 print:text-black">
                    <th className="py-2">Data</th>
                    <th className="py-2">Peso Corporal</th>
                    <th className="py-2">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {measurements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 font-mono text-[11px]">{m.date}</td>
                      <td className="py-2 font-bold text-emerald-400 print:text-black">{m.weightKg} kg</td>
                      <td className="py-2 text-zinc-400 print:text-zinc-600">{m.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeReport === 'workouts' && (
              <button
                onClick={handleExportWorkoutsCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Baixar Treinos (.CSV)
              </button>
            )}
            {activeReport === 'nutrition' && (
              <button
                onClick={handleExportNutritionCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Baixar Nutrição (.CSV)
              </button>
            )}
            {activeReport === 'measurements' && (
              <button
                onClick={handleExportMeasurementsCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Baixar Pesos (.CSV)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
