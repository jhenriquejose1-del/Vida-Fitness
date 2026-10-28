import React from 'react';
import { useData } from '../context/DataContext';
import { LayoutDashboard, Dumbbell, Utensils, User, Play, Clock } from 'lucide-react';

export type NavTab = 'dashboard' | 'workouts' | 'nutrition' | 'profile';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenLiveWorkout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenLiveWorkout,
}) => {
  const { activeSession } = useData();

  const navItems: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'workouts', label: 'Treinos', icon: Dumbbell },
    { id: 'nutrition', label: 'Alimentação', icon: Utensils },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <>
      {/* Floating Active Session Banner (if workout is in progress) */}
      {activeSession && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-30 animate-bounce">
          <div
            onClick={onOpenLiveWorkout}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black shadow-2xl cursor-pointer hover:brightness-105 transition active:scale-98"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 fill-black" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-80">
                  Em Andamento
                </span>
                <span className="text-xs font-black truncate block">
                  {activeSession.workoutName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-extrabold bg-black text-emerald-400 px-3 py-1 rounded-xl">
                Retomar
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-1.5 safe-area-bottom">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive ? 'bg-emerald-500/15' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-950 border-r border-zinc-850 p-4 shrink-0">
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-lime-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Quick Start Card */}
        <div className="mt-auto p-4 rounded-3xl bg-zinc-900 border border-zinc-800 text-center">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Play className="w-5 h-5 fill-emerald-400 ml-0.5" />
          </div>
          <h4 className="text-xs font-bold text-white">Treino Rápido</h4>
          <p className="text-[11px] text-zinc-400 mt-0.5 mb-3">
            Inicie agora uma sessão guiada com temporizador inteligente.
          </p>
          <button
            onClick={onOpenLiveWorkout}
            className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-extrabold border border-zinc-700/80 transition"
          >
            Iniciar Agora
          </button>
        </div>
      </aside>
    </>
  );
};
