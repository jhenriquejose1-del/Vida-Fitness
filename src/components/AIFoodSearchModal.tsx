import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { searchFoodWithAI, FoodSearchResult } from '../services/aiService';
import { MealType, FoodItem } from '../types';
import {
  Search,
  Sparkles,
  Plus,
  Heart,
  ExternalLink,
  RefreshCw,
  X,
  Check,
  Bookmark,
} from 'lucide-react';

interface AIFoodSearchModalProps {
  initialMealType?: MealType;
  selectedDate?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AIFoodSearchModal: React.FC<AIFoodSearchModalProps> = ({
  initialMealType = 'lunch',
  selectedDate,
  onClose,
  onSuccess,
}) => {
  const { foods, addNutritionEntry, addFoodItem, toggleFavoriteFood } = useData();
  const targetDate = selectedDate || new Date().toISOString().split('T')[0];

  const [queryText, setQueryText] = useState('');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [quantity, setQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>('g');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiResult, setAiResult] = useState<FoodSearchResult | null>(null);
  const [selectedLocalFood, setSelectedLocalFood] = useState<FoodItem | null>(null);
  const [isSavedFavorite, setIsSavedFavorite] = useState(false);

  // Filter local database
  const matchingLocalFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(queryText.toLowerCase().trim())
  );

