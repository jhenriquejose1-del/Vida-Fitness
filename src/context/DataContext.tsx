import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  WorkoutTemplate,
  WorkoutSchedule,
  WorkoutSession,
  LoggedSet,
  NutritionEntry,
  FoodItem,
  Recipe,
  BodyMeasurement,
  UserSettings,
  BatchScheduleConfig,
} from '../types';
import {
  INITIAL_WORKOUT_TEMPLATES,
  INITIAL_FOOD_DATABASE,
  DEFAULT_USER_SETTINGS,
  INITIAL_MEASUREMENTS,
} from '../data/seedData';

interface DataContextType {
  templates: WorkoutTemplate[];
  schedules: WorkoutSchedule[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
  nutritionEntries: NutritionEntry[];
  foods: FoodItem[];
  recipes: Recipe[];
  measurements: BodyMeasurement[];
  settings: UserSettings;
  loading: boolean;
  activeSession: WorkoutSession | null;

  // Template actions
  addTemplate: (template: Omit<WorkoutTemplate, 'id' | 'userId'>) => Promise<string>;
  updateTemplate: (id: string, template: Partial<WorkoutTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Schedule & Batch actions
  generateBatchSchedule: (config: BatchScheduleConfig) => Promise<{ generatedCount: number }>;
  updateScheduleStatus: (id: string, status: WorkoutSchedule['status']) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  // Session & Live Workout actions
  startLiveSession: (templateId?: string, scheduleId?: string) => WorkoutSession;
  updateActiveSessionSet: (exerciseId: string, setNumber: number, data: Partial<LoggedSet>) => void;
  finishActiveSession: (notes?: string) => Promise<void>;
  cancelActiveSession: () => void;
  getLastExercisePerformance: (exerciseName: string) => { reps: number; weightKg: number } | null;

  // Nutrition actions
  addNutritionEntry: (entry: Omit<NutritionEntry, 'id' | 'userId'>) => Promise<void>;
  deleteNutritionEntry: (id: string) => Promise<void>;
  copyMealFromYesterday: (targetDate: string, mealType: NutritionEntry['mealType']) => Promise<number>;
  duplicateDayMeals: (sourceDate: string, targetDate: string) => Promise<number>;
  addFoodItem: (food: Omit<FoodItem, 'id' | 'userId'>) => Promise<void>;
  toggleFavoriteFood: (id: string) => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'userId'>) => Promise<void>;

  // Water & Settings actions
  updateWaterConsumed: (amountDelta: number) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

  // Measurement actions
  addMeasurement: (weightKg: number, date?: string, notes?: string) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(true);

  // States
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [schedules, setSchedules] = useState<WorkoutSchedule[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(() => {
    const saved = localStorage.getItem('fe_active_session');
    return saved ? JSON.parse(saved) : null;
  });

  const currentUserId = user ? user.uid : 'guest';

  // Load data on user change
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);

      if (user && !isGuest) {
        // Logged in via Firebase
        try {
          const fetchCollection = async <T,>(colName: string): Promise<T[]> => {
            const q = query(collection(db, colName), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as T[];
          };

          const [
            fbTemplates,
            fbSchedules,
            fbSessions,
            fbSets,
            fbNutrition,
            fbFoods,
            fbRecipes,
            fbMeasurements,
            fbSettingsDocs,
          ] = await Promise.all([
            fetchCollection<WorkoutTemplate>('workoutTemplates'),
            fetchCollection<WorkoutSchedule>('workoutSchedules'),
            fetchCollection<WorkoutSession>('workoutSessions'),
            fetchCollection<LoggedSet>('exerciseSets'),
            fetchCollection<NutritionEntry>('nutritionEntries'),
            fetchCollection<FoodItem>('foodItems'),
            fetchCollection<Recipe>('recipes'),
            fetchCollection<BodyMeasurement>('bodyMeasurements'),
            fetchCollection<UserSettings>('userSettings'),
          ]);

          if (isMounted) {
            // Seed default templates if user has none
            if (fbTemplates.length === 0) {
              const userSeedTemplates = INITIAL_WORKOUT_TEMPLATES.map((t) => ({
                ...t,
                id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                userId: user.uid,
              }));
              setTemplates(userSeedTemplates);
              userSeedTemplates.forEach(async (tpl) => {
                try {
                  await setDoc(doc(db, 'workoutTemplates', tpl.id), tpl);
                } catch {
                  // Fallback
                }
              });
            } else {
              setTemplates(fbTemplates);
            }

            setSchedules(fbSchedules);
            setSessions(fbSessions);
            setSets(fbSets);
            setNutritionEntries(fbNutrition);
            setFoods(fbFoods.length > 0 ? fbFoods : INITIAL_FOOD_DATABASE.map(f => ({ ...f, userId: user.uid })));
            setRecipes(fbRecipes);
            setMeasurements(fbMeasurements.length > 0 ? fbMeasurements : INITIAL_MEASUREMENTS.map(m => ({ ...m, userId: user.uid })));
            if (fbSettingsDocs.length > 0) {
              setSettings(fbSettingsDocs[0]);
            } else {
              const defaultSet = { ...DEFAULT_USER_SETTINGS, userId: user.uid };
              setSettings(defaultSet);
              await setDoc(doc(db, 'userSettings', user.uid), defaultSet).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Firestore indisponível ou offline. Carregando dados do cache local:', err);
          loadLocalStorageData();
        }
      } else {
        // Guest mode or initial load from localStorage
        loadLocalStorageData();
      }

      if (isMounted) setLoading(false);
    }

    function loadLocalStorageData() {
      const getStored = <T,>(key: string, defaultVal: T): T => {
        try {
          const item = localStorage.getItem(`fe_${key}`);
          return item ? JSON.parse(item) : defaultVal;
        } catch {
          return defaultVal;
        }
      };

      setTemplates(getStored('templates', INITIAL_WORKOUT_TEMPLATES));
      setSchedules(getStored('schedules', []));
      setSessions(getStored('sessions', []));
      setSets(getStored('sets', []));
      setNutritionEntries(getStored('nutrition', []));
      setFoods(getStored('foods', INITIAL_FOOD_DATABASE));
      setRecipes(getStored('recipes', []));
      setMeasurements(getStored('measurements', INITIAL_MEASUREMENTS));
      setSettings(getStored('settings', DEFAULT_USER_SETTINGS));
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  // Persist to localStorage for offline cache
  useEffect(() => {
    localStorage.setItem('fe_templates', JSON.stringify(templates));
    localStorage.setItem('fe_schedules', JSON.stringify(schedules));
    localStorage.setItem('fe_sessions', JSON.stringify(sessions));
    localStorage.setItem('fe_sets', JSON.stringify(sets));
    localStorage.setItem('fe_nutrition', JSON.stringify(nutritionEntries));
    localStorage.setItem('fe_foods', JSON.stringify(foods));
    localStorage.setItem('fe_recipes', JSON.stringify(recipes));
    localStorage.setItem('fe_measurements', JSON.stringify(measurements));
    localStorage.setItem('fe_settings', JSON.stringify(settings));
    if (activeSession) {
      localStorage.setItem('fe_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('fe_active_session');
    }
  }, [templates, schedules, sessions, sets, nutritionEntries, foods, recipes, measurements, settings, activeSession]);

  // Template Actions
  const addTemplate = async (data: Omit<WorkoutTemplate, 'id' | 'userId'>): Promise<string> => {
    const id = `template_${Date.now()}`;
    const newTemplate: WorkoutTemplate = {
      ...data,
      id,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [newTemplate, ...prev]);

    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'workoutTemplates', id), newTemplate);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `workoutTemplates/${id}`);
      }
    }
    return id;
  };

