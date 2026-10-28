import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { askWorkoutAssistant, generateWorkoutSplitWithAI, GeneratedSplit } from '../services/aiService';
import {
  Sparkles,
  Bot,
  Send,
  Dumbbell,
  RefreshCw,
  X,
  Plus,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AIWorkoutAssistantModalProps {
  onClose: () => void;
}

export const AIWorkoutAssistantModal: React.FC<AIWorkoutAssistantModalProps> = ({ onClose }) => {
  const { templates, sessions, addTemplate } = useData();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'chat' | 'splitGenerator'>('chat');
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      text: `Olá! Sou o FitEvolution Coach. Posso te ajudar a analisar sua progressão de cargas, sugerir substituições biomecânicas de exercícios, corrigir execuções ou periodizar seu treino. Como posso ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Split Generator State
  const [genGoal, setGenGoal] = useState(profile?.goal || 'hypertrophy');
  const [genDays, setGenDays] = useState(profile?.workoutDaysAvailable || 5);
  const [genLevel, setGenLevel] = useState(profile?.experienceLevel || 'intermediate');
  const [genRestrictions, setGenRestrictions] = useState(profile?.physicalRestrictions || 'Nenhuma');
  const [generatingSplit, setGeneratingSplit] = useState(false);
  const [generatedSplit, setGeneratedSplit] = useState<GeneratedSplit | null>(null);
  const [importedSplits, setImportedSplits] = useState<string[]>([]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const userMsg = {
      role: 'user' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const userContext = {
        name: profile?.name,
        goal: profile?.goal,
        level: profile?.experienceLevel,
        currentWeight: profile?.currentWeight,
        totalCompletedSessions: sessions.filter((s) => s.status === 'completed').length,
        currentTemplates: templates.map((t) => t.name),
      };

      const reply = await askWorkoutAssistant(text, userContext);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Desculpe, ocorreu um erro ao consultar o FitEvolution Coach. Verifique sua conexão e tente novamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSplit = async () => {
    setGeneratingSplit(true);
    setGeneratedSplit(null);
    try {
      const res = await generateWorkoutSplitWithAI({
        goal: genGoal,
        daysPerWeek: genDays,
        level: genLevel,
        restrictions: genRestrictions,
      });
      setGeneratedSplit(res);
    } catch (err) {
      console.error('Erro ao gerar divisão:', err);
    } finally {
      setGeneratingSplit(false);
    }
  };

  const handleImportWorkout = async (w: GeneratedSplit['workouts'][0]) => {
    const newTemplate = {
      name: w.name,
      muscleGroup: w.muscleGroup,
      description: w.description,
      exercises: w.exercises.map((ex, i) => ({
        id: `ex_${Date.now()}_${i}`,
        userId: 'current',
        name: ex.name,
        muscleGroup: (ex.muscleGroup as unknown) || 'Geral',
        equipment: ex.equipment,
        targetSets: ex.targetSets || 4,
        targetReps: ex.targetReps || 10,
        targetWeightKg: ex.targetWeightKg || 20,
        restTimeSeconds: ex.restTimeSeconds || 60,
        notes: ex.notes,
        isCustom: true,
      })),
    };

    await addTemplate(newTemplate as unknown as Parameters<typeof addTemplate>[0]);
    setImportedSplits((prev) => [...prev, w.name]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 text-white shadow-2xl flex flex-col h-[85vh] my-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-black">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                FitEvolution Coach AI
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Gemini
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Biomecânica, substituição de exercícios e periodização</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-3 mb-2 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Chat & Dúvidas
          </button>
          <button
            onClick={() => setActiveTab('splitGenerator')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'splitGenerator'
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Criador de Treino com IA
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            {/* Quick action chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 shrink-0">
              {[
                'Substituição para Supino Reto (dor no ombro)',
                'Como romper platô no Agachamento?',
                'Exercícios para antebraço e pegada',
                'Diferença entre RPE e falha concêntrica',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] whitespace-nowrap transition border border-zinc-700/60"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 my-2">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-emerald-500 text-black font-medium shadow-md'
                        : 'bg-zinc-800/90 text-zinc-200 border border-zinc-700/60'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 p-3 bg-zinc-800/60 rounded-2xl text-xs text-zinc-400 w-fit animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>FitEvolution Coach está digitando...</span>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="pt-2 border-t border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Pergunte sobre exercícios, técnica, cargas..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  disabled={loading || !inputText.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-black disabled:opacity-50 transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Split Generator View */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Objetivo:</label>
                <select
                  value={genGoal}
                  onChange={(e) => setGenGoal(e.target.value as unknown as typeof genGoal)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                >
                  <option value="hypertrophy">Hipertrofia Muscular</option>
                  <option value="weight_loss">Emagrecimento / Definição</option>
                  <option value="maintenance">Manutenção / Força</option>
                  <option value="conditioning">Condicionamento Geral</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Dias por semana:</label>
                <input
                  type="number"
                  min="3"
                  max="7"
                  value={genDays}
                  onChange={(e) => setGenDays(parseInt(e.target.value, 10) || 5)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Nível de experiência:</label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value as unknown as typeof genLevel)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                >
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Restrições físicas:</label>
                <input
                  type="text"
                  placeholder="Ex: sem sobrecarga na lombar, condromalácia..."
                  value={genRestrictions}
                  onChange={(e) => setGenRestrictions(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <button
              disabled={generatingSplit}
              onClick={handleGenerateSplit}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              {generatingSplit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{generatingSplit ? 'Montando rotina sob medida...' : 'Gerar Treinos com IA'}</span>
            </button>

            {generatedSplit && (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <h4 className="text-sm font-bold text-emerald-400">{generatedSplit.splitName}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{generatedSplit.description}</p>
                </div>

                <div className="space-y-3">
                  {generatedSplit.workouts.map((w, idx) => {
                    const isImported = importedSplits.includes(w.name);
                    return (
                      <div key={idx} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-white block">{w.name}</span>
                            <span className="text-[10px] text-zinc-400">{w.muscleGroup}</span>
                          </div>

                          <button
                            disabled={isImported}
                            onClick={() => handleImportWorkout(w)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isImported
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                : 'bg-emerald-500 text-black hover:bg-emerald-400'
                            }`}
                          >
                            {isImported ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Importado</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Salvar Treino</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-1 text-xs">
                          {w.exercises.map((ex, exI) => (
                            <div
                              key={exI}
                              className="flex items-center justify-between p-1.5 bg-zinc-900 rounded-lg text-zinc-300"
                            >
                              <span>{ex.name}</span>
                              <span className="text-[11px] text-zinc-500">
                                {ex.targetSets}x{ex.targetReps} • {ex.targetWeightKg}kg • {ex.restTimeSeconds}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
