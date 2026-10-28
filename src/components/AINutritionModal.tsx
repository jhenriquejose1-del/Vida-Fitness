import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { parseNutritionWithAI, NutritionParseResult, ParsedFoodItem } from '../services/aiService';
import { MealType } from '../types';
import {
  Sparkles,
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  X,
  Flame,
  Scale,
} from 'lucide-react';

interface AINutritionModalProps {
  initialMealType?: MealType;
  selectedDate?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AINutritionModal: React.FC<AINutritionModalProps> = ({
  initialMealType = 'lunch',
  selectedDate,
  onClose,
  onSuccess,
}) => {
  const { addNutritionEntry } = useData();
  const targetDate = selectedDate || new Date().toISOString().split('T')[0];

  const [mealText, setMealText] = useState('');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<NutritionParseResult | null>(null);
  const [editableFoods, setEditableFoods] = useState<ParsedFoodItem[]>([]);
  const [adding, setAdding] = useState(false);

  const handleAnalyze = async () => {
    if (!mealText.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await parseNutritionWithAI(mealText);
      setResult(data);
      setEditableFoods(data.foods);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao analisar alimentos com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFoodItem = (index: number, updates: Partial<ParsedFoodItem>) => {
    setEditableFoods((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveFood = (index: number) => {
    setEditableFoods((prev) => prev.filter((_, i) => i !== index));
  };

  // Re-calculate totals dynamically
  const calculatedTotals = editableFoods.reduce(
    (acc, f) => ({
      calories: acc.calories + (Number(f.calories) || 0),
      protein: acc.protein + (Number(f.protein) || 0),
      carbs: acc.carbs + (Number(f.carbs) || 0),
      fats: acc.fats + (Number(f.fats) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const handleConfirmAdd = async () => {
    if (editableFoods.length === 0) return;
    setAdding(true);
    try {
      for (const food of editableFoods) {
        await addNutritionEntry({
          date: targetDate,
          mealType,
          name: food.name,
          quantity: food.quantity,
          unit: food.unit,
          calories: Math.round(food.calories),
          protein: Math.round(food.protein * 10) / 10,
          carbs: Math.round(food.carbs * 10) / 10,
          fats: Math.round(food.fats * 10) / 10,
          fiber: food.fiber ? Math.round(food.fiber * 10) / 10 : undefined,
          source: food.source,
          verified: !food.isEstimate,
          sourceUrl: food.sourceUrl,
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao adicionar refeição:', err);
      setErrorMsg('Falha ao registrar itens no diário.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-black shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Nutrição Inteligente com IA
              </h3>
              <p className="text-xs text-zinc-400">
                Interpretação natural com dados oficiais verificados (TACO, TBCA, USDA)
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
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input prompt area */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-400 font-semibold">Refeição:</span>
            {(['breakfast', 'lunch', 'snack', 'dinner', 'custom'] as MealType[]).map((type) => {
              const labels: Record<MealType, string> = {
                breakfast: 'Café da manhã',
                lunch: 'Almoço',
                snack: 'Lanche',
                dinner: 'Jantar',
                custom: 'Personalizado',
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                    mealType === type
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {labels[type]}
                </button>
              );
            })}
          </div>

          <div>
            <textarea
              rows={3}
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              placeholder="Ex: Comi 150 g de arroz branco cozido, 100 g de feijão carioca e 200 g de peito de frango grelhado com salada de alface e azeite..."
              className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-2xl p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-zinc-500">
                Pode citar gramas, colheres, fatias, modo de preparo (grelhado, frito, cozido).
              </span>
              <button
                type="button"
                disabled={loading || !mealText.trim()}
                onClick={handleAnalyze}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? 'Consultando TACO/USDA...' : 'Calcular com IA'}</span>
              </button>
            </div>
          </div>

          {/* Quick example prompts */}
          {!result && (
            <div className="pt-2">
              <span className="text-[11px] text-zinc-400 block mb-1.5">Sugestões de teste rápido:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  '150g de arroz branco, 100g feijão carioca e 200g frango grelhado',
                  '2 fatias de pão integral com 3 ovos mexidos e café sem açúcar',
                  '1 scoop de whey com 40g de aveia e 1 banana prata amassada',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setMealText(sample);
                    }}
                    className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-left transition"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result Review Table */}
          {result && (
            <div className="mt-6 space-y-4 pt-4 border-t border-zinc-800 animate-fadeIn">
              {/* Summary and verification badge */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Análise Concluída</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      {result.sourcesConsulted.join(', ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{result.summary}</p>
                </div>
              </div>

              {/* Editable Breakdown list */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Alimentos Identificados ({editableFoods.length})</span>
                  <span>Você pode ajustar os valores antes de salvar</span>
                </div>

                <div className="divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
                  {editableFoods.map((food, idx) => (
                    <div key={idx} className="p-3 hover:bg-zinc-900/50 transition space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={food.name}
                            onChange={(e) => handleUpdateFoodItem(idx, { name: e.target.value })}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white w-full max-w-[220px]"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={food.quantity}
                              onChange={(e) =>
                                handleUpdateFoodItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                              }
                              className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-center text-white"
                            />
                            <span className="text-xs text-zinc-400">{food.unit}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-400">
                            {Math.round(food.calories)} kcal
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFood(idx)}
                            className="p-1 rounded-md text-zinc-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px] text-zinc-400 pt-1">
                        <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-lg">
                          <span className="text-rose-400 font-bold">P:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={food.protein}
                            onChange={(e) =>
                              handleUpdateFoodItem(idx, { protein: parseFloat(e.target.value) || 0 })
                            }
                            className="w-12 bg-transparent text-white font-semibold text-right"
                          />
                          <span>g</span>
                        </div>
                        <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-lg">
                          <span className="text-amber-400 font-bold">C:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={food.carbs}
                            onChange={(e) =>
                              handleUpdateFoodItem(idx, { carbs: parseFloat(e.target.value) || 0 })
                            }
                            className="w-12 bg-transparent text-white font-semibold text-right"
                          />
                          <span>g</span>
                        </div>
                        <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-lg">
                          <span className="text-blue-400 font-bold">G:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={food.fats}
                            onChange={(e) =>
                              handleUpdateFoodItem(idx, { fats: parseFloat(e.target.value) || 0 })
                            }
                            className="w-12 bg-transparent text-white font-semibold text-right"
                          />
                          <span>g</span>
                        </div>
                        <div className="flex items-center justify-end text-[10px] text-zinc-500 pr-1">
                          Fonte: {food.source.split('/')[0]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Macros Banner */}
              <div className="grid grid-cols-4 gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700/60 text-center">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Calorias</span>
                  <span className="text-base font-black text-emerald-400">
                    {Math.round(calculatedTotals.calories)} kcal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Proteínas</span>
                  <span className="text-base font-black text-rose-400">
                    {Math.round(calculatedTotals.protein * 10) / 10} g
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Carboidratos</span>
                  <span className="text-base font-black text-amber-400">
                    {Math.round(calculatedTotals.carbs * 10) / 10} g
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Gorduras</span>
                  <span className="text-base font-black text-blue-400">
                    {Math.round(calculatedTotals.fats * 10) / 10} g
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold transition"
          >
            Cancelar
          </button>

          {result && (
            <button
              type="button"
              disabled={adding || editableFoods.length === 0}
              onClick={handleConfirmAdd}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{adding ? 'Salvando...' : `Confirmar e Adicionar (${editableFoods.length} itens)`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
