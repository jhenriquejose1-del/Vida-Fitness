import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { WorkoutsView } from './views/WorkoutsView';
import { NutritionView } from './views/NutritionView';
import { ProfileView } from './views/ProfileView';

// Modals
import { LiveWorkoutModal } from './components/LiveWorkoutModal';
import { BatchScheduleModal } from './components/BatchScheduleModal';
import { AINutritionModal } from './components/AINutritionModal';
import { AIFoodSearchModal } from './components/AIFoodSearchModal';
import { AIWorkoutAssistantModal } from './components/AIWorkoutAssistantModal';
import { ExportReportModal } from './components/ExportReportModal';
import { MealType } from './types';

function MainLayout() {
  const { startLiveSession, activeSession } = useData();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Modals state
  const [showLiveWorkout, setShowLiveWorkout] = useState(false);
  const [showBatchScheduler, setShowBatchScheduler] = useState(false);
  const [showNutritionAI, setShowNutritionAI] = useState(false);
  const [nutritionAIMealType, setNutritionAIMealType] = useState<MealType>('lunch');
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [foodSearchMealType, setFoodSearchMealType] = useState<MealType>('lunch');
  const [showAICoach, setShowAICoach] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleStartWorkout = (templateId?: string, scheduleId?: string) => {
    startLiveSession(templateId, scheduleId);
    setShowLiveWorkout(true);
  };

  const handleOpenNutritionAI = (mealType: MealType = 'lunch') => {
    setNutritionAIMealType(mealType);
    setShowNutritionAI(true);
  };

  const handleOpenFoodSearch = (mealType: MealType = 'lunch') => {
    setFoodSearchMealType(mealType);
    setShowFoodSearch(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        onOpenAIWorkout={() => setShowAICoach(true)}
        onOpenExport={() => setShowExport(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation (Sidebar on Desktop, Bottom bar on Mobile) */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenLiveWorkout={() => setShowLiveWorkout(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardView
              onStartWorkout={handleStartWorkout}
              onOpenNutritionAI={() => handleOpenNutritionAI('lunch')}
              onOpenBatchScheduler={() => setShowBatchScheduler(true)}
              onOpenAICoach={() => setShowAICoach(true)}
              onGoToWorkouts={() => setCurrentTab('workouts')}
              onGoToNutrition={() => setCurrentTab('nutrition')}
            />
          )}

          {currentTab === 'workouts' && (
            <WorkoutsView
              onStartWorkout={handleStartWorkout}
              onOpenBatchScheduler={() => setShowBatchScheduler(true)}
              onOpenAICoach={() => setShowAICoach(true)}
            />
          )}

          {currentTab === 'nutrition' && (
            <NutritionView
              onOpenAIAnalyze={handleOpenNutritionAI}
              onOpenAISearch={handleOpenFoodSearch}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView onOpenExport={() => setShowExport(true)} />
          )}
        </main>
      </div>

      {/* Live Workout Screen Modal */}
      {(showLiveWorkout || activeSession) && (
        <LiveWorkoutModal onClose={() => setShowLiveWorkout(false)} />
      )}

      {/* Batch Schedule Modal */}
      {showBatchScheduler && (
        <BatchScheduleModal
          onClose={() => setShowBatchScheduler(false)}
          onSuccess={() => setCurrentTab('workouts')}
        />
      )}

      {/* AI Nutrition Modal */}
      {showNutritionAI && (
        <AINutritionModal
          initialMealType={nutritionAIMealType}
          onClose={() => setShowNutritionAI(false)}
        />
      )}

      {/* AI Food Search Modal */}
      {showFoodSearch && (
        <AIFoodSearchModal
          initialMealType={foodSearchMealType}
          onClose={() => setShowFoodSearch(false)}
        />
      )}

      {/* AI Workout Assistant Modal */}
      {showAICoach && (
        <AIWorkoutAssistantModal onClose={() => setShowAICoach(false)} />
      )}

      {/* Export & PDF Modal */}
      {showExport && (
        <ExportReportModal onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <MainLayout />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
