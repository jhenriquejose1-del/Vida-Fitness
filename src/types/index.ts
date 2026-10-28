export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Abdômen'
  | 'Glúteos'
  | 'Panturrilhas'
  | 'Cardio'
  | 'Geral';

export type WorkoutStatus = 'scheduled' | 'completed' | 'partial' | 'rest' | 'skipped';

export type UserGoal = 'hypertrophy' | 'weight_loss' | 'maintenance' | 'conditioning';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  photoURL?: string;
  birthDate?: string;
  height?: number; // in cm
  currentWeight?: number; // in kg
  targetWeight?: number; // in kg
  goal?: UserGoal;
  experienceLevel?: ExperienceLevel;
  workoutDaysAvailable?: number;
  foodPreferences?: string;
  physicalRestrictions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseTemplate {
  id: string;
  userId: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
  restTimeSeconds: number;
  notes?: string;
  videoUrl?: string;
  isCustom?: boolean;
  workoutTemplateId?: string;
  createdAt?: string;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string; // e.g. "TREINO A — PEITO E TRÍCEPS"
  muscleGroup: string;
  description?: string;
  exercises: ExerciseTemplate[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutSchedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  workoutTemplateId?: string;
  workoutName: string;
  muscleGroup: string;
  status: WorkoutStatus;
  cycleBatchId?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoggedSet {
  id: string;
  userId: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  actualReps: number;
  targetWeightKg: number;
  actualWeightKg: number;
  completed: boolean;
  restTimeSeconds: number;
  completedAt?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  scheduleId?: string;
  workoutTemplateId?: string;
  workoutName: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  totalVolumeKg: number; // sum of (reps * weight)
  totalSets: number;
  status: 'completed' | 'in_progress' | 'cancelled';
  notes?: string;
  sets: LoggedSet[];
  createdAt?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'custom';

export interface NutritionEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  name: string;
  quantity: number;
  unit: string; // g, ml, unid, porção
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  source?: string;
  verified?: boolean;
  sourceUrl?: string;
  createdAt?: string;
}

export interface FoodItem {
  id: string;
  userId: string;
  name: string;
  defaultServing: number;
  unit: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatsPer100: number;
  fiberPer100?: number;
  source: string;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface RecipeIngredient {
  foodId?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Recipe {
  id: string;
  userId: string;
  name: string;
  portions: number;
  ingredients: RecipeIngredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
  createdAt?: string;
}

export interface UserSettings {
  id?: string;
  userId: string;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatsGoal: number;
  waterGoalMl: number;
  waterConsumedMl?: number;
  autoRestTimer: boolean;
  defaultRestSeconds: number;
  timerSound: 'beep' | 'bell' | 'digital' | 'chime';
  vibrationEnabled: boolean;
  soundMuted: boolean;
  notificationsEnabled: boolean;
}

export interface BatchScheduleConfig {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  selectedTemplateIds: string[]; // e.g. [Treino A, Treino B, Treino C, ...]
  cycleDays: number; // e.g. 5
  restDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, 6 = Saturday
  behavior: 'continue' | 'resetWeekly'; // continue sequence after rest days vs reset weekly
  conflictResolution: 'keep' | 'replaceFuture' | 'replaceAll';
}
