'use client';
import { useState, useEffect, useTransition, useOptimistic, useCallback } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Dumbbell, Utensils, Sparkles, Plus, Check, X, Flame,
  Loader2, LogOut, Home, Pencil, Trash2,
  Save, Droplets, Scale, ChevronRight, CalendarDays, Zap, RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addNutritionEntry, toggleNutritionItem, updateNutritionEntry,
  deleteNutritionEntry, mockOrRunAICheckIn,
  getTodayNutrition, getActiveUserGoal,
  updateUserGoal, logDailyWeight, getWeeklyWeightLogs,
} from '@/app/actions';
import { USER_SPLITS } from '@/lib/splits';

const ECLIPSE_QUOTES = [
  { text: "Progressive overload is the only currency that matters.", author: "Eclipse Engine" },
  { text: "The barbell doesn't care about your bad day.", author: "Iron Philosophy" },
  { text: "Ship code. Hit PRs. Repeat.", author: "Dev & Lifter Manifesto" },
  { text: "Data doesn't lie. Feelings do. Trust the numbers.", author: "Eclipse AI" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "Every set is a commit. Every session is a merge to main.", author: "Eclipse Engine" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Build the physique like you build the product: iteratively, daily, relentlessly.", author: "Dev & Lifter Manifesto" },
  { text: "Consistent mediocrity beats inconsistent brilliance every time.", author: "Eclipse AI" },
  { text: "The gym is the only place where no one judges a pull request.", author: "Iron Philosophy" },
  { text: "Eat. Train. Sleep. Deploy. Repeat.", author: "Eclipse Engine" },
  { text: "Strength is never a weakness. Weakness is never a strength.", author: "Mark Bell" },
];

interface UserInfo { name: string; email: string; image: string; }
interface NutritionItem {
  id: string; itemName: string; category: string; calories: number;
  proteinG: number; waterMl: number; isCompleted: boolean;
}
interface AIResult {
  calsAdjustedBy: number; explanation: string;
  newDailyCals: number; newDailyProtein: number;
}

interface RemainingRingProps {
  remaining: number; total: number; consumed: number; label: string;
  unit: string; colorStroke: string; colorText: string;
  icon: React.ReactNode; onClick?: () => void;
}

const RemainingRing = ({ remaining, total, consumed, label, unit, colorStroke, colorText, icon, onClick }: RemainingRingProps) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const consumedPct = Math.min(Math.max(consumed / Math.max(total, 1), 0), 1);
  const filledOffset = circumference - consumedPct * circumference;
  const isOver = remaining < 0;
  return (
    <div className={`relative flex flex-col items-center gap-2 ${onClick ? 'cursor-pointer group' : ''}`} onClick={onClick}>
      <div className="relative w-28 h-28">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={radius} className="stroke-slate-800/80" strokeWidth="9" fill="none" />
          <circle cx="56" cy="56" r={radius}
            className={`transition-all duration-1000 ease-out ${isOver ? 'stroke-red-500' : colorStroke}`}
            strokeWidth="9" strokeDasharray={circumference} strokeDashoffset={filledOffset}
            strokeLinecap="round" fill="none" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <span className={`font-black text-lg leading-none ${isOver ? 'text-red-400' : colorText}`}>
            {isOver ? '0' : Math.round(remaining).toLocaleString()}
          </span>
          <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase leading-tight mt-0.5">{unit} left</span>
          {onClick && <Pencil size={8} className="text-slate-600 mt-0.5 group-hover:text-cyan-400 transition-colors" />}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500">{icon}</span>
        <span className="text-xs font-bold text-slate-300">{label}</span>
      </div>
      <div className="text-[10px] text-slate-500 font-medium">
        {Math.round(consumed).toLocaleString()} / {Math.round(total).toLocaleString()}
      </div>
    </div>
  );
};

function getCategoryStyle(cat: string) {
  const c = cat.toUpperCase();
  if (c === 'MEAL') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  if (c === 'SNACK') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
  return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
}

