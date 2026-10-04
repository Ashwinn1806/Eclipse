'use client';
import { useState, useEffect, useTransition, useOptimistic, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Dumbbell, Utensils, Sparkles, Plus, Check, X, Flame,
  Loader2, LogOut, Home, Pencil, Trash2,
  Save, Droplets, Scale, ChevronRight, CalendarDays, Zap, RotateCw, TrendingUp, FileSpreadsheet,
  ChevronUp, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  addNutritionEntry, toggleNutritionItem, updateNutritionEntry,
  deleteNutritionEntry, mockOrRunAICheckIn,
  updateUserGoal, logDailyWeight, deleteAndReindexSplit,
  getPerformanceInsights, importNutritionWorksheet, reorderNutritionEntry,
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

function NutritionItemRow({
  item,
  index,
  totalItems,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
}: {
  item: NutritionItem;
  index: number;
  totalItems: number;
  onToggle: (id: string) => void;
  onEdit: (item: NutritionItem) => void;
  onDelete: (id: string) => void;
  onReorder?: (id: string, direction: 'up' | 'down') => void;
}) {
  return (
    <div className="pt-3 first:pt-0 flex items-center justify-between gap-2 group animate-in fade-in duration-200 select-none">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {onReorder && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReorder(item.id, 'up');
              }}
              disabled={index === 0}
              className="p-1 rounded bg-slate-800/80 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
              title="Move Up"
              aria-label={`Move ${item.itemName} up`}
            >
              <ChevronUp size={11} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onReorder(item.id, 'down');
              }}
              disabled={index === totalItems - 1}
              className="p-1 rounded bg-slate-800/80 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
              title="Move Down"
              aria-label={`Move ${item.itemName} down`}
            >
              <ChevronDown size={11} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(item.id);
          }}
          className={`w-6 h-6 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${item.isCompleted ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-slate-700 bg-slate-950/40 text-transparent hover:border-slate-500'}`}
          title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}>
          <Check size={14} className={item.isCompleted ? 'stroke-[3]' : 'opacity-0'} />
        </button>
        <div
          className="min-w-0 flex-1 cursor-pointer py-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle(item.id);
          }}
        >
          <span className={`text-sm font-medium transition-all block truncate ${item.isCompleted ? 'text-white' : 'text-slate-500 line-through'}`}>
            {item.itemName}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 inline-block ${getCategoryStyle(item.category)}`}>
            {item.category.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right text-xs mr-1">
          <span className="text-white font-bold block">{item.calories} kcal</span>
          {item.category.toUpperCase() === 'WATER'
            ? <span className="text-cyan-400 font-semibold">{item.waterMl} ml</span>
            : <span className="text-slate-400 font-semibold">{item.proteinG}g prot</span>}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(item);
          }}
          className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          title="Edit item" aria-label={`Edit ${item.itemName}`}>
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-red-400 hover:bg-red-500/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          title="Delete item" aria-label={`Delete ${item.itemName}`}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

interface EclipseDashboardProps {
  user: UserInfo;
  initialTab?: 'dashboard' | 'workout' | 'nutrition' | 'ai';
  initialGoal?: {
    targetDailyCals: number;
    targetDailyProtein: number;
    targetDailyWaterMl: number;
  } | null;
  initialNutritionEntries?: NutritionItem[];
  initialWeightLogs?: Array<{ date: string; weightKg: number }>;
}

export default function EclipseDashboard({
  user,
  initialTab = 'dashboard',
  initialGoal,
  initialNutritionEntries = [],
  initialWeightLogs = [],
}: EclipseDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workout' | 'nutrition' | 'ai'>(initialTab);

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, startImportTransition] = useTransition();

  // Quote
  const [quoteIndex, setQuoteIndex] = useState(0);
  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * ECLIPSE_QUOTES.length));
  }, []);
  const currentQuote = ECLIPSE_QUOTES[quoteIndex];

  // Nutrition-to-Performance Correlation Insight
  const [performanceInsight, setPerformanceInsight] = useState<string>(
    'Your session volume increases ~14% on days you hit >130g protein. Maintain target protein intake to maximize progressive overload gains.'
  );
  useEffect(() => {
    getPerformanceInsights().then((res) => {
      if (res?.insight) setPerformanceInsight(res.insight);
    });
  }, []);

  // User Goals derived directly from incoming Server Component props
  const baseGoal = {
    targetDailyCals: initialGoal?.targetDailyCals ?? 2950,
    targetDailyProtein: initialGoal?.targetDailyProtein ?? 130,
    targetDailyWaterMl: initialGoal?.targetDailyWaterMl ?? 2500,
  };
  const [optimisticGoal, dispatchOptimisticGoal] = useOptimistic(
    baseGoal,
    (current, update: Partial<typeof baseGoal>) => ({ ...current, ...update })
  );
  const targetCals = optimisticGoal.targetDailyCals;
  const targetProtein = optimisticGoal.targetDailyProtein;
  const targetWaterMl = optimisticGoal.targetDailyWaterMl;

  const [isEditingCals, setIsEditingCals] = useState(false);
  const [isEditingProtein, setIsEditingProtein] = useState(false);
  const [isEditingWater, setIsEditingWater] = useState(false);
  const [editCalsValue, setEditCalsValue] = useState<number | ''>(targetCals);
  const [editProteinValue, setEditProteinValue] = useState<number | ''>(targetProtein);
  const [editWaterValue, setEditWaterValue] = useState<number | ''>(targetWaterMl);
  const [isSavingGoal, startGoalTransition] = useTransition();

  // Nutrition list derived directly from incoming Server Component props
  const baseNutritionList: NutritionItem[] = (initialNutritionEntries || []).map((e: any) => ({
    id: e.id,
    itemName: e.itemName,
    category: e.category,
    calories: e.calories,
    proteinG: e.proteinG,
    waterMl: e.waterMl ?? 0,
    isCompleted: e.isCompleted,
  }));

  const [optimisticNutritionList, dispatchOptimisticNutrition] = useOptimistic(
    baseNutritionList,
    (state: NutritionItem[], action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'ADD':
          return [...state, action.payload];
        case 'TOGGLE':
          return state.map(item => item.id === action.payload ? { ...item, isCompleted: !item.isCompleted } : item);
        case 'EDIT':
          return state.map(item => item.id === action.payload.id ? { ...item, ...action.payload } : item);
        case 'DELETE':
          return state.filter(item => item.id !== action.payload);
        case 'REORDER':
          return action.payload;
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
  const [, startAddTransition] = useTransition();

  // Edit food modal
  const [editingItem, setEditingItem] = useState<NutritionItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemCals, setEditItemCals] = useState<number | ''>(0);
  const [editItemProtein, setEditItemProtein] = useState<number | ''>(0);
  const [editItemWaterMl, setEditItemWaterMl] = useState<number | ''>(0);
  const [editItemCategory, setEditItemCategory] = useState<'Meal' | 'Snack' | 'Water'>('Meal');
  const [, startEditTransition] = useTransition();

  // Daily weight derived directly from incoming Server Component props
  const baseWeightLogs = initialWeightLogs || [];
  const [optimisticWeightLogs, dispatchOptimisticWeightLogs] = useOptimistic(
    baseWeightLogs,
    (state: Array<{ date: string; weightKg: number }>, newLog: { date: string; weightKg: number }) => [...state, newLog]
  );

  const [todayWeightInput, setTodayWeightInput] = useState<number | ''>('');
  const [savedWeightToday, setSavedWeightToday] = useState<number | null>(null);
  const [, startWeightTransition] = useTransition();

  // AI Snapshot
  const [aiSnapshot, setAiSnapshot] = useState<any | null>(null);
  const [isAiRunning, startAiTransition] = useTransition();

  // Derived macro totals
  const totalCaloriesConsumed = optimisticNutritionList
    .filter((i) => i.isCompleted)
    .reduce((acc, curr) => acc + curr.calories, 0);

  const totalProteinConsumed = optimisticNutritionList
    .filter((i) => i.isCompleted)
    .reduce((acc, curr) => acc + curr.proteinG, 0);

  const totalWaterConsumed = optimisticNutritionList
    .filter((i) => i.isCompleted)
    .reduce((acc, curr) => acc + (curr.waterMl || 0), 0);

  const remainingCals = targetCals - totalCaloriesConsumed;
  const remainingProtein = targetProtein - totalProteinConsumed;
  const remainingWater = targetWaterMl - totalWaterConsumed;

  // Handlers wrapped in startTransition + router.refresh()
  const handleSaveGoalUpdates = (updates: { targetDailyCals?: number; targetDailyProtein?: number; targetDailyWaterMl?: number }) => {
    startGoalTransition(async () => {
      dispatchOptimisticGoal(updates);
      setIsEditingCals(false);
      setIsEditingProtein(false);
      setIsEditingWater(false);
      await updateUserGoal(updates);
      router.refresh();
      toast.success('Macro targets updated!');
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const tempItem: NutritionItem = {
      id: `temp-${Date.now()}`,
      itemName: newItemName.trim(),
      category: newItemCategory,
      calories: typeof newItemCalories === 'number' ? newItemCalories : 0,
      proteinG: typeof newItemProtein === 'number' ? newItemProtein : 0,
      waterMl: typeof newItemWaterMl === 'number' ? newItemWaterMl : 0,
      isCompleted: true,
    };

    startAddTransition(async () => {
      dispatchOptimisticNutrition({ type: 'ADD', payload: tempItem });
      setShowAddFoodModal(false);
      setNewItemName('');
      const res = await addNutritionEntry({
        itemName: tempItem.itemName,
        category: tempItem.category,
        calories: tempItem.calories,
        proteinG: tempItem.proteinG,
        waterMl: tempItem.waterMl,
      });
      router.refresh();
      if (res) toast.success(`Logged ${tempItem.itemName}`);
    });
  };

  const handleToggleItem = (id: string) => {
    const item = optimisticNutritionList.find(i => i.id === id);
    if (!item) return;
    startNutritionTransition(async () => {
      dispatchOptimisticNutrition({ type: 'TOGGLE', payload: id });
      await toggleNutritionItem(id, !item.isCompleted);
      router.refresh();
    });
  };

  const openEditModal = (item: NutritionItem) => {
    setEditingItem(item);
    setEditItemName(item.itemName);
    setEditItemCals(item.calories);
    setEditItemProtein(item.proteinG);
    setEditItemWaterMl(item.waterMl || 0);
    setEditItemCategory(item.category as 'Meal' | 'Snack' | 'Water');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;
    const updatedPayload: NutritionItem = {
      id: editingItem.id,
      itemName: editItemName.trim(),
      category: editItemCategory,
      calories: typeof editItemCals === 'number' ? editItemCals : 0,
      proteinG: typeof editItemProtein === 'number' ? editItemProtein : 0,
      waterMl: typeof editItemWaterMl === 'number' ? editItemWaterMl : 0,
      isCompleted: editingItem.isCompleted,
    };

    startEditTransition(async () => {
      dispatchOptimisticNutrition({ type: 'EDIT', payload: updatedPayload });
      setEditingItem(null);
      await updateNutritionEntry(editingItem.id, {
        itemName: updatedPayload.itemName,
        category: updatedPayload.category,
        calories: updatedPayload.calories,
        proteinG: updatedPayload.proteinG,
        waterMl: updatedPayload.waterMl,
      });
      router.refresh();
      toast.success('Food entry updated');
    });
  };

  const handleDeleteItem = (id: string) => {
    startNutritionTransition(async () => {
      dispatchOptimisticNutrition({ type: 'DELETE', payload: id });
      await deleteNutritionEntry(id);
      router.refresh();
      toast.success('Food entry deleted');
    });
  };

  const handleReorderItem = (id: string, direction: 'up' | 'down') => {
    const list = [...optimisticNutritionList];
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const nextList = [...list];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIdx, 0, moved);

    startNutritionTransition(async () => {
      dispatchOptimisticNutrition({ type: 'REORDER', payload: nextList });
      await reorderNutritionEntry(id, direction);
      router.refresh();
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    startImportTransition(async () => {
      const res = await importNutritionWorksheet(formData);
      if (res?.success && res?.entries) {
        const newItems: NutritionItem[] = res.entries.map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          category: item.category,
          calories: item.calories,
          proteinG: item.proteinG,
          waterMl: item.waterMl ?? 0,
          isCompleted: item.isCompleted,
        }));
        newItems.forEach((item) => {
          dispatchOptimisticNutrition({ type: 'ADD', payload: item });
        });
        router.refresh();
        toast.success(`Imported ${res.count} item(s) from worksheet!`);
      } else {
        toast.error(res?.error || 'Failed to import worksheet');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleSaveDailyWeight = () => {
    if (typeof todayWeightInput !== 'number' || todayWeightInput <= 0) return;
    const weightVal = todayWeightInput;
    startWeightTransition(async () => {
      dispatchOptimisticWeightLogs({ date: 'Today', weightKg: weightVal });
      setSavedWeightToday(weightVal);
      await logDailyWeight(weightVal);
      router.refresh();
      toast.success(`Log weight: ${weightVal} kg`);
    });
  };

  const handleRunAICheckIn = () => {
    startAiTransition(async () => {
      const res: any = await mockOrRunAICheckIn();
      router.refresh();
      const snapshot = res?.snapshot || (res?.calsAdjustedBy ? res : null);
      if (snapshot) {
        setAiSnapshot(snapshot);
        toast.success("AI Macro check-in complete!");
      } else {
        toast.error("AI check-in failed");
      }
    });
  };

  const [isDeletingSplit, startDeleteSplitTransition] = useTransition();
  const handleDeleteSplit = (splitId: string) => {
    if (!confirm('Are you sure you want to delete this split? Remaining splits will re-index sequentially.')) return;
    startDeleteSplitTransition(async () => {
      const res = await deleteAndReindexSplit(splitId);
      router.refresh();
      if (res?.success) {
        toast.success('Split deleted and re-indexed sequentially!');
      } else {
        toast.error('Failed to delete split');
      }
    });
  };


  // Up Next Split logic
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[new Date().getDay()];
  const scheduledToday = USER_SPLITS.find(s => s.subtitle.toLowerCase().includes(todayName.toLowerCase())) || USER_SPLITS[0];

  const recentWeightLogs = optimisticWeightLogs.slice(-7);
  const minW = Math.min(...recentWeightLogs.map((l) => l.weightKg), 70);
  const maxW = Math.max(...recentWeightLogs.map((l) => l.weightKg), 85);
  const rangeW = Math.max(maxW - minW, 1);

  return (
    <div className="min-h-screen bg-[#040812] text-slate-100 font-sans pb-24 selection:bg-cyan-500 selection:text-black">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 3 Macro Rings Card */}
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Flame className="text-amber-400" size={18} />
                    Daily Macro Breakdown
                  </h2>
                  <p className="text-xs text-slate-400">Target vs Consumed Progress</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/nutrition" onClick={() => setActiveTab('nutrition')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold hover:bg-purple-500/20 hover:text-purple-200 transition-all"
                    title="Open Macros Tab">
                    <Utensils size={14} className="text-purple-400" />
                    <span>Open Macros Tab</span>
                  </Link>
                  <button onClick={() => setShowAddFoodModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-all">
                    <Plus size={14} /> Log Food/Water
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 justify-items-center">
                <RemainingRing remaining={remainingCals} total={targetCals} consumed={totalCaloriesConsumed}
                  label="Calories" unit="kcal" colorStroke="stroke-amber-400" colorText="text-amber-400"
                  icon={<Flame size={14} className="text-amber-400" />} onClick={() => setIsEditingCals(true)} />
                <RemainingRing remaining={remainingProtein} total={targetProtein} consumed={totalProteinConsumed}
                  label="Protein" unit="g" colorStroke="stroke-purple-400" colorText="text-purple-400"
                  icon={<Utensils size={14} className="text-purple-400" />} onClick={() => setIsEditingProtein(true)} />
                <RemainingRing remaining={remainingWater} total={targetWaterMl} consumed={totalWaterConsumed}
                  label="Water" unit="ml" colorStroke="stroke-cyan-400" colorText="text-cyan-400"
                  icon={<Droplets size={14} className="text-cyan-400" />} onClick={() => setIsEditingWater(true)} />
              </div>
            </div>

            {/* Quote + Weigh-in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Quote */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/60 to-purple-950/20 border border-purple-500/20 backdrop-blur-xl flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Sparkles size={11} /> Mindset Shift
                  </span>
                  <button onClick={() => setQuoteIndex((prev) => (prev + 1) % ECLIPSE_QUOTES.length)}
                    className="text-slate-500 hover:text-purple-400 transition-colors p-1" title="New Quote">
                    <RotateCw size={14} />
                  </button>
                </div>
                <blockquote className="text-sm font-semibold text-slate-200 italic leading-relaxed my-2">
                  &ldquo;{currentQuote.text}&rdquo;
                </blockquote>
                <div className="text-right text-xs font-bold text-purple-400 mt-2">
                  — {currentQuote.author}
                </div>
              </div>

              {/* Weigh-in & Trend */}
              <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Scale size={16} className="text-cyan-400" /> Daily Weight Tracker
                    </h3>
                    <p className="text-[11px] text-slate-400">7-Day Trend Analysis</p>
                  </div>
                  {savedWeightToday ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Logged: {savedWeightToday} kg
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" placeholder="Weight in kg..."
                    value={todayWeightInput} onChange={(e) => setTodayWeightInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-bold" />
                  <button onClick={handleSaveDailyWeight} disabled={todayWeightInput === ''}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all disabled:opacity-50">
                    Save
                  </button>
                </div>

                {/* 7-Day Sparkline */}
                {recentWeightLogs.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-end justify-between h-14 gap-1 px-1">
                      {recentWeightLogs.map((log, idx) => {
                        const hPct = Math.min(Math.max(((log.weightKg - minW) / rangeW) * 100, 20), 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="w-full bg-cyan-500/20 group-hover:bg-cyan-400/40 rounded-t transition-all" style={{ height: `${hPct}%` }} />
                            <span className="text-[9px] text-slate-500 font-medium truncate">{log.date.slice(-5)}</span>
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-slate-900 border border-cyan-500/40 px-1.5 py-0.5 rounded text-[9px] font-bold text-cyan-300 pointer-events-none transition-all">
                              {log.weightKg}kg
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Nutrition-to-Performance Correlation Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-cyan-950/30 border border-emerald-500/20 backdrop-blur-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                <TrendingUp size={20} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    AI Performance Insight
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {performanceInsight}
                </p>
              </div>
            </div>

            {/* Next Up Workout Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-cyan-950/30 border border-cyan-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                    Scheduled Today
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{todayName}</span>
                </div>
                <h3 className="text-xl font-black text-white">{scheduledToday.name}</h3>
                <p className="text-xs text-slate-400">{scheduledToday.subtitle}</p>
              </div>
              <Link href={`/workout/${scheduledToday.slug}`}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-98 transition-all flex items-center justify-center gap-2">
                <Dumbbell size={18} /> Start Session <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={15} />
                  <span>Back to Dashboard</span>
                </Link>
                <div>
                  <h2 className="text-lg font-bold text-white">Daily Food & Water Log</h2>
                  <p className="text-xs text-slate-400">Complete items to update consumed macro totals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all">
                  {isImporting ? <Loader2 size={15} className="animate-spin text-cyan-400" /> : <FileSpreadsheet size={15} className="text-emerald-400" />}
                  <span>{isImporting ? 'Importing...' : 'Import Excel Worksheet (.xlsx / .csv)'}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    disabled={isImporting}
                    onChange={handleFileUpload}
                  />
                </label>
                <button onClick={() => setShowAddFoodModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:opacity-90 transition-all">
                  <Plus size={15} /> Add Food/Water
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl divide-y divide-slate-800/60">
              {optimisticNutritionList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No items logged today yet. Click &ldquo;Add Food/Water&rdquo; to start tracking!
                </div>
              ) : (
                optimisticNutritionList.map((item, index) => (
                  <NutritionItemRow key={item.id} item={item}
                    index={index}
                    totalItems={optimisticNutritionList.length}
                    onToggle={handleToggleItem}
                    onEdit={openEditModal}
                    onDelete={handleDeleteItem}
                    onReorder={handleReorderItem} />
                ))
              )}
            </div>
          </div>
        )}

        {/* WORKOUTS TAB */}
        {activeTab === 'workout' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Workout Splits</h2>
              <p className="text-xs text-slate-400">Select a split to launch your live workout session</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {USER_SPLITS.map((s) => (
                <Link key={s.slug} href={`/workout/${s.slug}`}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/40 transition-all group flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {s.subtitle}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteSplit(s.slug);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 transition-all"
                          title="Delete & Re-index Split"
                          aria-label={`Delete ${s.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={18} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-3 group-hover:text-cyan-300 transition-colors">{s.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{s.focus}</p>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium border-t border-slate-800/60 pt-3">
                    {s.exercises.length} Exercises Included
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI COACH TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={20} />
                    Gemini Weekly Diet Audit
                  </h2>
                  <p className="text-xs text-slate-400">Thermodynamic math &amp; calorie target adjustment</p>
                </div>
                <button onClick={handleRunAICheckIn} disabled={isAiRunning}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50">
                  {isAiRunning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Run Audit
                </button>
              </div>

              {aiSnapshot ? (
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300">Target Adjustment</span>
                    <span className="font-mono text-purple-400">{aiSnapshot.calsAdjustedBy >= 0 ? `+${aiSnapshot.calsAdjustedBy}` : aiSnapshot.calsAdjustedBy} kcal</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiSnapshot.explanation}</p>
                  <div className="pt-2 border-t border-purple-500/20 flex gap-4 text-xs font-bold">
                    <span className="text-amber-400">New Daily Cals: {aiSnapshot.newDailyCals}</span>
                    <span className="text-purple-400">New Daily Protein: {aiSnapshot.newDailyProtein}g</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Click &ldquo;Run Audit&rdquo; to analyze your weekly energy balance and weight progress.
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Edit Target Modal */}
      {(isEditingCals || isEditingProtein || isEditingWater) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1120] border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-white">Update Daily Target</h3>
            {isEditingCals && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Calories (kcal)</label>
                <input type="number" value={editCalsValue} onChange={(e) => setEditCalsValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold" />
              </div>
            )}
            {isEditingProtein && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Protein (g)</label>
                <input type="number" value={editProteinValue} onChange={(e) => setEditProteinValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold" />
              </div>
            )}
            {isEditingWater && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Water (ml)</label>
                <input type="number" value={editWaterValue} onChange={(e) => setEditWaterValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-bold" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsEditingCals(false); setIsEditingProtein(false); setIsEditingWater(false); }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={() => handleSaveGoalUpdates({
                ...(isEditingCals && typeof editCalsValue === 'number' ? { targetDailyCals: editCalsValue } : {}),
                ...(isEditingProtein && typeof editProteinValue === 'number' ? { targetDailyProtein: editProteinValue } : {}),
                ...(isEditingWater && typeof editWaterValue === 'number' ? { targetDailyWaterMl: editWaterValue } : {}),
              })}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold">Save Target</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddItem} className="bg-[#0a1120] border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Add Log Entry</h3>
              <button type="button" onClick={() => setShowAddFoodModal(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Item Name</label>
              <input type="text" required value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Chicken & Rice"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <option value="Meal">Meal</option>
                <option value="Snack">Snack</option>
                <option value="Water">Water</option>
              </select>
            </div>
            {newItemCategory === 'Water' ? (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Water Amount (ml)</label>
                <input type="number" value={newItemWaterMl} onChange={(e) => setNewItemWaterMl(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Calories (kcal)</label>
                  <input type="number" value={newItemCalories} onChange={(e) => setNewItemCalories(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Protein (g)</label>
                  <input type="number" value={newItemProtein} onChange={(e) => setNewItemProtein(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">Log Entry</button>
          </form>
        </div>
      )}

      {/* Edit Food Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#0a1120] border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Edit Entry</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Item Name</label>
              <input type="text" required value={editItemName} onChange={(e) => setEditItemName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Category</label>
              <select value={editItemCategory} onChange={(e) => setEditItemCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <option value="Meal">Meal</option>
                <option value="Snack">Snack</option>
                <option value="Water">Water</option>
              </select>
            </div>
            {editItemCategory === 'Water' ? (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Water Amount (ml)</label>
                <input type="number" value={editItemWaterMl} onChange={(e) => setEditItemWaterMl(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Calories (kcal)</label>
                  <input type="number" value={editItemCals} onChange={(e) => setEditItemCals(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Protein (g)</label>
                  <input type="number" value={editItemProtein} onChange={(e) => setEditItemProtein(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
                </div>
              </div>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">Save Changes</button>
          </form>
        </div>
      )}
    </div>
  );
}