  const updateTemplate = async (id: string, data: Partial<WorkoutTemplate>): Promise<void> => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t))
    );
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'workoutTemplates', id), data, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `workoutTemplates/${id}`);
      }
    }
  };

  const deleteTemplate = async (id: string): Promise<void> => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (user && !isGuest) {
      try {
        await deleteDoc(doc(db, 'workoutTemplates', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `workoutTemplates/${id}`);
      }
    }
  };

  /**
   * BATCH WORKOUT GENERATION (FUNÇÃO ESSENCIAL)
   * Cycles through selected templates respecting rest days and continuation rules.
   */
  const generateBatchSchedule = async (config: BatchScheduleConfig): Promise<{ generatedCount: number }> => {
    const { startDate, endDate, selectedTemplateIds, restDaysOfWeek, behavior, conflictResolution } = config;

    if (!selectedTemplateIds.length) {
      throw new Error('Selecione pelo menos um treino para o ciclo.');
    }

    const templateMap = new Map<string, WorkoutTemplate>();
    templates.forEach((t) => templateMap.set(t.id, t));

    // Determine target templates in sequence
    const sequenceTemplates = selectedTemplateIds
      .map((id) => templateMap.get(id))
      .filter((t): t is WorkoutTemplate => Boolean(t));

    if (sequenceTemplates.length === 0) {
      throw new Error('Nenhum dos treinos selecionados foi encontrado.');
    }

    const batchId = `batch_${Date.now()}`;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    // Filter existing schedules in range based on conflictResolution
    const existingInRange = schedules.filter((s) => s.date >= startDate && s.date <= endDate);
    const completedDates = new Set(existingInRange.filter((s) => s.status === 'completed').map((s) => s.date));
    const todayStr = new Date().toISOString().split('T')[0];

    const newSchedules: WorkoutSchedule[] = [];
    let cycleIndex = 0;
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday

      // Check conflict
      const existingForDay = existingInRange.find((s) => s.date === dateStr);
      const isPastOrCompleted = completedDates.has(dateStr) || (existingForDay && existingForDay.status === 'completed');

      if (isPastOrCompleted) {
        // Never overwrite completed workout historical records!
        current.setDate(current.getDate() + 1);
        continue;
      }

      if (conflictResolution === 'keep' && existingForDay) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      if (conflictResolution === 'replaceFuture' && dateStr < todayStr && existingForDay) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Check if this day is a designated rest day
      const isRestDay = restDaysOfWeek.includes(dayOfWeek);

      // Weekly reset behavior: if week restarts on Monday (or Sunday)
      if (behavior === 'resetWeekly' && dayOfWeek === 1) {
        cycleIndex = 0;
      }

      if (isRestDay) {
        // Resting day does NOT consume sequence positions
        newSchedules.push({
          id: `sched_${dateStr}_rest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          userId: currentUserId,
          date: dateStr,
          workoutName: 'DESCANSO',
          muscleGroup: 'Recuperação Muscular',
          status: 'rest',
          cycleBatchId: batchId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Workout Day: pick current template in cycle
        const currentTemplate = sequenceTemplates[cycleIndex % sequenceTemplates.length];
        newSchedules.push({
          id: `sched_${dateStr}_${currentTemplate.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          userId: currentUserId,
          date: dateStr,
          workoutTemplateId: currentTemplate.id,
          workoutName: currentTemplate.name,
          muscleGroup: currentTemplate.muscleGroup,
          status: 'scheduled',
          cycleBatchId: batchId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Sequence only advances on training days!
        cycleIndex++;
      }

      current.setDate(current.getDate() + 1);
    }

    // Merge with existing schedules
    const datesToReplace = new Set(newSchedules.map((s) => s.date));
    const filteredExisting = schedules.filter((s) => {
      if (datesToReplace.has(s.date)) {
        return s.status === 'completed'; // Keep completed ones
      }
      return true;
    });

    const finalSchedules = [...filteredExisting, ...newSchedules].sort((a, b) => a.date.localeCompare(b.date));
    setSchedules(finalSchedules);

    // Save batch to Firestore if authenticated
    if (user && !isGuest && newSchedules.length > 0) {
      try {
        const batch = writeBatch(db);
        newSchedules.slice(0, 450).forEach((sched) => {
          batch.set(doc(db, 'workoutSchedules', sched.id), sched);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao salvar lote no Firestore, salvo localmente:', err);
      }
    }

    return { generatedCount: newSchedules.length };
  };

  const updateScheduleStatus = async (id: string, status: WorkoutSchedule['status']): Promise<void> => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s))
    );
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'workoutSchedules', id), { status, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `workoutSchedules/${id}`);
      }
    }
  };

  const deleteSchedule = async (id: string): Promise<void> => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (user && !isGuest) {
      try {
        await deleteDoc(doc(db, 'workoutSchedules', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `workoutSchedules/${id}`);
      }
    }
  };

  /**
   * LIVE WORKOUT EXECUTION
   */
  const getLastExercisePerformance = (exerciseName: string): { reps: number; weightKg: number } | null => {
    const matchingSets = sets
      .filter((s) => s.exerciseName.toLowerCase() === exerciseName.toLowerCase() && s.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    if (matchingSets.length > 0) {
      return {
        reps: matchingSets[0].actualReps,
        weightKg: matchingSets[0].actualWeightKg,
      };
    }
    return null;
  };

  const startLiveSession = (templateId?: string, scheduleId?: string): WorkoutSession => {
    const targetTemplate = templates.find((t) => t.id === templateId) || templates[0];
    const today = new Date().toISOString().split('T')[0];

    const initialSets: LoggedSet[] = [];
    const sessionId = `session_${Date.now()}`;

    if (targetTemplate) {
      targetTemplate.exercises.forEach((ex) => {
        // Suggest last load or fallback to template default
        const lastPerf = getLastExercisePerformance(ex.name);
        const suggestedWeight = lastPerf ? lastPerf.weightKg : ex.targetWeightKg;
        const suggestedReps = lastPerf ? lastPerf.reps : ex.targetReps;

        for (let i = 1; i <= ex.targetSets; i++) {
          initialSets.push({
            id: `set_${sessionId}_${ex.id}_${i}`,
            userId: currentUserId,
            sessionId,
            exerciseId: ex.id,
            exerciseName: ex.name,
            setNumber: i,
            targetReps: ex.targetReps,
            actualReps: suggestedReps,
            targetWeightKg: ex.targetWeightKg,
            actualWeightKg: suggestedWeight,
            completed: false,
            restTimeSeconds: ex.restTimeSeconds || settings.defaultRestSeconds || 60,
          });
        }
      });
    }

    const newSession: WorkoutSession = {
      id: sessionId,
      userId: currentUserId,
      scheduleId,
      workoutTemplateId: targetTemplate?.id,
      workoutName: targetTemplate ? targetTemplate.name : 'Treino Livre',
      date: today,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      totalVolumeKg: 0,
      totalSets: initialSets.length,
      status: 'in_progress',
      sets: initialSets,
      createdAt: new Date().toISOString(),
    };

    setActiveSession(newSession);
    return newSession;
  };

  const updateActiveSessionSet = (exerciseId: string, setNumber: number, data: Partial<LoggedSet>) => {
    if (!activeSession) return;

    const updatedSets = activeSession.sets.map((s) => {
      if (s.exerciseId === exerciseId && s.setNumber === setNumber) {
        return {
          ...s,
          ...data,
          completedAt: data.completed ? new Date().toISOString() : s.completedAt,
        };
      }
      return s;
    });

    const completedSets = updatedSets.filter((s) => s.completed);
    const totalVolume = completedSets.reduce((sum, s) => sum + s.actualReps * s.actualWeightKg, 0);

    setActiveSession({
      ...activeSession,
      sets: updatedSets,
      totalVolumeKg: totalVolume,
    });
  };

  const finishActiveSession = async (notes?: string): Promise<void> => {
    if (!activeSession) return;

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      60,
      Math.floor((new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) / 1000)
    );

    const completedSets = activeSession.sets.filter((s) => s.completed);
    const totalVolume = completedSets.reduce((sum, s) => sum + s.actualReps * s.actualWeightKg, 0);

    const completedSession: WorkoutSession = {
      ...activeSession,
      endedAt,
      durationSeconds,
      totalVolumeKg: totalVolume,
      status: 'completed',
      notes,
    };

    // Update sessions and sets state
    setSessions((prev) => [completedSession, ...prev]);
    setSets((prev) => [...completedSets, ...prev]);

    // If session was tied to a schedule, mark it as completed
    if (activeSession.scheduleId) {
      updateScheduleStatus(activeSession.scheduleId, 'completed');
    } else {
      // Find today's schedule with this template if exists
      const today = new Date().toISOString().split('T')[0];
      const match = schedules.find((s) => s.date === today && s.workoutTemplateId === activeSession.workoutTemplateId);
      if (match) {
        updateScheduleStatus(match.id, 'completed');
      }
    }

    // Persist session to Firestore if user logged in
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'workoutSessions', completedSession.id), completedSession);
        const batch = writeBatch(db);
        completedSets.forEach((s) => {
          batch.set(doc(db, 'exerciseSets', s.id), s);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao salvar sessão finalizada no Firestore:', err);
      }
    }

    setActiveSession(null);
  };

  const cancelActiveSession = () => {
    setActiveSession(null);
  };

  /**
   * NUTRITION ACTIONS
   */
  const addNutritionEntry = async (entry: Omit<NutritionEntry, 'id' | 'userId'>): Promise<void> => {
    const id = `nutr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: NutritionEntry = {
      ...entry,
      id,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };
    setNutritionEntries((prev) => [newEntry, ...prev]);

    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'nutritionEntries', id), newEntry);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `nutritionEntries/${id}`);
      }
    }
  };

  const deleteNutritionEntry = async (id: string): Promise<void> => {
    setNutritionEntries((prev) => prev.filter((n) => n.id !== id));
    if (user && !isGuest) {
      try {
        await deleteDoc(doc(db, 'nutritionEntries', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `nutritionEntries/${id}`);
      }
    }
  };

  const copyMealFromYesterday = async (targetDate: string, mealType: NutritionEntry['mealType']): Promise<number> => {
    const target = new Date(targetDate + 'T00:00:00');
    target.setDate(target.getDate() - 1);
    const yesterdayStr = target.toISOString().split('T')[0];

    const yesterdayEntries = nutritionEntries.filter((n) => n.date === yesterdayStr && n.mealType === mealType);
    if (!yesterdayEntries.length) return 0;

    const cloned = yesterdayEntries.map((n) => ({
      ...n,
      id: `nutr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: targetDate,
      createdAt: new Date().toISOString(),
    }));

    setNutritionEntries((prev) => [...cloned, ...prev]);

    if (user && !isGuest) {
      try {
        const batch = writeBatch(db);
        cloned.forEach((item) => {
          batch.set(doc(db, 'nutritionEntries', item.id), item);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao copiar refeição no Firestore:', err);
      }
    }
    return cloned.length;
  };

  const duplicateDayMeals = async (sourceDate: string, targetDate: string): Promise<number> => {
    const sourceEntries = nutritionEntries.filter((n) => n.date === sourceDate);
    if (!sourceEntries.length) return 0;

    const cloned = sourceEntries.map((n) => ({
      ...n,
      id: `nutr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: targetDate,
      createdAt: new Date().toISOString(),
    }));

    setNutritionEntries((prev) => [...cloned, ...prev]);

    if (user && !isGuest) {
      try {
        const batch = writeBatch(db);
        cloned.forEach((item) => {
          batch.set(doc(db, 'nutritionEntries', item.id), item);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao duplicar dia no Firestore:', err);
      }
    }
    return cloned.length;
  };

  const addFoodItem = async (food: Omit<FoodItem, 'id' | 'userId'>): Promise<void> => {
    const id = `food_${Date.now()}`;
    const newFood: FoodItem = {
      ...food,
      id,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };
    setFoods((prev) => [newFood, ...prev]);
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'foodItems', id), newFood);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `foodItems/${id}`);
      }
    }
  };

  const toggleFavoriteFood = async (id: string): Promise<void> => {
    setFoods((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isFavorite: !f.isFavorite } : f))
    );
    const target = foods.find((f) => f.id === id);
    if (target && user && !isGuest) {
      try {
        await setDoc(doc(db, 'foodItems', id), { isFavorite: !target.isFavorite }, { merge: true });
      } catch (err) {
        console.warn('Erro ao favoritar alimento:', err);
      }
    }
  };

  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'userId'>): Promise<void> => {
    const id = `rec_${Date.now()}`;
    const newRecipe: Recipe = {
      ...recipe,
      id,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRecipes((prev) => [newRecipe, ...prev]);
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'recipes', id), newRecipe);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `recipes/${id}`);
      }
    }
  };

  /**
   * WATER & SETTINGS
   */
  const updateWaterConsumed = async (amountDelta: number): Promise<void> => {
    const newAmount = Math.max(0, (settings.waterConsumedMl || 0) + amountDelta);
    setSettings((prev) => ({ ...prev, waterConsumedMl: newAmount }));

    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), { waterConsumedMl: newAmount }, { merge: true });
      } catch (err) {
        console.warn('Erro ao atualizar água no Firestore:', err);
      }
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>): Promise<void> => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), newSettings, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `userSettings/${user.uid}`);
      }
    }
  };

  /**
   * MEASUREMENTS
   */
  const addMeasurement = async (weightKg: number, date?: string, notes?: string): Promise<void> => {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const id = `meas_${Date.now()}`;
    const newMeas: BodyMeasurement = {
      id,
      userId: currentUserId,
      date: dateStr,
      weightKg,
      notes,
      createdAt: new Date().toISOString(),
    };

    setMeasurements((prev) => [...prev, newMeas].sort((a, b) => a.date.localeCompare(b.date)));

    if (user && !isGuest) {
      try {
        await setDoc(doc(db, 'bodyMeasurements', id), newMeas);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `bodyMeasurements/${id}`);
      }
    }
  };

  const deleteMeasurement = async (id: string): Promise<void> => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    if (user && !isGuest) {
      try {
        await deleteDoc(doc(db, 'bodyMeasurements', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `bodyMeasurements/${id}`);
      }
    }
  };

  const value = useMemo(
    () => ({
      templates,
      schedules,
      sessions,
      sets,
      nutritionEntries,
      foods,
      recipes,
      measurements,
      settings,
      loading,
      activeSession,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      generateBatchSchedule,
      updateScheduleStatus,
      deleteSchedule,
      startLiveSession,
      updateActiveSessionSet,
      finishActiveSession,
      cancelActiveSession,
      getLastExercisePerformance,
      addNutritionEntry,
      deleteNutritionEntry,
      copyMealFromYesterday,
      duplicateDayMeals,
      addFoodItem,
      toggleFavoriteFood,
      addRecipe,
      updateWaterConsumed,
      updateSettings,
      addMeasurement,
      deleteMeasurement,
    }),
    [
      templates,
      schedules,
      sessions,
      sets,
      nutritionEntries,
      foods,
      recipes,
      measurements,
      settings,
      loading,
      activeSession,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
};
