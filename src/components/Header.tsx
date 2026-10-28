import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  Dumbbell,
  Moon,
  Sun,
  Download,
  WifiOff,
  User as UserIcon,
  LogIn,
  LogOut,
  Sparkles,
  FileText,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  onOpenAIWorkout: () => void;
  onOpenExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAIWorkout, onOpenExport }) => {
  const { user, profile, isGuest, signInWithGoogle, enterGuestMode, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 via-lime-500 to-emerald-400 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center">
                Fit<span className="text-emerald-400">Evolution</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-extrabold text-[9px] uppercase border border-emerald-500/20">
                AI
              </span>
            </div>
          </div>
        </div>

        {/* Offline Badge */}
        {!isOnline && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo Offline</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              onClick={() => setShowIOSPrompt(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}

          {/* Quick AI Assistant Button */}
          <button
            onClick={onOpenAIWorkout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold text-zinc-200 transition"
            title="Assistente de Treino com IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Coach IA</span>
          </button>

          {/* Reports */}
          <button
            onClick={onOpenExport}
            className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white transition"
            title="Exportar dados e relatórios"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white transition"
            title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* User Profile / Auth */}
          <div className="relative">
            {user || isGuest ? (
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 transition"
              >
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.name}
                    className="w-6 h-6 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                    {profile?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <span className="text-xs font-semibold text-zinc-200 hidden sm:inline max-w-[90px] truncate">
                  {profile?.name || 'Atleta'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}

            {/* Dropdown menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl p-2 text-xs text-zinc-300 z-50">
                <div className="p-2 border-b border-zinc-800 mb-1">
                  <span className="font-bold text-white block truncate">{profile?.name || 'Atleta'}</span>
                  <span className="text-[11px] text-zinc-400 block truncate">{profile?.email || 'Conectado'}</span>
                  {isGuest && (
                    <span className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] inline-block font-semibold">
                      Modo Visitante (Offline)
                    </span>
                  )}
                </div>

                {isGuest && (
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      signInWithGoogle();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-emerald-400 hover:bg-zinc-800 font-semibold"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Conectar Google</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-400 hover:bg-zinc-800 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 text-white shadow-xl">
            <h3 className="text-base font-bold text-white mb-2">Instalar no iPhone / iPad</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              1. Toque no botão de <strong>Compartilhar</strong> (ícone com seta para cima) na barra do Safari.<br />
              2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. O FitEvolution AI abrirá em tela cheia como um app nativo!
            </p>
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
