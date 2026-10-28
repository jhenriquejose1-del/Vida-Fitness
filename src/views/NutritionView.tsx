import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { MealType, NutritionEntry, Recipe } from '../types';
import {
  Utensils,
  Plus,
  Sparkles,
  Search,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Droplet,
  BookOpen,
  Calendar,
  CheckCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface NutritionViewProps {
  onOpenAIAnalyze: (mealType?: MealType) => void;
  onOpenAISearch: (mealType?: MealType) => void;
}

const MEAL_TYPES: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Café da Manhã', icon: '☀️' },
  { type: 'lunch', label: 'Almoço', icon: '🥗' },
  { type: 'snack', label: 'Lanche da Tarde', icon: '🍎' },
  { type: 'dinner', label: 'Jantar', icon: '🍲' },
  { type: 'custom', label: 'Ceia / Outros', icon: '🌙' },
];

export const NutritionView: React.FC<NutritionViewProps> = ({
  onOpenAIAnalyze,
  onOpenAISearch,
}) => {
  const {
    nutritionEntries,
    deleteNutritionEntry,
    copyMealFromYesterday,
    duplicateDayMeals,
    settings,
    updateWaterConsumed,
    recipes,
    addRecipe,
  } = useData();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeSubTab, setActiveSubTab] = useState<'diary' | 'recipes' | 'charts'>('diary');

  // Recipe Modal state
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipePortions, setRecipePortions] = useState(2);
  const [recipeIngName, setRecipeIngName] = useState('');
  const [recipeIngQty, setRecipeIngQty] = useState(100);
  const [recipeIngCal, setRecipeIngCal] = useState(150);
  const [recipeIngProt, setRecipeIngProt] = useState(15);
  const [recipeIngCarb, setRecipeIngCarb] = useState(10);
  const [recipeIngFat, setRecipeIngFat] = useState(3);
  const [recipeIngredients, setRecipeIngredients] = useState<Recipe['ingredients']>([]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filter entries for the selected day
  const dayEntries = useMemo(() => {
    return nutritionEntries.filter((n) => n.date === selectedDate);
  }, [nutritionEntries, selectedDate]);

  // Daily totals
  const dailyTotals = useMemo(() => {
    return dayEntries.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fats: acc.fats + (item.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [dayEntries]);

  // Chart data: 7 days nutrition history
  const weeklyNutritionChartData = useMemo(() => {
    const data = [];
    const base = new Date(selectedDate + 'T00:00:00');

    for (let i = 6; i >= 0; i--) {
      const cur = new Date(base);
      cur.setDate(cur.getDate() - i);
      const dStr = cur.toISOString().split('T')[0];

      const entries = nutritionEntries.filter((n) => n.date === dStr);
      const cal = entries.reduce((s, x) => s + (x.calories || 0), 0);
      const p = Math.round(entries.reduce((s, x) => s + (x.protein || 0), 0));
      const c = Math.round(entries.reduce((s, x) => s + (x.carbs || 0), 0));
      const g = Math.round(entries.reduce((s, x) => s + (x.fats || 0), 0));

      const dayLabel = cur.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
      data.push({
        date: dayLabel,
        calorias: cal,
        proteina: p,
        carboidratos: c,
        gorduras: g,
        metaCalorias: settings.calorieGoal || 2000,
      });
    }
    return data;
  }, [nutritionEntries, selectedDate, settings]);

  const handleAddIngredient = () => {
    if (!recipeIngName.trim()) return;
    setRecipeIngredients((prev) => [
      ...prev,
      {
        name: recipeIngName,
        quantity: recipeIngQty,
        unit: 'g',
        calories: recipeIngCal,
        protein: recipeIngProt,
        carbs: recipeIngCarb,
        fats: recipeIngFat,
      },
    ]);
    setRecipeIngName('');
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || recipeIngredients.length === 0) return;
    const totalCal = recipeIngredients.reduce((s, i) => s + i.calories, 0);
    const totalProt = recipeIngredients.reduce((s, i) => s + i.protein, 0);
    const totalCarb = recipeIngredients.reduce((s, i) => s + i.carbs, 0);
    const totalFat = recipeIngredients.reduce((s, i) => s + i.fats, 0);

    await addRecipe({
      name: recipeName,
      portions: recipePortions,
      ingredients: recipeIngredients,
      totalCalories: totalCal,
      totalProtein: totalProt,
      totalCarbs: totalCarb,
      totalFats: totalFat,
    });

    setShowRecipeModal(false);
    setRecipeName('');
    setRecipeIngredients([]);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-emerald-400" />
            Diário de Alimentação & Macros
          </h2>
          <p className="text-xs text-zinc-400">
            Cálculo nutricional inteligente com IA e tabelas oficiais (TACO/TBCA/USDA)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAIAnalyze()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Descrever com IA</span>
          </button>

          <button
            onClick={() => onOpenAISearch()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-extrabold text-xs transition"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Buscar Alimento</span>
          </button>
        </div>
      </div>

      {/* Date Navigator Bar */}
      <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 shadow-xl flex items-center justify-between">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-bold text-sm text-white focus:outline-none cursor-pointer"
          />
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        {[
          { id: 'diary', label: 'Diário de Refeições' },
          { id: 'charts', label: 'Gráficos de Consumo' },
          { id: 'recipes', label: 'Receitas Personalizadas' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: MEALS DIARY */}
      {activeSubTab === 'diary' && (
        <div className="space-y-6">
          {/* Daily Macros Card */}
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Calorias</span>
                <strong className="text-xl font-black text-emerald-400">
                  {Math.round(dailyTotals.calories)}
                </strong>
                <span className="text-[10px] text-zinc-500 block">/ {settings.calorieGoal} kcal</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Proteínas</span>
                <strong className="text-xl font-black text-rose-400">
                  {Math.round(dailyTotals.protein * 10) / 10}g
                </strong>
                <span className="text-[10px] text-zinc-500 block">/ {settings.proteinGoal}g</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Carboidratos</span>
                <strong className="text-xl font-black text-amber-400">
                  {Math.round(dailyTotals.carbs * 10) / 10}g
                </strong>
                <span className="text-[10px] text-zinc-500 block">/ {settings.carbsGoal}g</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Gorduras</span>
                <strong className="text-xl font-black text-blue-400">
                  {Math.round(dailyTotals.fats * 10) / 10}g
                </strong>
                <span className="text-[10px] text-zinc-500 block">/ {settings.fatsGoal}g</span>
              </div>
            </div>
          </div>

          {/* Meals List */}
          <div className="space-y-4">
            {MEAL_TYPES.map((m) => {
              const mealItems = dayEntries.filter((e) => e.mealType === m.type);
              const mealCalories = mealItems.reduce((sum, i) => sum + (i.calories || 0), 0);
              const mealProtein = mealItems.reduce((sum, i) => sum + (i.protein || 0), 0);
              const mealCarbs = mealItems.reduce((sum, i) => sum + (i.carbs || 0), 0);
              const mealFats = mealItems.reduce((sum, i) => sum + (i.fats || 0), 0);

              return (
                <div
                  key={m.type}
                  className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{m.icon}</span>
                      <div>
                        <h3 className="text-base font-extrabold text-white">{m.label}</h3>
                        <span className="text-xs text-zinc-400">
                          {Math.round(mealCalories)} kcal • P: {Math.round(mealProtein)}g • C:{' '}
                          {Math.round(mealCarbs)}g • G: {Math.round(mealFats)}g
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          const count = await copyMealFromYesterday(selectedDate, m.type);
                          if (count === 0) alert('Nenhum item encontrado no dia anterior para esta refeição.');
                        }}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
                        title="Copiar do dia anterior"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenAIAnalyze(m.type)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>IA</span>
                      </button>

                      <button
                        onClick={() => onOpenAISearch(m.type)}
                        className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                        title="Buscar Alimento"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items Table */}
                  {mealItems.length > 0 ? (
                    <div className="divide-y divide-zinc-800/60 pt-1">
                      {mealItems.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-zinc-200 block">{item.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              {item.quantity} {item.unit} • P: {item.protein}g • C: {item.carbs}g • G:{' '}
                              {item.fats}g
                              {item.source && ` (${item.source.split('/')[0]})`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-400">{item.calories} kcal</span>
                            <button
                              onClick={() => deleteNutritionEntry(item.id)}
                              className="text-zinc-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-xs text-zinc-500 italic">
                      Nenhum alimento registrado ainda nesta refeição.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: NUTRITION CHARTS */}
      {activeSubTab === 'charts' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              Consumo Calórico Diário vs Meta
            </h3>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyNutritionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="calorias" name="Calorias Consumidas" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="metaCalorias" name="Meta Diária" fill="#27272a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Macronutrientes nos Últimos 7 Dias (g)</h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyNutritionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="proteina" name="Proteínas (g)" fill="#f43f5e" />
                  <Bar dataKey="carboidratos" name="Carboidratos (g)" fill="#f59e0b" />
                  <Bar dataKey="gorduras" name="Gorduras (g)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM RECIPES */}
      {activeSubTab === 'recipes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-semibold">Minhas Receitas ({recipes.length})</span>
            <button
              onClick={() => setShowRecipeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Receita</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((r) => (
              <div key={r.id} className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 shadow-xl space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{r.name}</h4>
                    <span className="text-xs text-zinc-400">{r.portions} porções</span>
                  </div>
                  <span className="text-sm font-black text-emerald-400">
                    {Math.round(r.totalCalories / r.portions)} kcal / porção
                  </span>
                </div>

                <div className="text-xs text-zinc-400">
                  Porção: P: {Math.round((r.totalProtein / r.portions) * 10) / 10}g • C:{' '}
                  {Math.round((r.totalCarbs / r.portions) * 10) / 10}g • G:{' '}
                  {Math.round((r.totalFats / r.portions) * 10) / 10}g
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
                  {r.ingredients.length} ingredientes: {r.ingredients.map((i) => i.name).join(', ')}
                </div>
              </div>
            ))}
          </div>

          {/* New Recipe Modal */}
          {showRecipeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
              <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl space-y-4 my-6">
                <h3 className="text-lg font-black text-white">Criar Nova Receita</h3>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Nome da Receita:</label>
                  <input
                    type="text"
                    placeholder="Ex: Panqueca de Aveia com Whey"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Número de porções:</label>
                  <input
                    type="number"
                    min="1"
                    value={recipePortions}
                    onChange={(e) => setRecipePortions(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>

                {/* Add Ingredients */}
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <span className="font-bold text-emerald-400 block">Adicionar Ingrediente</span>
                  <input
                    type="text"
                    placeholder="Nome (ex: Aveia em flocos)"
                    value={recipeIngName}
                    onChange={(e) => setRecipeIngName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="number"
                      placeholder="Qtd (g)"
                      value={recipeIngQty}
                      onChange={(e) => setRecipeIngQty(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Kcal"
                      value={recipeIngCal}
                      onChange={(e) => setRecipeIngCal(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Prot (g)"
                      value={recipeIngProt}
                      onChange={(e) => setRecipeIngProt(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Carb (g)"
                      value={recipeIngCarb}
                      onChange={(e) => setRecipeIngCarb(parseFloat(e.target.value) || 0)}
                      className="bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="w-full py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold"
                  >
                    + Incluir Ingrediente
                  </button>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recipeIngredients.map((ing, i) => (
                      <div key={i} className="flex justify-between p-1.5 bg-zinc-900 rounded-lg text-zinc-300">
                        <span>{ing.name} ({ing.quantity}g)</span>
                        <span>{ing.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => setShowRecipeModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveRecipe}
                    disabled={!recipeName || recipeIngredients.length === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md disabled:opacity-50"
                  >
                    Salvar Receita
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
