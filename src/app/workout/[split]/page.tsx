'use client';

import React, { useState, useEffect, useTransition, useOptimistic, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Dumbbell,
  Ghost,
  TrendingUp,
  Check,
  Timer,
  FastForward,
  Sparkles,
  Loader2,
  Award,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  Save,
  MoreVertical,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { getSplitBySlug } from '@/lib/splits';
import {
  analyzeSessionProgression,
  getSplitTonnageHistory,
  getSplitGhostData,
  AIProgressionTarget,
} from '@/app/actions/aiWorkout';
import {
  updateWorkoutSet,
  deleteWorkoutSet,
  addSetToExercise,
  deleteExerciseFromSession,
  renameExerciseInSession,
  addExerciseToSession,
  getPendingSessionWithSets,
} from '@/app/actions';

// ---------------------------------------------------------------------------
// Ghost cache (localStorage) helpers — safe merge for dynamic exercise lists
// ---------------------------------------------------------------------------
const GHOST_CACHE_KEY = (splitSlug: string) => `eclipse_ghost_${splitSlug}`;
const GHOST_CACHE_VERSION = 2; // bump version to bust old stale cache
const GHOST_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface GhostCacheEnvelope {
  version: number;
  timestamp: number;
  data: Record<string, GhostTargetInfo>;
}

function loadCachedGhosts(splitSlug: string): Record<string, GhostTargetInfo> | null {
  try {
    const raw = localStorage.getItem(GHOST_CACHE_KEY(splitSlug));
    if (!raw) return null;
    const envelope: GhostCacheEnvelope = JSON.parse(raw);
    if (
      envelope.version !== GHOST_CACHE_VERSION ||
      Date.now() - envelope.timestamp > GHOST_CACHE_TTL_MS
    ) {
      localStorage.removeItem(GHOST_CACHE_KEY(splitSlug));
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

function saveCachedGhosts(splitSlug: string, ghosts: Record<string, GhostTargetInfo>) {
  try {
    const envelope: GhostCacheEnvelope = {
      version: GHOST_CACHE_VERSION,
      timestamp: Date.now(),
      data: ghosts,
    };
    localStorage.setItem(GHOST_CACHE_KEY(splitSlug), JSON.stringify(envelope));
  } catch {
    // ignore quota errors
  }
}

// Safe merge: only add keys that exist in current exercise list, ignore deleted ones
function mergeGhosts(
  cached: Record<string, GhostTargetInfo> | null,
  exerciseNames: string[],
  serverGhosts: Record<string, GhostTargetInfo>
): Record<string, GhostTargetInfo> {
  const merged: Record<string, GhostTargetInfo> = {};
  for (const name of exerciseNames) {
    if (serverGhosts[name]) {
      merged[name] = serverGhosts[name];
    } else if (cached && cached[name]) {
      merged[name] = cached[name];
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SetRow {
  id: string; // DB id or local temp id
  dbId: string | null; // null for local-only sets not yet persisted
  exerciseName: string;
  setNumber: number;
  targetWeight: number;
  targetReps: number;
  actualWeight: number | '';
  actualReps: number | '';
  isCompleted: boolean;
  isDropSet: boolean;
  isPersisted: boolean; // is this set from the DB?
}

interface ExerciseBlock {
  name: string;
  type: 'Compound' | 'Isolation';
  sets: SetRow[];
}

interface GhostTargetInfo {
  targetWeight: number;
  targetReps: number;
  ghostWeight: number;
  ghostReps: number;
}

// ---------------------------------------------------------------------------
// Add Exercise Modal
// ---------------------------------------------------------------------------
function AddExerciseModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, type: 'Compound' | 'Isolation', sets: Array<{ weight: number; reps: number }>) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Compound' | 'Isolation'>('Compound');
  const [numSets, setNumSets] = useState(3);
  const [setInputs, setSetInputs] = useState<Array<{ weight: number | ''; reps: number | '' }>>(
    Array.from({ length: 3 }, () => ({ weight: 20, reps: 10 }))
  );

  const updateNumSets = (n: number) => {
    const clamped = Math.max(1, Math.min(8, n));
    setNumSets(clamped);
    setSetInputs((prev) => {
      if (clamped > prev.length) {
        const last = prev[prev.length - 1] || { weight: 20, reps: 10 };
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ ...last }))];
      }
      return prev.slice(0, clamped);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const validSets = setInputs.map((s) => ({
      weight: typeof s.weight === 'number' ? s.weight : 0,
      reps: typeof s.reps === 'number' ? s.reps : 10,
    }));
    onAdd(name.trim(), type, validSets);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-200">
      <div className="bg-[#0a1120] border-t border-white/10 w-full max-w-lg rounded-t-3xl p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Add Custom Exercise</h3>
            <p className="text-xs text-slate-500 mt-0.5">Define sets, weights &amp; rep targets</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Exercise Name</label>
            <input
              type="text" required autoFocus placeholder="e.g. Incline Cable Fly"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Compound', 'Isolation'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${type === t ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-semibold">Number of Sets</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => updateNumSets(numSets - 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold">−</button>
                <span className="text-white font-bold text-sm w-4 text-center">{numSets}</span>
                <button type="button" onClick={() => updateNumSets(numSets + 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold">+</button>
              </div>
            </div>

            <div className="space-y-2">
              {setInputs.map((s, idx) => (
                <div key={idx} className="grid grid-cols-[32px_1fr_1fr] gap-2 items-center">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">{idx + 1}</span>
                  <div className="relative">
                    <input type="number" placeholder="kg" value={s.weight}
                      onChange={(e) => setSetInputs((prev) => prev.map((p, i) => i === idx ? { ...p, weight: e.target.value === '' ? '' : Number(e.target.value) } : p))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-bold text-center"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">KG</span>
                  </div>
                  <div className="relative">
                    <input type="number" placeholder="reps" value={s.reps}
                      onChange={(e) => setSetInputs((prev) => prev.map((p, i) => i === idx ? { ...p, reps: e.target.value === '' ? '' : Number(e.target.value) } : p))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 outline-none font-bold text-center"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">REPS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Exercise &amp; Generate Sets
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Workout Page
// ---------------------------------------------------------------------------
export default function SplitWorkoutPage() {
  const params = useParams();
  const rawSplit = params?.split as string | undefined;
  const splitData = getSplitBySlug(rawSplit || 'push');

  // DB session id for current pending session
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Exercise blocks (dynamic — loaded from DB, not static splits.ts)
  const [exerciseBlocks, setExerciseBlocks] = useState<ExerciseBlock[]>([]);
  const [isBlocksLoading, setIsBlocksLoading] = useState(true);

  type ExerciseBlocksOptimisticAction =
    | { type: 'set'; blocks: ExerciseBlock[] }
    | { type: 'add'; block: ExerciseBlock }
    | { type: 'delete'; name: string }
    | { type: 'rename'; oldName: string; newName: string };

  const [optimisticExerciseBlocks, dispatchOptimisticExerciseBlocks] = useOptimistic(
    exerciseBlocks,
    (current: ExerciseBlock[], action: ExerciseBlocksOptimisticAction) => {
      switch (action.type) {
        case 'set':
          return action.blocks;
        case 'add':
          return [...current, action.block];
        case 'delete':
          return current.filter((b) => b.name !== action.name);
        case 'rename':
          return current.map((b) =>
            b.name === action.oldName
              ? { ...b, name: action.newName, sets: b.sets.map((s) => ({ ...s, exerciseName: action.newName })) }
              : b
          );
        default:
          return current;
      }
    }
  );

  // Tonnage history
  const [tonnageHistory, setTonnageHistory] = useState<Array<{ weekLabel: string; date: string; tonnage: number }>>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Ghost targets
  const [ghostTargets, setGhostTargets] = useState<Record<string, GhostTargetInfo>>({});

  // Session stats
  const [sessionTonnage, setSessionTonnage] = useState(0);

  // Rest timer
  const [restTimer, setRestTimer] = useState<number>(0);
  const [activeRestExercise, setActiveRestExercise] = useState<string>('');

  // AI Modal
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<{
    recommendations: AIProgressionTarget[];
    totalTonnage: number;
    source: 'ai' | 'fallback';
  } | null>(null);
  const [targetsSaved, setTargetsSaved] = useState(false);

  // Add exercise modal
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  // Rename exercise state
  const [renamingExercise, setRenamingExercise] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [, startRenameTransition] = useTransition();

  // Open exercise menu
  const [exerciseMenu, setExerciseMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Transitions for set ops
  const [, startSetTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Close menu on outside click
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setExerciseMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // -------------------------------------------------------------------------
  // Load DB pending session + ghost data on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // 1. Instantly hydrate from localStorage cache
    const cached = loadCachedGhosts(splitData.slug);
    if (cached && Object.keys(cached).length > 0) {
      setGhostTargets(cached);
    }

    async function loadAll() {
      setIsBlocksLoading(true);
      setIsHistoryLoading(true);

      try {
        const [historyData, pendingSession, serverGhosts] = await Promise.all([
          getSplitTonnageHistory(splitData.name),
          getPendingSessionWithSets(splitData.name),
          getSplitGhostData(splitData.name),
        ]);

        if (!isMounted) return;

        if (historyData) setTonnageHistory(historyData);
        setIsHistoryLoading(false);

        // Build exercise blocks from DB session
        if (pendingSession && pendingSession.sets.length > 0) {
          setSessionId(pendingSession.id);
          const grouped: Record<string, SetRow[]> = {};
          for (const s of pendingSession.sets) {
            if (!grouped[s.exerciseName]) grouped[s.exerciseName] = [];
            grouped[s.exerciseName].push({
              id: s.id,
              dbId: s.id,
              exerciseName: s.exerciseName,
              setNumber: s.setNumber,
              targetWeight: s.targetWeight,
              targetReps: s.targetReps,
              actualWeight: s.actualWeight ?? '',
              actualReps: s.actualReps ?? '',
              isCompleted: s.isCompleted,
              isDropSet: (s as any).isDropSet ?? false,
              isPersisted: true,
            });
          }
          const blocks: ExerciseBlock[] = Object.entries(grouped).map(([name, sets]) => ({
            name,
            type: 'Compound',
            sets: sets.sort((a, b) => a.setNumber - b.setNumber),
          }));
          setExerciseBlocks(blocks);

          // Merge ghost targets safely using DB exercise names
          const exerciseNames = blocks.map((b) => b.name);
          const merged = mergeGhosts(cached, exerciseNames, serverGhosts);
          setGhostTargets(merged);
          saveCachedGhosts(splitData.slug, merged);
        } else {
          // Fall back to static splits.ts exercises as template
          const staticBlocks: ExerciseBlock[] = splitData.exercises.map((ex) => {
            const hasPresets = ex.presetSets && ex.presetSets.length > 0;
            const sets: SetRow[] = hasPresets
              ? ex.presetSets!.map((ps, idx) => ({
                  id: `local-${ex.id}-${idx}`,
                  dbId: null,
                  exerciseName: ex.name,
                  setNumber: ps.setNumber,
                  targetWeight: ps.targetWeight,
                  targetReps: ps.targetReps,
                  actualWeight: ps.targetWeight,
                  actualReps: ps.targetReps,
                  isCompleted: false,
                  isDropSet: !!ps.isDropSet,
                  isPersisted: false,
                }))
              : Array.from({ length: ex.defaultSets }, (_, idx) => {
                  const ghost = serverGhosts[ex.name];
                  const w = ghost?.targetWeight ?? ex.targetWeight;
                  const r = ghost?.targetReps ?? ex.targetReps;
                  return {
                    id: `local-${ex.id}-${idx}`,
                    dbId: null,
                    exerciseName: ex.name,
                    setNumber: idx + 1,
                    targetWeight: w,
                    targetReps: r,
                    actualWeight: w,
                    actualReps: r,
                    isCompleted: false,
                    isDropSet: false,
                    isPersisted: false,
                  };
                });
            return {
              name: ex.name,
              type: ex.isCompound ? 'Compound' : 'Isolation',
              sets,
            };
          });
          setExerciseBlocks(staticBlocks);

          const exerciseNames = staticBlocks.map((b) => b.name);
          const merged = mergeGhosts(cached, exerciseNames, serverGhosts);
          setGhostTargets(merged);
          saveCachedGhosts(splitData.slug, merged);
        }
      } catch (err) {
        console.warn('Failed to load workout session from DB:', err);
        // graceful fallback to static data
        const staticBlocks: ExerciseBlock[] = splitData.exercises.map((ex) => {
          const hasPresets = ex.presetSets && ex.presetSets.length > 0;
          const sets: SetRow[] = hasPresets
            ? ex.presetSets!.map((ps, idx) => ({
                id: `local-${ex.id}-${idx}`,
                dbId: null,
                exerciseName: ex.name,
                setNumber: ps.setNumber,
                targetWeight: ps.targetWeight,
                targetReps: ps.targetReps,
                actualWeight: ps.targetWeight,
                actualReps: ps.targetReps,
                isCompleted: false,
                isDropSet: !!ps.isDropSet,
                isPersisted: false,
              }))
            : Array.from({ length: ex.defaultSets }, (_, idx) => ({
                id: `local-${ex.id}-${idx}`,
                dbId: null,
                exerciseName: ex.name,
                setNumber: idx + 1,
                targetWeight: ex.targetWeight,
                targetReps: ex.targetReps,
                actualWeight: ex.targetWeight,
                actualReps: ex.targetReps,
                isCompleted: false,
                isDropSet: false,
                isPersisted: false,
              }));
          return {
            name: ex.name,
            type: ex.isCompound ? 'Compound' : 'Isolation',
            sets,
          };
        });
        if (isMounted) {
          setExerciseBlocks(staticBlocks);
          setIsHistoryLoading(false);
        }
      } finally {
        if (isMounted) setIsBlocksLoading(false);
      }
    }

    loadAll();
    return () => { isMounted = false; };
  }, [splitData.name, splitData.slug]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer <= 0) return;
    const interval = setInterval(() => {
      setRestTimer((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------------------
  // SET — toggle drop set
  // -------------------------------------------------------------------------
  const handleToggleDropSet = useCallback((exName: string, setId: string) => {
    let nextDropState = false;
    setExerciseBlocks((prev) => prev.map((ex) => {
      if (ex.name !== exName) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          nextDropState = !s.isDropSet;
          return { ...s, isDropSet: nextDropState };
        }),
      };
    }));

    const block = exerciseBlocks.find((e) => e.name === exName);
    const set = block?.sets.find((s) => s.id === setId);
    if (set?.dbId) {
      startSetTransition(async () => {
        const res = await updateWorkoutSet(set.dbId!, { isDropSet: nextDropState });
        if (res.success) {
          toast.success(nextDropState ? 'Marked as Drop Set' : 'Drop set unmarked');
        } else {
          toast.error('Failed to update drop set status in DB');
        }
      });
    } else {
      toast.success(nextDropState ? 'Marked as Drop Set' : 'Drop set unmarked');
    }
  }, [exerciseBlocks]);

  // -------------------------------------------------------------------------
  // SET — toggle complete
  // -------------------------------------------------------------------------
  const handleToggleSet = useCallback((exName: string, setId: string, weight: number, reps: number) => {
    setExerciseBlocks((prev) => prev.map((ex) => {
      if (ex.name !== exName) return ex;
      return {
        ...ex, sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          const next = !s.isCompleted;
          const w = typeof s.actualWeight === 'number' ? s.actualWeight : weight;
          const r = typeof s.actualReps === 'number' ? s.actualReps : reps;
          if (next) { setSessionTonnage((t) => t + w * r); setRestTimer(90); setActiveRestExercise(ex.name); }
          else { setSessionTonnage((t) => Math.max(0, t - w * r)); }
          return { ...s, isCompleted: next };
        }),
      };
    }));

    // Persist to DB if set has a dbId
    startSetTransition(async () => {
      const block = exerciseBlocks.find((e) => e.name === exName);
      const set = block?.sets.find((s) => s.id === setId);
      if (set?.dbId) {
        await updateWorkoutSet(set.dbId, { isCompleted: !set.isCompleted });
      }
    });
  }, [exerciseBlocks]);

  // -------------------------------------------------------------------------
  // SET — update input values (live)
  // -------------------------------------------------------------------------
  const handleUpdateInput = useCallback((
    exName: string, setId: string,
    field: 'actualWeight' | 'actualReps' | 'targetWeight' | 'targetReps',
    value: number | ''
  ) => {
    setExerciseBlocks((prev) => prev.map((ex) => {
      if (ex.name !== exName) return ex;
      return { ...ex, sets: ex.sets.map((s) => s.id === setId ? { ...s, [field]: value } : s) };
    }));
  }, []);

  // -------------------------------------------------------------------------
  // SET — onBlur save to DB
  // -------------------------------------------------------------------------
  const handleSetBlurSave = useCallback((exName: string, setId: string) => {
    const block = exerciseBlocks.find((e) => e.name === exName);
    const set = block?.sets.find((s) => s.id === setId);
    if (!set || !set.dbId) return;

    startSetTransition(async () => {
      const res = await updateWorkoutSet(set.dbId!, {
        targetWeight: typeof set.targetWeight === 'number' ? set.targetWeight : undefined,
        targetReps: typeof set.targetReps === 'number' ? set.targetReps : undefined,
        actualWeight: typeof set.actualWeight === 'number' ? set.actualWeight : undefined,
        actualReps: typeof set.actualReps === 'number' ? set.actualReps : undefined,
      });
      if (!res.success) {
        toast.error('Failed to save set changes');
      }
    });
  }, [exerciseBlocks]);

  // -------------------------------------------------------------------------
  // SET — add
  // -------------------------------------------------------------------------
  const handleAddSet = useCallback((exName: string) => {
    setExerciseBlocks((prev) => prev.map((ex) => {
      if (ex.name !== exName) return ex;
      const last = ex.sets[ex.sets.length - 1];
      const newSet: SetRow = {
        id: `local-new-${Date.now()}`,
        dbId: null,
        exerciseName: exName,
        setNumber: (last?.setNumber ?? 0) + 1,
        targetWeight: typeof last?.targetWeight === 'number' ? last.targetWeight : 20,
        targetReps: typeof last?.targetReps === 'number' ? last.targetReps : 10,
        actualWeight: typeof last?.actualWeight === 'number' ? last.actualWeight : 20,
        actualReps: typeof last?.actualReps === 'number' ? last.actualReps : 10,
        isCompleted: false,
        isDropSet: false,
        isPersisted: false,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    }));

    if (!sessionId) {
      toast.warning('No active session — finish current setup first to persist sets.');
      return;
    }

    startSetTransition(async () => {
      const block = exerciseBlocks.find((e) => e.name === exName);
      const last = block?.sets[block.sets.length - 1];
      const w = typeof last?.actualWeight === 'number' ? last.actualWeight : 20;
      const r = typeof last?.actualReps === 'number' ? last.actualReps : 10;
      const res = await addSetToExercise(sessionId, exName, w, r);
      if (res.success && res.set) {
        // Replace local id with real DB id
        setExerciseBlocks((prev) => prev.map((ex) => {
          if (ex.name !== exName) return ex;
          const sets = [...ex.sets];
          const localIdx = sets.findLastIndex((s) => !s.dbId);
          if (localIdx !== -1 && res.set) {
            sets[localIdx] = { ...sets[localIdx], id: res.set.id, dbId: res.set.id, isPersisted: true };
          }
          return { ...ex, sets };
        }));
        toast.success('Set added!');
      } else {
        toast.error('Failed to save new set to DB');
      }
    });
  }, [exerciseBlocks, sessionId]);

  // -------------------------------------------------------------------------
  // SET — delete
  // -------------------------------------------------------------------------
  const handleDeleteSet = useCallback((exName: string, setId: string) => {
    const block = exerciseBlocks.find((e) => e.name === exName);
    const set = block?.sets.find((s) => s.id === setId);
    if ((block?.sets.length ?? 0) <= 1) {
      toast.error('Cannot delete the last set. Delete the exercise instead.');
      return;
    }

    setExerciseBlocks((prev) => prev.map((ex) => {
      if (ex.name !== exName) return ex;
      return { ...ex, sets: ex.sets.filter((s) => s.id !== setId) };
    }));

    if (set?.dbId) {
      startSetTransition(async () => {
        const res = await deleteWorkoutSet(set.dbId!);
        if (!res.success) toast.error('Failed to delete set from DB');
        else toast.success('Set removed');
      });
    }
  }, [exerciseBlocks]);

  // -------------------------------------------------------------------------
  // EXERCISE — start rename
  // -------------------------------------------------------------------------
  const startRename = (exName: string) => {
    setRenamingExercise(exName);
    setRenameValue(exName);
    setExerciseMenu(null);
  };

  const commitRename = (oldName: string) => {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) {
      setRenamingExercise(null);
      return;
    }
    setRenamingExercise(null);

    startRenameTransition(async () => {
      dispatchOptimisticExerciseBlocks({ type: 'rename', oldName, newName });
      setExerciseBlocks((prev) =>
        prev.map((ex) => {
          if (ex.name !== oldName) return ex;
          return { ...ex, name: newName, sets: ex.sets.map((s) => ({ ...s, exerciseName: newName })) };
        })
      );

      if (sessionId) {
        const res = await renameExerciseInSession(sessionId, oldName, newName);
        if (res.success) {
          toast.success(`Renamed to "${newName}"`);
        } else {
          setExerciseBlocks((prev) =>
            prev.map((ex) => {
              if (ex.name !== newName) return ex;
              return { ...ex, name: oldName, sets: ex.sets.map((s) => ({ ...s, exerciseName: oldName })) };
            })
          );
          toast.error('Failed to rename exercise in database');
        }
      } else {
        toast.success(`Renamed to "${newName}"`);
      }
    });
  };

  // -------------------------------------------------------------------------
  // EXERCISE — delete
  // -------------------------------------------------------------------------
  const handleDeleteExercise = (exName: string) => {
    setExerciseMenu(null);
    const removedBlock = exerciseBlocks.find((e) => e.name === exName);

    startSetTransition(async () => {
      dispatchOptimisticExerciseBlocks({ type: 'delete', name: exName });
      setExerciseBlocks((prev) => prev.filter((e) => e.name !== exName));

      if (sessionId) {
        const res = await deleteExerciseFromSession(sessionId, exName);
        if (res.success) {
          toast.success(`"${exName}" removed`);
        } else {
          if (removedBlock) setExerciseBlocks((prev) => [...prev, removedBlock]);
          toast.error('Failed to delete exercise');
        }
      } else {
        toast.success(`"${exName}" removed`);
      }
    });
  };

  // -------------------------------------------------------------------------
  // EXERCISE — add custom
  // -------------------------------------------------------------------------
  const handleAddExercise = useCallback((
    name: string,
    type: 'Compound' | 'Isolation',
    sets: Array<{ weight: number; reps: number }>
  ) => {
    const newBlock: ExerciseBlock = {
      name,
      type,
      sets: sets.map((s, idx) => ({
        id: `local-add-${Date.now()}-${idx}`,
        dbId: null,
        exerciseName: name,
        setNumber: idx + 1,
        targetWeight: s.weight,
        targetReps: s.reps,
        actualWeight: s.weight,
        actualReps: s.reps,
        isCompleted: false,
        isDropSet: false,
        isPersisted: false,
      })),
    };

    startSetTransition(async () => {
      dispatchOptimisticExerciseBlocks({ type: 'add', block: newBlock });
      setExerciseBlocks((prev) => [...prev, newBlock]);

      const res = await addExerciseToSession(splitData.name, { name, type, sets });
      if (res.success) {
        if (res.sessionId) setSessionId(res.sessionId);
        if (res.sets) {
          setExerciseBlocks((prev) =>
            prev.map((ex) => {
              if (ex.name !== name) return ex;
              return {
                ...ex,
                sets: ex.sets.map((s, idx) => {
                  const dbSet = res.sets?.[idx];
                  return dbSet ? { ...s, id: dbSet.id, dbId: dbSet.id, isPersisted: true } : s;
                }),
              };
            })
          );
        }
        toast.success(`"${name}" added!`);
      } else {
        toast.error('Exercise added locally — could not persist to DB');
      }
    });
  }, [splitData.name, dispatchOptimisticExerciseBlocks]);

  // -------------------------------------------------------------------------
  // FINISH SESSION — AI progression engine
  // -------------------------------------------------------------------------
  const handleFinishSession = () => {
    const allSets = exerciseBlocks.flatMap((ex) => ex.sets);
    const completed = allSets.filter((s) => s.isCompleted);
    const toAnalyze = completed.length > 0 ? completed : allSets;
    if (toAnalyze.length === 0) return;

    startAnalysisTransition(async () => {
      try {
        const payload = {
          splitName: splitData.name,
          sets: toAnalyze.map((s) => ({
            exercise: s.exerciseName,
            setNumber: s.setNumber,
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            actualWeight: typeof s.actualWeight === 'number' ? s.actualWeight : s.targetWeight,
            actualReps: typeof s.actualReps === 'number' ? s.actualReps : s.targetReps,
            isDropSet: s.isDropSet,
          })),
        };
        const result = await analyzeSessionProgression(payload);
        if (result.source === 'fallback') {
          toast.warning('AI check-in unavailable', { description: 'Using rule-based progressive overload targets.' });
        }
        setAiVerdict(result);
        setShowAiModal(true);
        setTargetsSaved(false);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: ['#06b6d4', '#10b981', '#a855f7', '#38bdf8'] });
      } catch (err) {
        console.error('Failed to analyze session:', err);
        toast.error('AI progression engine unavailable');
      }
    });
  };

  // Apply AI targets
  const handleApplyAITargets = () => {
    if (!aiVerdict) return;
    const updatedGhosts: Record<string, GhostTargetInfo> = { ...ghostTargets };
    aiVerdict.recommendations.forEach((rec) => {
      const prev = updatedGhosts[rec.exercise];
      updatedGhosts[rec.exercise] = {
        targetWeight: rec.nextWeight,
        targetReps: rec.nextReps,
        ghostWeight: prev ? prev.ghostWeight : rec.nextWeight,
        ghostReps: prev ? prev.ghostReps : rec.nextReps,
      };
    });
    setGhostTargets(updatedGhosts);
    saveCachedGhosts(splitData.slug, updatedGhosts);
    setTargetsSaved(true);
    toast.success('Targets saved!', { description: `Next session targets cached for ${splitData.name}.` });
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#10b981', '#06b6d4'] });
    setTimeout(() => setShowAiModal(false), 1800);
  };

  // Chart calcs
  const maxTonnage = Math.max(...tonnageHistory.map((h) => h.tonnage), 7000);
  const minTonnage = Math.min(...tonnageHistory.map((h) => h.tonnage), 3500);
  const firstTonnage = tonnageHistory[0]?.tonnage || 5000;
  const lastTonnage = tonnageHistory[tonnageHistory.length - 1]?.tonnage || 6000;
  const progressionDeltaPercent = Math.round(((lastTonnage - firstTonnage) / firstTonnage) * 100);
  const completedSetsTotal = exerciseBlocks.flatMap((e) => e.sets).filter((s) => s.isCompleted).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Split Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Active Routine Segment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{splitData.name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              {splitData.subtitle} · <span className="text-slate-300">{splitData.focus}</span>
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-950/60 border border-white/5 rounded-2xl p-3.5 px-5 self-start sm:self-auto">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Session Tonnage</p>
              <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">{sessionTonnage.toLocaleString()} <span className="text-xs font-bold text-emerald-500">KG</span></p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Completed Sets</p>
              <p className="text-2xl font-black text-white font-mono tracking-tight">{completedSetsTotal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rest Timer */}
      {restTimer > 0 && (
        <div className="sticky top-14 md:top-4 z-40 px-4 py-2.5 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_8px_30px_rgba(6,182,212,0.2)] animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse border border-cyan-500/30">
                <Timer size={20} />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Rest Timer · {activeRestExercise}</span>
                <span className="text-xl font-black text-white font-mono tracking-tight">{formatTimer(restTimer)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRestTimer((p) => p + 30)} className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 transition-colors">+30s</button>
              <button onClick={() => setRestTimer(0)} className="px-3.5 py-1.5 text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center gap-1.5">
                <FastForward size={14} />Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Week Tonnage Chart */}
      <section className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">4-Week Tonnage Progression</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Historical workload volume for <span className="text-cyan-300 font-semibold">{splitData.name}</span></p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 self-start sm:self-auto">
            <ArrowUpRight size={14} />+{progressionDeltaPercent}% Growth
          </span>
        </div>
        <div className="pt-2">
          {isHistoryLoading ? (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs gap-2">
              <Loader2 size={18} className="animate-spin text-cyan-400" />Loading tonnage analytics...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 sm:gap-4 items-end h-40 pt-4 px-2">
                {tonnageHistory.map((item, index) => {
                  const normalizedHeight = Math.max(20, Math.round(((item.tonnage - minTonnage * 0.7) / (maxTonnage - minTonnage * 0.7)) * 100));
                  const isLatest = index === tonnageHistory.length - 1;
                  return (
                    <div key={item.weekLabel} className="flex flex-col items-center h-full justify-end group">
                      <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-cyan-300 transition-colors mb-2">{item.tonnage.toLocaleString()} <span className="text-[9px]">kg</span></span>
                      <div className="w-full max-w-[56px] bg-slate-950/80 rounded-2xl p-1 border border-white/5 flex flex-col justify-end h-full">
                        <div style={{ height: `${normalizedHeight}%` }}
                          className={`w-full rounded-xl transition-all duration-700 ease-out ${isLatest ? 'bg-gradient-to-t from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-gradient-to-t from-slate-800 to-slate-700 group-hover:from-cyan-900 group-hover:to-cyan-600'}`} />
                      </div>
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-bold ${isLatest ? 'text-cyan-400' : 'text-slate-400'}`}>{item.weekLabel}</span>
                        <span className="text-[10px] text-slate-500 block">{item.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2 border-t border-white/5">
                <span>Baseline: {tonnageHistory[0]?.tonnage?.toLocaleString()} kg</span>
                <span className="text-cyan-400 font-semibold">Overload Target: {tonnageHistory[tonnageHistory.length - 1]?.tonnage?.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Exercise Blocks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Dumbbell size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">Exercise Prescriptions</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{optimisticExerciseBlocks.length} Exercises</span>
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500 hover:text-slate-950 transition-all"
            >
              <Plus size={14} />Add Exercise
            </button>
          </div>
        </div>

        {isBlocksLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin text-cyan-400" />Loading exercises...
          </div>
        ) : (
          optimisticExerciseBlocks.map((exercise) => {
            const ghost = ghostTargets[exercise.name];
            const ghostW = ghost?.ghostWeight ?? exercise.sets[0]?.targetWeight ?? 20;
            const ghostR = ghost?.ghostReps ?? exercise.sets[0]?.targetReps ?? 10;
            const isRenaming = renamingExercise === exercise.name;

            return (
              <div key={exercise.name} className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-5 sm:p-6 shadow-xl space-y-4">
                {/* Exercise Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(exercise.name); if (e.key === 'Escape') setRenamingExercise(null); }}
                          onBlur={() => commitRename(exercise.name)}
                          className="flex-1 bg-slate-950 border border-cyan-500 rounded-xl px-3 py-1.5 text-white font-bold text-base outline-none"
                        />
                        <button
                          onMouseDown={(e) => { e.preventDefault(); commitRename(exercise.name); }}
                          className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-500 hover:text-slate-950 transition-all"
                          title="Save title"
                        >
                          <Save size={15} />
                        </button>
                        <button
                          onMouseDown={(e) => { e.preventDefault(); setRenamingExercise(null); }}
                          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition-all"
                          title="Cancel"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startRename(exercise.name)} className="text-left group flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" title="Click to rename exercise">
                        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">{exercise.name}</h3>
                        <Pencil size={13} className="text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {exercise.type === 'Compound' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">COMPOUND</span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">DOUBLE PROGRESSION</span>
                    </div>
                  </div>

                  {/* Top-right card actions (Delete button & Menu) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeleteExercise(exercise.name)}
                      className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all border border-white/5"
                      title="Delete Exercise"
                      aria-label={`Delete ${exercise.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Ghost Benchmark */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/60 rounded-2xl border border-cyan-500/15 text-xs">
                  <div className="flex items-center gap-2 text-cyan-400/90 font-medium">
                    <Ghost size={15} className="text-cyan-400 animate-pulse" />
                    <span>Ghost Benchmark (Last Session):</span>
                  </div>
                  <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-white/5">{ghostW}kg × {ghostR} reps</span>
                </div>

                {/* Sets */}
                <div className="space-y-2.5">
                  {exercise.sets.map((set) => {
                    const actualR = typeof set.actualReps === 'number' ? set.actualReps : 0;
                    const isOverload = actualR > set.targetReps;

                    return (
                      <div key={set.id} className="space-y-1.5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Set number badge */}
                          <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all ${set.isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-slate-950 text-slate-400 border border-slate-800'}`}>
                            {set.setNumber}
                          </div>

                          {/* Target weight input */}
                          <div className="relative">
                            <input
                              type="number" step="0.5" placeholder="kg"
                              value={set.targetWeight}
                              onChange={(e) => handleUpdateInput(exercise.name, set.id, 'targetWeight', e.target.value === '' ? '' : Number(e.target.value))}
                              onBlur={() => handleSetBlurSave(exercise.name, set.id)}
                              className="w-16 sm:w-18 bg-slate-950/80 rounded-xl px-2 py-2.5 text-center font-bold text-xs border border-slate-700/60 text-slate-300 focus:border-cyan-500 focus:text-white outline-none font-mono"
                            />
                            <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold text-slate-500 bg-slate-900 px-1 rounded">TGT KG</span>
                          </div>

                          {/* Actual weight input */}
                          <div className="relative">
                            <input
                              type="number" step="0.5" placeholder="kg"
                              value={set.actualWeight}
                              onChange={(e) => handleUpdateInput(exercise.name, set.id, 'actualWeight', e.target.value === '' ? '' : Number(e.target.value))}
                              onBlur={() => handleSetBlurSave(exercise.name, set.id)}
                              className="w-16 sm:w-20 bg-slate-950 rounded-xl px-2 py-2.5 text-center font-bold text-xs sm:text-sm border border-slate-800 text-white focus:border-cyan-500 outline-none font-mono"
                            />
                            <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold text-slate-500 bg-slate-900 px-1 rounded">ACT KG</span>
                          </div>

                          {/* Actual reps input */}
                          <div className="relative">
                            <input
                              type="number" placeholder="Reps"
                              value={set.actualReps}
                              onChange={(e) => handleUpdateInput(exercise.name, set.id, 'actualReps', e.target.value === '' ? '' : Number(e.target.value))}
                              onBlur={() => handleSetBlurSave(exercise.name, set.id)}
                              className={`w-16 sm:w-20 bg-slate-950 rounded-xl px-2 py-2.5 text-center font-bold text-xs sm:text-sm border outline-none font-mono transition-all ${isOverload ? 'border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'border-slate-800 text-white focus:border-cyan-500'}`}
                            />
                            <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold text-slate-500 bg-slate-900 px-1 rounded">REPS</span>
                          </div>

                          {/* Drop set toggle button */}
                          <button
                            onClick={() => handleToggleDropSet(exercise.name, set.id)}
                            className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wider border transition-all shrink-0 ${
                              set.isDropSet
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                            }`}
                            title={set.isDropSet ? 'Drop Set active (failure set)' : 'Click to mark as Drop Set'}
                          >
                            DROP
                          </button>

                          {/* Complete button */}
                          <button
                            onClick={() => handleToggleSet(exercise.name, set.id, typeof set.targetWeight === 'number' ? set.targetWeight : 20, typeof set.targetReps === 'number' ? set.targetReps : 10)}
                            className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center transition-all ${set.isCompleted ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.4)]' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95'}`}
                          >
                            <Check size={16} className={set.isCompleted ? 'stroke-[3]' : ''} />
                          </button>

                          {/* Delete set */}
                          <button
                            onClick={() => handleDeleteSet(exercise.name, set.id)}
                            className="w-7 h-7 shrink-0 rounded-lg bg-slate-900 text-slate-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
                            title="Remove set"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {isOverload && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl animate-in fade-in duration-200">
                            <TrendingUp size={13} />
                            <span>Target exceeded (+{actualR - set.targetReps} reps)! AI Progression Engine will increment weight next session.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Set */}
                <button
                  onClick={() => handleAddSet(exercise.name)}
                  className="w-full py-2 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /><span>Add Set</span>
                </button>
              </div>
            );
          })
        )}

        {/* Global Add Exercise CTA (bottom) */}
        {!isBlocksLoading && (
          <button
            onClick={() => setShowAddExerciseModal(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
          >
            <Plus size={18} />Add Custom Exercise
          </button>
        )}
      </section>

      {/* Finish Session CTA */}
      <div className="pt-2">
        <button
          onClick={handleFinishSession}
          disabled={isAnalyzing}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-base tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <><Loader2 size={20} className="animate-spin" /><span>Analyzing Overload with Gemini...</span></>
          ) : (
            <><Sparkles size={20} /><span>Finish Session &amp; Run AI Progression Engine</span></>
          )}
        </button>
      </div>

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <AddExerciseModal
          onClose={() => setShowAddExerciseModal(false)}
          onAdd={handleAddExercise}
        />
      )}

      {/* AI Verdict Modal */}
      {showAiModal && aiVerdict && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0f1e]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Sparkles size={22} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">AI Coach Verdict</h3>
                  <p className="text-xs text-slate-400 font-medium">Double Progression Targets for Next Session</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/70 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Session Volume</span>
                <p className="text-lg font-black text-emerald-400 font-mono">{aiVerdict.totalTonnage.toLocaleString()} KG</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Engine Status</span>
                <p className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 size={15} /><span>Gemini 2.5 Flash</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Tailored Prescription &amp; Reasons</h4>
              {aiVerdict.recommendations.map((rec, index) => (
                <div key={index} className="bg-slate-950/60 border border-cyan-500/20 rounded-2xl p-4 space-y-2 shadow-lg hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{rec.exercise}</span>
                    <span className="text-xs font-extrabold text-cyan-300 font-mono bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      Next: {rec.nextWeight}kg × {rec.nextReps} reps
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-2.5 rounded-xl border border-white/5">"{rec.reason}"</p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              {!targetsSaved ? (
                <button onClick={handleApplyAITargets} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-sm shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2">
                  <Award size={18} /><span>Apply &amp; Save Targets as Ghost Data</span>
                </button>
              ) : (
                <div className="py-3 px-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check size={16} /><span>Targets Saved to PostgreSQL as Ghost Benchmarks!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