  const handleSearchAI = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setSelectedLocalFood(null);
    try {
      const data = await searchFoodWithAI(queryText, quantity, unit);
      setAiResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao pesquisar com IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocalFood = (food: FoodItem) => {
    setSelectedLocalFood(food);
    setAiResult(null);
    setQuantity(food.defaultServing || 100);
    setUnit(food.unit || 'g');
  };

  const handleAddLocalFoodToMeal = async () => {
    if (!selectedLocalFood) return;
    const factor = quantity / 100;
    await addNutritionEntry({
      date: targetDate,
      mealType,
      name: selectedLocalFood.name,
      quantity,
      unit,
      calories: Math.round(selectedLocalFood.caloriesPer100 * factor),
      protein: Math.round(selectedLocalFood.proteinPer100 * factor * 10) / 10,
      carbs: Math.round(selectedLocalFood.carbsPer100 * factor * 10) / 10,
      fats: Math.round(selectedLocalFood.fatsPer100 * factor * 10) / 10,
      source: selectedLocalFood.source,
      verified: true,
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleAddAiResultToMeal = async () => {
    if (!aiResult) return;
    await addNutritionEntry({
      date: targetDate,
      mealType,
      name: aiResult.name,
      quantity: aiResult.requestedServing.quantity,
      unit: aiResult.requestedServing.unit,
      calories: Math.round(aiResult.requestedServing.calories),
      protein: Math.round(aiResult.requestedServing.protein * 10) / 10,
      carbs: Math.round(aiResult.requestedServing.carbs * 10) / 10,
      fats: Math.round(aiResult.requestedServing.fats * 10) / 10,
      source: aiResult.source,
      verified: true,
      sourceUrl: aiResult.sourceUrl,
    });

    if (isSavedFavorite) {
      await addFoodItem({
        name: aiResult.name,
        defaultServing: aiResult.requestedServing.quantity,
        unit: aiResult.requestedServing.unit,
        caloriesPer100: aiResult.per100g.calories,
        proteinPer100: aiResult.per100g.protein,
        carbsPer100: aiResult.per100g.carbs,
        fatsPer100: aiResult.per100g.fats,
        source: aiResult.source,
        isFavorite: true,
      });
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500 text-black">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pesquisar Alimento</h3>
              <p className="text-xs text-zinc-400">Banco de dados local e consulta instantânea com IA</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meal Type selector */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(['breakfast', 'lunch', 'snack', 'dinner', 'custom'] as MealType[]).map((type) => {
            const labels: Record<MealType, string> = {
              breakfast: 'Café',
              lunch: 'Almoço',
              snack: 'Lanche',
              dinner: 'Jantar',
              custom: 'Outro',
            };
            return (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  mealType === type ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Ex: banana, patinho moído, 2 ovos mexidos..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchAI()}
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            disabled={loading || !queryText.trim()}
            onClick={handleSearchAI}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md transition disabled:opacity-50"
            title="Pesquisar com IA e consultar bases oficiais"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="hidden sm:inline">IA</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Local database matching list */}
        {queryText.trim() && !aiResult && !selectedLocalFood && (
          <div className="mt-4">
            <span className="text-[11px] text-zinc-400 font-semibold block mb-2">
              Alimentos cadastrados ({matchingLocalFoods.length})
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {matchingLocalFoods.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleSelectLocalFood(f)}
                  className="p-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <span className="font-semibold text-xs text-white block">{f.name}</span>
                    <span className="text-[10px] text-zinc-400">
                      100{f.unit}: {f.caloriesPer100} kcal • P: {f.proteinPer100}g • C: {f.carbsPer100}g • G:{' '}
                      {f.fatsPer100}g
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Local Food details & quantity adjust */}
        {selectedLocalFood && (
          <div className="mt-5 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400">Alimento Local</span>
                <h4 className="text-base font-bold text-white">{selectedLocalFood.name}</h4>
                <span className="text-[10px] text-zinc-500">Fonte: {selectedLocalFood.source}</span>
              </div>
              <button onClick={() => setSelectedLocalFood(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">Quantidade:</span>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-24 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-center text-sm font-bold text-white"
              />
              <span className="text-xs text-zinc-300 font-semibold">{unit}</span>
            </div>

            {/* Calculated Macros */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-zinc-900 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block">Calorias</span>
                <strong className="text-emerald-400">
                  {Math.round(selectedLocalFood.caloriesPer100 * (quantity / 100))} kcal
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Proteína</span>
                <strong className="text-rose-400">
                  {Math.round(selectedLocalFood.proteinPer100 * (quantity / 100) * 10) / 10} g
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Carboidratos</span>
                <strong className="text-amber-400">
                  {Math.round(selectedLocalFood.carbsPer100 * (quantity / 100) * 10) / 10} g
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Gorduras</span>
                <strong className="text-blue-400">
                  {Math.round(selectedLocalFood.fatsPer100 * (quantity / 100) * 10) / 10} g
                </strong>
              </div>
            </div>

            <button
              onClick={handleAddLocalFoodToMeal}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition"
            >
              Adicionar à Refeição
            </button>
          </div>
        )}

        {/* AI Search Result Card */}
        {aiResult && (
          <div className="mt-5 p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Pesquisa IA Oficial ({aiResult.source})
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">{aiResult.name}</h4>
              </div>

              <button
                type="button"
                onClick={() => setIsSavedFavorite((prev) => !prev)}
                className={`p-2 rounded-xl transition ${
                  isSavedFavorite ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Salvar como favorito"
              >
                <Heart className={`w-4 h-4 ${isSavedFavorite ? 'fill-rose-400' : ''}`} />
              </button>
            </div>

            {/* Serving Macros */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block">
                  {aiResult.requestedServing.quantity}
                  {aiResult.requestedServing.unit}
                </span>
                <strong className="text-emerald-400 font-black">
                  {Math.round(aiResult.requestedServing.calories)} kcal
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Proteína</span>
                <strong className="text-rose-400 font-bold">
                  {Math.round(aiResult.requestedServing.protein * 10) / 10} g
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Carboidratos</span>
                <strong className="text-amber-400 font-bold">
                  {Math.round(aiResult.requestedServing.carbs * 10) / 10} g
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Gorduras</span>
                <strong className="text-blue-400 font-bold">
                  {Math.round(aiResult.requestedServing.fats * 10) / 10} g
                </strong>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400">
              <span>Por 100g: </span>
              <strong>{aiResult.per100g.calories} kcal</strong> (P: {aiResult.per100g.protein}g | C:{' '}
              {aiResult.per100g.carbs}g | G: {aiResult.per100g.fats}g)
            </div>

            <button
              onClick={handleAddAiResultToMeal}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md transition active:scale-95"
            >
              Adicionar ao Diário Alimentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