function NutritionItemRow({ item, onToggle, onEdit, onDelete }: {
  item: NutritionItem; onToggle: (id: string) => void;
  onEdit: (item: NutritionItem) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="pt-3 first:pt-0 flex items-center justify-between gap-2 group animate-in fade-in duration-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button onClick={() => onToggle(item.id)}
          className={`w-6 h-6 shrink-0 rounded-lg border flex items-center justify-center transition-all ${item.isCompleted ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-slate-700 bg-slate-950/40 text-transparent hover:border-slate-500'}`}
          title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}>
          <Check size={14} className={item.isCompleted ? 'stroke-[3]' : 'opacity-0'} />
        </button>
        <div className="min-w-0 flex-1">
          <span className={`text-sm font-medium transition-all block truncate ${item.isCompleted ? 'text-white' : 'text-slate-500 line-through'}`}>
            {item.itemName}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 inline-block ${getCategoryStyle(item.category)}`}>
            {item.category.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right text-xs">
          <span className="text-white font-bold block">{item.calories} kcal</span>
          {item.category.toUpperCase() === 'WATER'
            ? <span className="text-cyan-400 font-semibold">{item.waterMl} ml</span>
            : <span className="text-slate-400 font-semibold">{item.proteinG}g prot</span>}
        </div>
        <button onClick={() => onEdit(item)}
          className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 flex items-center justify-center transition-all"
          title="Edit item" aria-label={`Edit ${item.itemName}`}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(item.id)}
          className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
          title="Delete item" aria-label={`Delete ${item.itemName}`}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function EclipseDashboard({ user }: { user: UserInfo }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'nutrition' | 'ai'>('dashboard');

  // Rotating quote
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * ECLIPSE_QUOTES.length));
  }, []);
  const currentQuote = ECLIPSE_QUOTES[quoteIndex];

  // User Goals
  const [targetCals, setTargetCals] = useState(2950);
  const [targetProtein, setTargetProtein] = useState(130);
  const [targetWaterMl, setTargetWaterMl] = useState(2500);
  const [isEditingCals, setIsEditingCals] = useState(false);
  const [isEditingProtein, setIsEditingProtein] = useState(false);
  const [isEditingWater, setIsEditingWater] = useState(false);
  const [editCalsValue, setEditCalsValue] = useState<number | ''>(2950);
  const [editProteinValue, setEditProteinValue] = useState<number | ''>(130);
  const [editWaterValue, setEditWaterValue] = useState<number | ''>(2500);
  const [isSavingGoal, startGoalTransition] = useTransition();

  // Nutrition state
  const [isNutritionLoading, setIsNutritionLoading] = useState(true);
  const [nutritionListReal, setNutritionListReal] = useState<NutritionItem[]>([]);
  const [optimisticNutritionList, dispatchOptimisticNutrition] = useOptimistic(
    nutritionListReal,
    (state, action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'ADD':
          return [...state, action.payload];
        case 'TOGGLE':
          return state.map(item => item.id === action.payload ? { ...item, isCompleted: !item.isCompleted } : item);
        case 'EDIT':
          return state.map(item => item.id === action.payload.id ? { ...item, ...action.payload } : item);
        case 'DELETE':
          return state.filter(item => item.id !== action.payload);
        default:
          return state;
      }
    }
  );
  const [, startNutritionTransition] = useTransition();

  // Add food modal
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Meal' | 'Snack' | 'Water'>('Meal');
  const [newItemCalories, setNewItemCalories] = useState<number | ''>(400);
  const [newItemProtein, setNewItemProtein] = useState<number | ''>(30);
  const [newItemWaterMl, setNewItemWaterMl] = useState<number | ''>(250);
  const [isAddingItem, startAddTransition] = useTransition();

  // Edit item modal
  const [editingItem, setEditingItem] = useState<NutritionItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemCals, setEditItemCals] = useState<number | ''>(0);
  const [editItemProtein, setEditItemProtein] = useState<number | ''>(0);
  const [editItemWaterMl, setEditItemWaterMl] = useState<number | ''>(0);
  const [editItemCategory, setEditItemCategory] = useState<'Meal' | 'Snack' | 'Water'>('Meal');
  const [isSavingEdit, startEditTransition] = useTransition();

  // Daily weigh-in
  const [todayWeightInput, setTodayWeightInput] = useState<number | ''>('');
  const [savedWeightToday, setSavedWeightToday] = useState<number | null>(null);
  const [isSavingWeight, startWeightTransition] = useTransition();
  const [weekWeights, setWeekWeights] = useState<Array<{ date: string; morningWeight: number | null }>>([]);

  // Up Next Split Calculation
  const [nextSplitIndex, setNextSplitIndex] = useState(0);
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    setNextSplitIndex(dayOfYear % USER_SPLITS.length);
  }, []);
  const nextSplit = USER_SPLITS[nextSplitIndex] || USER_SPLITS[0];

  // AI progression engine
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [isAiLoading, startAiTransition] = useTransition();

  // Legacy quick workout set state
  const [actualReps, setActualReps] = useState<number | ''>(10);

  // Load data on mount
  const loadData = useCallback(async () => {
    try {
      const [todayLogs, goal, weightHistory] = await Promise.all([
        getTodayNutrition(),
        getActiveUserGoal(),
        getWeeklyWeightLogs(),
      ]);

      if (todayLogs) {
        const items: NutritionItem[] = todayLogs.map(l => ({
          id: l.id,
          itemName: l.itemName,
          category: l.category,
          calories: l.calories,
          proteinG: l.proteinG,
          waterMl: (l as any).waterMl || 0,
          isCompleted: l.isCompleted,
        }));
        setNutritionListReal(items);
      }

      if (goal) {
        setTargetCals(goal.targetDailyCals);
        setTargetProtein(goal.targetDailyProtein);
        setTargetWaterMl((goal as any).targetDailyWaterMl || 2500);
        setEditCalsValue(goal.targetDailyCals);
        setEditProteinValue(goal.targetDailyProtein);
        setEditWaterValue((goal as any).targetDailyWaterMl || 2500);
      }

      if (weightHistory && weightHistory.length > 0) {
        setWeekWeights(weightHistory);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLog = weightHistory.find(w => w.date === todayStr);
        if (todayLog && todayLog.morningWeight) {
          setSavedWeightToday(todayLog.morningWeight);
          setTodayWeightInput(todayLog.morningWeight);
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setIsNutritionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived totals from active items
  const activeItems = optimisticNutritionList.filter(i => i.isCompleted);
  const consumedCals = activeItems.reduce((acc, i) => acc + i.calories, 0);
  const consumedProtein = activeItems.reduce((acc, i) => acc + i.proteinG, 0);
  const consumedWater = activeItems.reduce((acc, i) => acc + (i.waterMl || (i.category.toUpperCase() === 'WATER' ? i.calories : 0)), 0);

  const remainingCals = targetCals - consumedCals;
  const remainingProtein = targetProtein - consumedProtein;
  const remainingWater = targetWaterMl - consumedWater;

  // Goal Save Handler
  const handleSaveGoal = (field: 'cals' | 'protein' | 'water') => {
    startGoalTransition(async () => {
      let newCals = targetCals;
      let newProt = targetProtein;
      let newWater = targetWaterMl;

      if (field === 'cals' && typeof editCalsValue === 'number') newCals = editCalsValue;
      if (field === 'protein' && typeof editProteinValue === 'number') newProt = editProteinValue;
      if (field === 'water' && typeof editWaterValue === 'number') newWater = editWaterValue;

      const res = await updateUserGoal({
        targetDailyCals: newCals,
        targetDailyProtein: newProt,
        targetDailyWaterMl: newWater,
      });

      if (res && res.success) {
        setTargetCals(newCals);
        setTargetProtein(newProt);
        setTargetWaterMl(newWater);
        setIsEditingCals(false);
        setIsEditingProtein(false);
        setIsEditingWater(false);
        toast.success('Macro targets updated!');
      } else {
        toast.error('Failed to update targets');
      }
    });
  };

  // Nutrition item handlers
  const handleToggleItem = (id: string) => {
    startNutritionTransition(async () => {
      dispatchOptimisticNutrition({ type: 'TOGGLE', payload: id });
      const target = optimisticNutritionList.find(i => i.id === id);
      const res = await toggleNutritionItem(id, !(target?.isCompleted));
      if (!res) {
        toast.error('Failed to sync item status');
        loadData();
      }
    });
  };

  const handleDeleteItem = (id: string) => {
    startNutritionTransition(async () => {
      dispatchOptimisticNutrition({ type: 'DELETE', payload: id });
      const res = await deleteNutritionEntry(id);
      if (res && res.success) {
        setNutritionListReal(prev => prev.filter(i => i.id !== id));
        toast.success('Item deleted');
      } else {
        toast.error('Failed to delete item');
        loadData();
      }
    });
  };

  const handleOpenEditModal = (item: NutritionItem) => {
    setEditingItem(item);
    setEditItemName(item.itemName);
    setEditItemCals(item.calories);
    setEditItemProtein(item.proteinG);
    setEditItemWaterMl(item.waterMl || 0);
    setEditItemCategory((item.category as any) || 'Meal');
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    startEditTransition(async () => {
      const updated = {
        id: editingItem.id,
        itemName: editItemName,
        category: editItemCategory,
        calories: editItemCategory === 'Water' ? 0 : Number(editItemCals) || 0,
        proteinG: editItemCategory === 'Water' ? 0 : Number(editItemProtein) || 0,
        waterMl: editItemCategory === 'Water' ? (Number(editItemWaterMl) || 0) : 0,
      };

      dispatchOptimisticNutrition({ type: 'EDIT', payload: updated });
      setEditingItem(null);

      const res = await updateNutritionEntry(editingItem.id, updated);
      if (res && res.success) {
        toast.success('Food item updated');
        loadData();
      } else {
        toast.error('Failed to update food item');
        loadData();
      }
    });
  };

  const handleCreateFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    startAddTransition(async () => {
      const tempId = 'temp-' + Date.now();
      const isWater = newItemCategory === 'Water';
      const newItem: NutritionItem = {
        id: tempId,
        itemName: newItemName,
        category: newItemCategory,
        calories: isWater ? 0 : Number(newItemCalories) || 0,
        proteinG: isWater ? 0 : Number(newItemProtein) || 0,
        waterMl: isWater ? Number(newItemWaterMl) || 0 : 0,
        isCompleted: true,
      };

      dispatchOptimisticNutrition({ type: 'ADD', payload: newItem });
      setShowAddFoodModal(false);

      const res = await addNutritionEntry({
        itemName: newItem.itemName,
        category: newItem.category,
        calories: newItem.calories,
        proteinG: newItem.proteinG,
        waterMl: newItem.waterMl,
      });

      if (res && res.id) {
        setNutritionListReal(prev => [...prev, {
          id: res.id,
          itemName: res.itemName,
          category: res.category,
          calories: res.calories,
          proteinG: res.proteinG,
          waterMl: (res as any).waterMl || 0,
          isCompleted: res.isCompleted,
        }]);
        toast.success('Item added!');
      } else {
        toast.error('Failed to save item');
        loadData();
      }

      setNewItemName('');
      setNewItemCalories(400);
      setNewItemProtein(30);
      setNewItemWaterMl(250);
    });
  };

  // Weigh-in submit
  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(todayWeightInput);
    if (!val || val < 30 || val > 300) {
      toast.error('Please enter a valid weight (30kg - 300kg)');
      return;
    }

    startWeightTransition(async () => {
      const res = await logDailyWeight(val);
      if (res && res.success) {
        setSavedWeightToday(val);
        toast.success(`Weight of ${val}kg logged for today!`);
        loadData();
      } else {
        toast.error('Failed to log weight');
      }
    });
  };

  // Run AI analysis
  const handleRunAI = () => {
    startAiTransition(async () => {
      const res = await mockOrRunAICheckIn();
      if (res && typeof res.calsAdjustedBy === 'number') {
        setAiResult(res);
        setAiApplied(false);
        toast.success('AI Weekly Analysis complete!');
      } else {
        toast.error('Failed to generate AI analysis');
      }
    });
  };

  const handleApplyAI = () => {
    if (!aiResult) return;
    startGoalTransition(async () => {
      const res = await updateUserGoal({
        targetDailyCals: aiResult.newDailyCals,
        targetDailyProtein: aiResult.newDailyProtein,
        targetDailyWaterMl: targetWaterMl,
      });
      if (res && res.success) {
        setTargetCals(aiResult.newDailyCals);
        setTargetProtein(aiResult.newDailyProtein);
        setAiApplied(true);
        toast.success('AI Recommended targets applied!');
      } else {
        toast.error('Failed to apply AI targets');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <span className="font-black text-cyan-400 text-lg leading-none">E</span>
              </div>
            </div>
            <div>
              <h1 className="font-black text-base text-white tracking-wide leading-tight flex items-center gap-1.5">
                ECLIPSE
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">v2.0</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Welcome back, {user?.name || 'Athlete'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setQuoteIndex((prev) => (prev + 1) % ECLIPSE_QUOTES.length)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-all"
              title="New Motivation Quote">
              <RotateCw size={15} />
            </button>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-slate-700 text-xs font-semibold transition-all">
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">

        {/* Tab Navigation Controls */}
        <div className="flex p-1 bg-slate-900/80 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          <button onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'dashboard' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}>
            <Home size={15} />
            <span>Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('nutrition')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'nutrition' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}>
            <Utensils size={15} />
            <span>Nutrition</span>
          </button>
          <button onClick={() => setActiveTab('workout')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'workout' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'}`}>
            <Dumbbell size={15} />
            <span>Workouts</span>
          </button>
          <button onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'}`}>
            <Sparkles size={15} />
            <span>AI Coach</span>
          </button>
        </div>

        {/* ==================== TAB 1: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Phase 3.1: Top Section - Remaining Macros (3 Circular Progress Rings) */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Daily Fuel Targets</h2>
                  <p className="text-xs text-slate-500">Remaining balances for today</p>
                </div>
                <button onClick={() => setActiveTab('nutrition')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
                  Manage Macros <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 items-center justify-items-center py-2">
                <RemainingRing
                  remaining={remainingCals}
                  total={targetCals}
                  consumed={consumedCals}
                  label="Calories"
                  unit="kcal"
                  colorStroke="stroke-cyan-400"
                  colorText="text-cyan-400"
                  icon={<Flame size={14} className="text-cyan-400" />}
                />
                <RemainingRing
                  remaining={remainingProtein}
                  total={targetProtein}
                  consumed={consumedProtein}
                  label="Protein"
                  unit="g"
                  colorStroke="stroke-amber-400"
                  colorText="text-amber-400"
                  icon={<Zap size={14} className="text-amber-400" />}
                />
                <RemainingRing
                  remaining={remainingWater}
                  total={targetWaterMl}
                  consumed={consumedWater}
                  label="Water"
                  unit="ml"
                  colorStroke="stroke-indigo-400"
                  colorText="text-indigo-400"
                  icon={<Droplets size={14} className="text-indigo-400" />}
                />
              </div>
            </div>

            {/* Phase 3.2: Middle Section - Dynamic Motivation Quote Card */}
            <div className="relative group bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-6 overflow-hidden shadow-xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-cyan-500 via-indigo-500 to-amber-500" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 pl-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <span className="font-black text-2xl text-cyan-400">E</span>
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-slate-100 italic leading-snug">
                      &quot;{currentQuote.text}&quot;
                    </p>
                    <p className="text-xs text-cyan-400 font-semibold mt-1">
                      — {currentQuote.author}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setQuoteIndex((prev) => (prev + 1) % ECLIPSE_QUOTES.length)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-white text-xs font-semibold shrink-0 transition-all hover:bg-slate-800"
                >
                  Shuffle Quote
                </button>
              </div>
            </div>

            {/* Phase 3.3: Daily Weigh-In Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Scale size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Daily Weigh-In</h3>
                    <p className="text-xs text-slate-400">Log morning weight for AI trend analysis</p>
                  </div>
                </div>
                {savedWeightToday && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <Check size={12} /> Today: {savedWeightToday} kg
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveWeight} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 78.5"
                    value={todayWeightInput}
                    onChange={(e) => setTodayWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">kg</span>
                </div>
                <button
                  type="submit"
                  disabled={isSavingWeight}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingWeight ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{savedWeightToday ? 'Update Weight' : 'Save Weigh-In'}</span>
                </button>
              </form>

              {/* 7-Day Weight Log History */}
              {weekWeights.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60">
                  <p className="text-[11px] text-slate-400 font-bold mb-2 uppercase tracking-wider">7-Day Weight Trend</p>
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {weekWeights.map((w, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-2">
                        <span className="text-[9px] text-slate-500 block font-bold">
                          {new Date(w.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {w.morningWeight ? `${w.morningWeight}` : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phase 3.4: Bottom Section - Up Next Workout Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Up Next Workout</h3>
                    <p className="text-xs text-slate-400">Scheduled split for your next session</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  Day {(nextSplitIndex % 3) + 1}
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-white">{nextSplit.name}</h4>
                  <p className="text-xs text-slate-400">
                    {nextSplit.exercises.length} exercises planned • Est. {nextSplit.exercises.length * 10 + 15} mins
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {nextSplit.exercises.slice(0, 3).map((ex, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md font-medium">
                        {ex.name}
                      </span>
                    ))}
                    {nextSplit.exercises.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-medium">+{nextSplit.exercises.length - 3} more</span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/workout/${nextSplit.slug}`}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <span>Start Session</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: NUTRITION ==================== */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Target Settings Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Utensils size={16} className="text-cyan-400" />
                  <span>Macro Goals &amp; Targets</span>
                </h3>
                <span className="text-xs text-slate-500">Click ring or button to edit target</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Calories target */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Calories Goal</span>
                    <Flame size={15} className="text-cyan-400" />
                  </div>
                  {isEditingCals ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editCalsValue}
                        onChange={(e) => setEditCalsValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-cyan-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold"
                      />
                      <button onClick={() => handleSaveGoal('cals')} disabled={isSavingGoal} className="p-1.5 bg-cyan-500 text-slate-950 rounded-lg">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-white">{targetCals} <span className="text-xs font-normal text-slate-400">kcal</span></span>
                      <button onClick={() => setIsEditingCals(true)} className="text-slate-500 hover:text-cyan-400 text-xs font-semibold flex items-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Protein target */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Protein Goal</span>
                    <Zap size={15} className="text-amber-400" />
                  </div>
                  {isEditingProtein ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editProteinValue}
                        onChange={(e) => setEditProteinValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-amber-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold"
                      />
                      <button onClick={() => handleSaveGoal('protein')} disabled={isSavingGoal} className="p-1.5 bg-amber-400 text-slate-950 rounded-lg">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-white">{targetProtein} <span className="text-xs font-normal text-slate-400">g</span></span>
                      <button onClick={() => setIsEditingProtein(true)} className="text-slate-500 hover:text-amber-400 text-xs font-semibold flex items-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Water target */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Daily Water Goal</span>
                    <Droplets size={15} className="text-indigo-400" />
                  </div>
                  {isEditingWater ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editWaterValue}
                        onChange={(e) => setEditWaterValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold"
                      />
                      <button onClick={() => handleSaveGoal('water')} disabled={isSavingGoal} className="p-1.5 bg-indigo-500 text-white rounded-lg">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-white">{targetWaterMl} <span className="text-xs font-normal text-slate-400">ml</span></span>
                      <button onClick={() => setIsEditingWater(true)} className="text-slate-500 hover:text-indigo-400 text-xs font-semibold flex items-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Food & Water Log List with CRUD */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Today&apos;s Food &amp; Water Log</h3>
                  <p className="text-xs text-slate-400">Edit or delete logged items anytime</p>
                </div>
                <button
                  onClick={() => setShowAddFoodModal(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Plus size={15} /> Add Entry
                </button>
              </div>

              {isNutritionLoading ? (
                <div className="py-8 flex items-center justify-center text-slate-500 gap-2 text-xs">
                  <Loader2 size={16} className="animate-spin text-cyan-400" /> Loading log entries...
                </div>
              ) : optimisticNutritionList.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400 font-semibold">No food or water entries logged for today yet.</p>
                  <button
                    onClick={() => setShowAddFoodModal(true)}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 text-cyan-400 text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Plus size={14} /> Log First Meal
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {optimisticNutritionList.map((item) => (
                    <NutritionItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggleItem}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: WORKOUTS ==================== */}
        {activeTab === 'workout' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Dumbbell size={16} className="text-cyan-400" />
                    <span>Select Workout Routine</span>
                  </h3>
                  <p className="text-xs text-slate-400">Manage routines, add custom exercises &amp; track sets</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {USER_SPLITS.map((split) => (
                  <div key={split.slug} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4 group hover:border-slate-700 transition-all">
                    <div>
                      <h4 className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">{split.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{split.exercises.length} exercises</p>
                    </div>
                    <Link
                      href={`/workout/${split.slug}`}
                      className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:text-cyan-400 text-xs font-bold text-slate-300 text-center flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Open Split &amp; Edit</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Set Logger */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Quick Set Logger</h3>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-xs text-slate-400 font-medium">Target: Bench Press (Barbell)</span>
                  <div className="text-lg font-black text-white">32 kg x {actualReps || 0} reps</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">Reps:</span>
                    <input
                      type="number"
                      value={actualReps}
                      onChange={(e) => setActualReps(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-center text-sm font-bold text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      toast.success('Set logged!');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                  >
                    Log Set
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: AI COACH ==================== */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Gemini AI Weekly Progression Engine</h3>
                    <p className="text-xs text-slate-400">Analyzes 7-day weight delta &amp; nutrition to optimize your targets</p>
                  </div>
                </div>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Weigh-Ins Recorded</span>
                  <div className="text-base font-black text-white mt-0.5">{weekWeights.length} / 7 days</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Current Calorie Target</span>
                  <div className="text-base font-black text-cyan-400 mt-0.5">{targetCals} kcal</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Current Protein Target</span>
                  <div className="text-base font-black text-amber-400 mt-0.5">{targetProtein} g</div>
                </div>
              </div>

              <button
                onClick={handleRunAI}
                disabled={isAiLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Analyzing 7-Day Weight Delta &amp; Compliance...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Run AI Weekly Diet Analysis</span>
                  </>
                )}
              </button>

              {/* AI Analysis Result Card */}
              {aiResult && (
                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      AI Analysis Complete
                    </span>
                    <span className="text-xs font-black text-cyan-400">
                      Adjustment: {aiResult.calsAdjustedBy > 0 ? `+${aiResult.calsAdjustedBy}` : aiResult.calsAdjustedBy} kcal
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    &quot;{aiResult.explanation}&quot;
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">New Calorie Target</span>
                      <div className="text-lg font-black text-cyan-400">{aiResult.newDailyCals} kcal</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">New Protein Target</span>
                      <div className="text-lg font-black text-amber-400">{aiResult.newDailyProtein} g</div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyAI}
                    disabled={aiApplied || isSavingGoal}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {aiApplied ? <Check size={16} /> : <Save size={16} />}
                    <span>{aiApplied ? 'Targets Updated & Active' : 'Apply Recommended Targets'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==================== ADD FOOD MODAL ==================== */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Food / Water Entry</h3>
              <button onClick={() => setShowAddFoodModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFood} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Meal', 'Snack', 'Water'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewItemCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${newItemCategory === cat ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder={newItemCategory === 'Water' ? 'e.g. Morning Water Bottle' : 'e.g. Chicken Rice Bowl'}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {newItemCategory === 'Water' ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Water Amount (ml)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={newItemWaterMl}
                    onChange={(e) => setNewItemWaterMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={newItemCalories}
                      onChange={(e) => setNewItemCalories(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={newItemProtein}
                      onChange={(e) => setNewItemProtein(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFoodModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingItem}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  {isAddingItem ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT FOOD MODAL ==================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Food / Water Entry</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Meal', 'Snack', 'Water'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditItemCategory(cat)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${editItemCategory === cat ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {editItemCategory === 'Water' ? (
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Water Amount (ml)</label>
                  <input
                    type="number"
                    value={editItemWaterMl}
                    onChange={(e) => setEditItemWaterMl(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={editItemCals}
                      onChange={(e) => setEditItemCals(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={editItemProtein}
                      onChange={(e) => setEditItemProtein(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
