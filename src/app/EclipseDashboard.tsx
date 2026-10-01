'use client';
import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { 
  Dumbbell, 
  Utensils, 
  Sparkles, 
  Plus, 
  Check, 
  X, 
  Flame, 
  TrendingUp, 
  Loader2, 
  Timer, 
  FastForward, 
  Ghost,
  LogOut,
  Home
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { 
  addNutritionEntry, 
  toggleNutritionItem, 
  logWorkoutSet, 
  mockOrRunAICheckIn,
  getPreviousExerciseData 
} from '@/app/actions';

interface UserInfo {
  name: string;
  email: string;
  image: string;
}

interface NutritionItem {
  id: string;
  itemName: string;
  category: string;
  calories: number;
  proteinG: number;
  isCompleted: boolean;
}

interface AIResult {
  calsAdjustedBy: number;
  explanation: string;
  newDailyCals: number;
  newDailyProtein: number;
}

interface ProgressRingProps {
  progress: number;
  label: string;
  value: string;
  colorClass: string;
}

const ProgressRing = ({ progress, label, value, colorClass }: ProgressRingProps) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clampedProgress / 100) * circumference;
  
  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle cx="56" cy="56" r={radius} className="stroke-slate-800" strokeWidth="10" fill="none" />
        <circle 
          cx="56" cy="56" r={radius} 
          className={`transition-all duration-1000 ease-out ${colorClass}`} 
          strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="none" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-bold text-lg text-white">{value}</span>
        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{label}</span>
      </div>
    </div>
  );
};

