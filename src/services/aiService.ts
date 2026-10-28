export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  preparation?: string;
  source: string;
  sourceUrl?: string;
  isEstimate: boolean;
}

export interface NutritionParseResult {
  foods: ParsedFoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  totalFiber?: number;
  summary: string;
  confidenceLevel: 'high' | 'medium' | 'estimated';
  sourcesConsulted: string[];
}

export interface FoodSearchResult {
  name: string;
  standardServing: number;
  unit: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  requestedServing: {
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
  source: string;
  sourceUrl?: string;
  notes?: string;
}

export async function parseNutritionWithAI(text: string): Promise<NutritionParseResult> {
  const response = await fetch('/api/ai/nutrition-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao analisar alimentos com IA.');
  }

  return response.json();
}

export async function searchFoodWithAI(query: string, quantity?: number, unit?: string): Promise<FoodSearchResult> {
  const response = await fetch('/api/ai/nutrition-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, quantity, unit }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao pesquisar alimento com IA.');
  }

  return response.json();
}

export async function askWorkoutAssistant(prompt: string, userContext?: Record<string, unknown>): Promise<string> {
  const response = await fetch('/api/ai/workout-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, userContext }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao consultar o FitEvolution Coach.');
  }

  const data = await response.json();
  return data.reply;
}

export interface GeneratedSplit {
  splitName: string;
  description: string;
  suggestedRestDays: string[];
  workouts: {
    name: string;
    muscleGroup: string;
    description: string;
    exercises: {
      name: string;
      muscleGroup: string;
      equipment: string;
      targetSets: number;
      targetReps: number;
      targetWeightKg: number;
      restTimeSeconds: number;
      notes: string;
    }[];
  }[];
}

export async function generateWorkoutSplitWithAI(params: {
  goal: string;
  daysPerWeek: number;
  level: string;
  restrictions?: string;
}): Promise<GeneratedSplit> {
  const response = await fetch('/api/ai/generate-split', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao gerar treino com IA.');
  }

  return response.json();
}