export default function EclipseDashboard({ user }: { user: UserInfo }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'nutrition' | 'ai'>('dashboard');

  // Check URL query parameters for active tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'nutrition' || tabParam === 'ai' || tabParam === 'dashboard' || tabParam === 'workout') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);
  const [tonnage, setTonnage] = useState(0);
  const [actualReps, setActualReps] = useState<number | ''>(10);
  const [setLogged, setSetLogged] = useState(false);

  // Ghosting Benchmark Data
  const [ghostData, setGhostData] = useState<{ actualWeight: number; actualReps: number }>({
    actualWeight: 32,
    actualReps: 10,
  });

  // Auto-Rest Timer State (seconds)
  const [restTimer, setRestTimer] = useState<number>(0);

  // Targets
  const [targetCals, setTargetCals] = useState(2950);
  const [targetProtein, setTargetProtein] = useState(160);

  // Nutrition state
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [nutritionList, setNutritionList] = useState<NutritionItem[]>([
    {
      id: 'init-1',
      itemName: 'Oatmeal & Whey Protein',
      category: 'MEAL',
      calories: 450,
      proteinG: 35,
      isCompleted: true,
    },
    {
      id: 'init-2',
      itemName: 'Greek Yogurt & Blueberries',
      category: 'SNACK',
      calories: 220,
      proteinG: 22,
      isCompleted: true,
    },
    {
      id: 'init-3',
      itemName: 'Electrolyte Hydration (750ml)',
      category: 'WATER',
      calories: 15,
      proteinG: 0,
      isCompleted: false,
    },
  ]);

  // Form state for Add Food Modal
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'MEAL' | 'SNACK' | 'WATER'>('MEAL');
  const [newItemCalories, setNewItemCalories] = useState<number | ''>(550);
  const [newItemProtein, setNewItemProtein] = useState<number | ''>(40);

  // AI state
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [isAiLoading, startAiTransition] = useTransition();

  // Load ghost benchmark on mount
  useEffect(() => {
    async function loadGhostBenchmark() {
      try {
        const prev = await getPreviousExerciseData('Incline Dumbbell Press');
        if (prev && prev.actualWeight && prev.actualReps) {
          setGhostData({
            actualWeight: prev.actualWeight,
            actualReps: prev.actualReps,
          });
        }
      } catch (err) {
        console.warn("Ghost data load fallback:", err);
      }
    }
    loadGhostBenchmark();
  }, []);

  // Rest Timer Interval Countdown
  useEffect(() => {
    if (restTimer <= 0) return;

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer]);

  // Format Timer mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic calculations for nutrition
  const completedItems = nutritionList.filter(item => item.isCompleted);
  const totalCalories = completedItems.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProtein = completedItems.reduce((acc, curr) => acc + curr.proteinG, 0);

  const calorieProgress = Math.round((totalCalories / targetCals) * 100);
  const proteinProgress = Math.round((totalProtein / targetProtein) * 100);

  // Handle Set completion
  const handleCompleteSet = async (weight: number, reps: number) => {
    const calculatedTonnage = weight * reps;
    setTonnage(prev => prev + calculatedTonnage);
    setSetLogged(true);

    // Trigger 90s auto-rest timer
    setRestTimer(90);

    try {
      await logWorkoutSet('Incline Dumbbell Press', weight, reps);
    } catch (err) {
      console.warn("Optimistic set log applied locally:", err);
    }
  };

  const finishWorkout = () => {
    confetti({ 
      particleCount: 150, 
      spread: 70, 
      origin: { y: 0.6 }, 
      colors: ['#06b6d4', '#10b981', '#8b5cf6'] 
    });
  };

  // Nutrition toggle
  const handleToggleItem = async (id: string) => {
    const itemToToggle = nutritionList.find(i => i.id === id);
    if (!itemToToggle) return;

    const nextCompleted = !itemToToggle.isCompleted;
    setNutritionList(prev =>
      prev.map(i => (i.id === id ? { ...i, isCompleted: nextCompleted } : i))
    );

    try {
      await toggleNutritionItem(id, nextCompleted);
    } catch (err) {
      console.warn("Optimistic toggle applied locally:", err);
    }
  };

  // Add new food
  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const cals = typeof newItemCalories === 'number' ? newItemCalories : 0;
    const protein = typeof newItemProtein === 'number' ? newItemProtein : 0;

    const optimisticItem: NutritionItem = {
      id: `food-${Date.now()}`,
      itemName: newItemName.trim(),
      category: newItemCategory,
      calories: cals,
      proteinG: protein,
      isCompleted: true,
    };

    setNutritionList(prev => [optimisticItem, ...prev]);
    setShowAddFoodModal(false);
    setNewItemName('');
    setNewItemCalories(500);
    setNewItemProtein(35);

    try {
      await addNutritionEntry({
        itemName: optimisticItem.itemName,
        category: optimisticItem.category,
        calories: optimisticItem.calories,
        proteinG: optimisticItem.proteinG,
      });
    } catch (err) {
      console.warn("Optimistic food add applied locally:", err);
    }
  };

  // Trigger AI Check-in
  const triggerAICheckIn = () => {
    startAiTransition(async () => {
      try {
        const result = await mockOrRunAICheckIn();
        if (result) {
          setAiResult(result);
          setAiApplied(false);
          // Detect if this was a mock/fallback response
          if (result.explanation?.startsWith('[MOCK]') || result.explanation?.startsWith('[FALLBACK]')) {
            toast.warning('AI check-in unavailable', {
              description: 'Gemini API key not configured. Using rule-based fallback targets.',
            });
          }
        }
      } catch (err) {
        console.error("AI Check-In failed:", err);
        toast.error('AI check-in failed', {
          description: 'Could not reach the AI engine. Check your connection and try again.',
        });
      }
    });
  };

  const handleApplyAITargets = () => {
    if (!aiResult) return;
    setTargetCals(aiResult.newDailyCals);
    setTargetProtein(aiResult.newDailyProtein);
    setAiApplied(true);
    confetti({ 
      particleCount: 100, 
      spread: 60, 
      origin: { y: 0.6 }, 
      colors: ['#a855f7', '#06b6d4', '#10b981'] 
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-32 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="p-6 pt-10 border-b border-white/5 bg-[#020617]/85 backdrop-blur-xl sticky top-0 z-40 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            ECLIPSE
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Data-Driven Progression</p>
        </div>
        {/* Profile Avatar + Signout */}
        <div className="relative">
          <button
            id="user-avatar-btn"
            onClick={() => setShowUserMenu((v) => !v)}
            className="w-9 h-9 rounded-full border-2 border-cyan-500/40 overflow-hidden flex items-center justify-center bg-slate-800 hover:border-cyan-400 transition-all"
            aria-label="User menu"
          >
            {user.image ? (
              <Image src={user.image} alt={user.name} width={36} height={36} className="rounded-full" />
            ) : (
              <span className="text-cyan-400 font-bold text-sm">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-56 bg-slate-900/95 border border-white/8 rounded-2xl p-1.5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button
                id="signout-btn"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut size={15} className="text-slate-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Auto-Rest Timer Floating Sticky Banner */}
      {restTimer > 0 && (
        <div className="sticky top-[89px] z-30 px-4 py-2 bg-slate-950/90 backdrop-blur-lg border-b border-cyan-500/30 shadow-[0_4px_20px_rgba(6,182,212,0.15)] animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse">
                <Timer size={18} />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Rest Timer</span>
                <span className="text-lg font-black text-white font-mono tracking-tight">{formatTimer(restTimer)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestTimer((prev) => prev + 30)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                +30s
              </button>
              <button
                onClick={() => setRestTimer(0)}
                className="px-3 py-1 text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center gap-1"
              >
                <FastForward size={14} />
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Dashboard Overview Tab */}
        {(activeTab === 'dashboard' || activeTab === 'workout') && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Quick Macro & Energy Progress Rings */}
            <div className="flex gap-4 justify-around p-6 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl">
              <ProgressRing 
                progress={calorieProgress} 
                label="Calories" 
                value={`${totalCalories.toLocaleString()}`} 
                colorClass="stroke-cyan-400" 
              />
              <ProgressRing 
                progress={proteinProgress} 
                label="Protein" 
                value={`${totalProtein}g`} 
                colorClass="stroke-amber-400" 
              />
            </div>

            {/* Direct Workout Hub Launcher Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-cyan-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Today's Training Split
                  </span>
                  <h2 className="text-2xl font-black text-white tracking-tight">Push Day A</h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">Chest · Heavy Shoulders · Triceps</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Dumbbell size={24} />
                </div>
              </div>

              {/* Split Quick Jump Chips */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
                <Link
                  href="/workout/push"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shrink-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Push Hub
                </Link>
                <Link
                  href="/workout/pull"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/60 text-slate-300 border border-white/5 hover:border-slate-700 shrink-0"
                >
                  Pull Hub
                </Link>
                <Link
                  href="/workout/legs"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950/60 text-slate-300 border border-white/5 hover:border-slate-700 shrink-0"
                >
                  Legs Hub
                </Link>
              </div>

              {/* Direct Full Hub Action CTA */}
              <Link
                href="/workout/push"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:opacity-95 active:scale-[0.99] transition-all"
              >
                <span>Launch Full Workout Hub</span>
                <span className="text-base">→</span>
              </Link>
            </div>

            {/* Split Banner */}
            <div className="flex justify-between items-center bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-xl">
              <div>
                <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Today's Split
                </p>
                <h2 className="text-xl font-bold text-white">Push Day A</h2>
                <p className="text-xs text-slate-400 mt-0.5">Chest · Delts · Triceps</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Session Tonnage</p>
                <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">{tonnage.toLocaleString()} <span className="text-xs text-emerald-500 font-bold">KG</span></p>
              </div>
            </div>

            {/* Exercise Card with Ghost Benchmark */}
            <div className="bg-slate-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Incline Dumbbell Press</h3>
                  <p className="text-xs text-slate-400 font-medium">Compound · Chest Hypertrophy</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  DOUBLE PROGRESSION
                </span>
              </div>

              {/* Ghost Benchmark Data Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/40 rounded-xl border border-white/5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Ghost size={14} className="text-cyan-400/70" />
                  <span>Last session:</span>
                </div>
                <span className="font-bold text-slate-300 font-mono">
                  {ghostData.actualWeight}kg × {ghostData.actualReps} reps
                </span>
              </div>

              {/* Set Row */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${setLogged ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    1
                  </div>
                  <div className="flex-1 bg-slate-950/60 rounded-xl flex items-center justify-between px-4 py-2.5 border border-slate-800">
                    <span className="text-slate-400 text-xs font-semibold uppercase">Target</span>
                    <span className="text-white font-bold text-sm">32 kg × 10</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" 
                      placeholder="Reps" 
                      value={actualReps}
                      onChange={(e) => setActualReps(e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-16 bg-slate-950 rounded-xl px-2 py-2.5 text-center font-bold text-sm border outline-none transition-all ${
                        typeof actualReps === 'number' && actualReps > 10 
                          ? 'border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                          : 'border-slate-800 text-white focus:border-cyan-500'
                      }`}
                    />
                    <button 
                      onClick={() => handleCompleteSet(32, typeof actualReps === 'number' ? actualReps : 10)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                        setLogged 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95'
                      }`}
                      title="Log Set & Start Rest Timer"
                    >
                      <Check size={18} className={setLogged ? 'stroke-[3]' : ''} />
                    </button>
                  </div>
                </div>

                {/* Double Progression Feedback */}
                {typeof actualReps === 'number' && actualReps > 10 && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                    <TrendingUp size={14} />
                    <span>Target exceeded (+{actualReps - 10} reps)! Increment weight next workout.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Finish Workout CTA */}
            <button 
              onClick={finishWorkout} 
              className="w-full py-4 mt-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-base tracking-wide shadow-[0_0_24px_rgba(6,182,212,0.35)] hover:opacity-95 active:scale-[0.99] transition-all"
            >
              Finish Session & Log
            </button>
          </div>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Dynamic Progress Rings */}
            <div className="flex gap-4 justify-around p-6 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl">
              <ProgressRing 
                progress={calorieProgress} 
                label="Calories" 
                value={`${totalCalories.toLocaleString()}`} 
                colorClass="stroke-cyan-400" 
              />
              <ProgressRing 
                progress={proteinProgress} 
                label="Protein" 
                value={`${totalProtein}g`} 
                colorClass="stroke-amber-400" 
              />
            </div>

            {/* Daily Food Log */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-4 px-5 border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white text-base">Daily Log</h3>
                  <p className="text-xs text-slate-400">{completedItems.length} of {nutritionList.length} items logged</p>
                </div>
                <button 
                  onClick={() => setShowAddFoodModal(true)}
                  className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition-all active:scale-90"
                  title="Add Item"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3 divide-y divide-white/5">
                {nutritionList.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleToggleItem(item.id)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          item.isCompleted 
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' 
                            : 'border-slate-700 bg-slate-950/40 text-transparent hover:border-slate-500'
                        }`}
                      >
                        <Check size={14} className={item.isCompleted ? 'stroke-[3]' : 'opacity-0'} />
                      </button>
                      <div>
                        <span className={`text-sm font-medium transition-all ${item.isCompleted ? 'text-white' : 'text-slate-500 line-through'}`}>
                          {item.itemName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            item.category === 'MEAL' ? 'bg-amber-500/10 text-amber-400' :
                            item.category === 'SNACK' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-cyan-500/10 text-cyan-400'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-white font-bold mr-2">{item.calories} kcal</span>
                      <span className="text-slate-400 font-semibold">{item.proteinG}g</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Engine Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <Sparkles className="text-purple-400 animate-pulse" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Weekly AI Check-In</h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Eclipse AI evaluates your 7-day weight moving average and macro compliance to recommend metabolic adjustments.
                </p>
              </div>

              {/* Status metrics */}
              <div className="grid grid-cols-2 gap-3 text-left bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">7-Day Delta</span>
                  <p className="text-white font-bold text-sm">+0.05 kg <span className="text-[10px] text-amber-400 font-semibold">(Stalled)</span></p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Active Target</span>
                  <p className="text-white font-bold text-sm">{targetCals} kcal / {targetProtein}g</p>
                </div>
              </div>

              {/* AI Trigger button */}
              {!aiResult && (
                <button 
                  onClick={triggerAICheckIn} 
                  disabled={isAiLoading}
                  className="w-full py-3.5 rounded-xl bg-purple-500/10 text-purple-300 font-bold border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analyzing Metabolic Data...
                    </>
                  ) : (
                    'Run AI Analysis'
                  )}
                </button>
              )}

              {/* AI Evaluation Card */}
              {aiResult && (
                <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 text-left space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      METABOLIC ADAPTATION
                    </span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      {aiResult.calsAdjustedBy > 0 ? `+${aiResult.calsAdjustedBy}` : aiResult.calsAdjustedBy} kcal
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {aiResult.explanation}
                  </p>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-purple-500/20">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">New Daily Target</p>
                      <p className="text-base font-extrabold text-white">{aiResult.newDailyCals} kcal</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Daily Protein</p>
                      <p className="text-base font-extrabold text-amber-400">{aiResult.newDailyProtein}g</p>
                    </div>
                  </div>

                  {!aiApplied ? (
                    <button 
                      onClick={handleApplyAITargets}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-[0_0_18px_rgba(168,85,247,0.35)] hover:opacity-95 active:scale-98 transition-all"
                    >
                      Accept & Apply Targets
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <Check size={16} />
                      Targets Updated Successfully!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Food Modal (Bottom Sheet) */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center p-0 animate-in fade-in duration-200">
          <div className="bg-[#0e1626] border-t border-white/10 w-full max-w-lg rounded-t-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Add Nutrition Entry</h3>
              <button 
                onClick={() => setShowAddFoodModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFood} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Item Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Chicken Breast & Brown Rice"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MEAL', 'SNACK', 'WATER'] as const).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNewItemCategory(cat)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        newItemCategory === cat 
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Calories (kcal)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="500"
                    value={newItemCalories}
                    onChange={(e) => setNewItemCalories(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Protein (g)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="35"
                    value={newItemProtein}
                    onChange={(e) => setNewItemProtein(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 outline-none font-bold"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-98 transition-all"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#020617]/95 backdrop-blur-xl border-t border-white/5 px-6 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-40">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' || activeTab === 'workout' ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Home size={22} className={activeTab === 'dashboard' || activeTab === 'workout' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] font-bold tracking-wider">DASHBOARD</span>
        </button>
        <Link 
          href="/workout/push" 
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-cyan-400 transition-all group"
        >
          <Dumbbell size={22} className="stroke-2 group-hover:scale-105 transition-all" />
          <span className="text-[10px] font-bold tracking-wider">FULL HUB</span>
        </Link>
        <button 
          onClick={() => setActiveTab('nutrition')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'nutrition' ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Utensils size={22} className={activeTab === 'nutrition' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] font-bold tracking-wider">MACROS</span>
        </button>
        <button 
          onClick={() => setActiveTab('ai')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ai' ? 'text-purple-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Sparkles size={22} className={activeTab === 'ai' ? 'stroke-[2.5]' : 'stroke-2'} />
          <span className="text-[10px] font-bold tracking-wider">ENGINE</span>
        </button>
      </nav>
    </div>
  );
}
