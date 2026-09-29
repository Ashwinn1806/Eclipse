'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { 
  Dumbbell, 
  Flame, 
  Zap, 
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
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  USER_SPLITS, 
  getSplitBySlug, 
  ExerciseTemplate 
} from '@/lib/splits';
import { 
  analyzeSessionProgression, 
  getSplitTonnageHistory, 
  getSplitGhostData,
  AIProgressionTarget 
} from '@/app/actions/aiWorkout';

interface ActiveSetState {
  id: string;
  exerciseName: string;
  setNumber: number;
  targetWeight: number;
  targetReps: number;
  actualWeight: number | '';
  actualReps: number | '';
  isCompleted: boolean;
}

interface GhostTargetInfo {
  targetWeight: number;
  targetReps: number;
  ghostWeight: number;
  ghostReps: number;
}

export default function SplitWorkoutPage() {
  const params = useParams();
  const rawSplit = params?.split as string | undefined;
  const splitData = getSplitBySlug(rawSplit || 'push');

  // 4-Week Tonnage History State
  const [tonnageHistory, setTonnageHistory] = useState<
    Array<{ weekLabel: string; date: string; tonnage: number }>
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Exercise sets state
  const [exerciseSets, setExerciseSets] = useState<Record<string, ActiveSetState[]>>({});
  const [ghostTargets, setGhostTargets] = useState<Record<string, GhostTargetInfo>>({});

  // Session stats
  const [sessionTonnage, setSessionTonnage] = useState(0);

  // Auto-Rest Timer State
  const [restTimer, setRestTimer] = useState<number>(0);
  const [activeRestExercise, setActiveRestExercise] = useState<string>('');

  // AI Verdict Modal State
  const [isAnalyzing, startAnalysisTransition] = useTransition();
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<{
    recommendations: AIProgressionTarget[];
    totalTonnage: number;
    source: 'ai' | 'fallback';
  } | null>(null);
  const [targetsSaved, setTargetsSaved] = useState(false);

  // Initialize Split Data, Ghost Targets, and 4-Week Tonnage Chart
  useEffect(() => {
    let isMounted = true;

    async function loadSplitContext() {
      setIsHistoryLoading(true);

      try {
        // Fetch 4-week tonnage history from Server Action
        const history = await getSplitTonnageHistory(splitData.name);
        if (isMounted) setTonnageHistory(history);
      } catch (err) {
        console.warn('Failed to fetch tonnage history:', err);
      } finally {
        if (isMounted) setIsHistoryLoading(false);
      }

      // Fetch Ghost benchmark data from Server Action
      try {
        const ghosts = await getSplitGhostData(splitData.name);
        if (isMounted) setGhostTargets(ghosts);

        // Build active sets based on exercises and ghost targets
        const initialSets: Record<string, ActiveSetState[]> = {};
        splitData.exercises.forEach((ex) => {
          const ghostInfo = ghosts[ex.name];
          const initialTargetWeight = ghostInfo ? ghostInfo.targetWeight : ex.targetWeight;
          const initialTargetReps = ghostInfo ? ghostInfo.targetReps : ex.targetReps;

          initialSets[ex.id] = Array.from({ length: ex.defaultSets }, (_, idx) => ({
            id: `${ex.id}-set-${idx + 1}`,
            exerciseName: ex.name,
            setNumber: idx + 1,
            targetWeight: initialTargetWeight,
            targetReps: initialTargetReps,
            actualWeight: initialTargetWeight,
            actualReps: initialTargetReps,
            isCompleted: false,
          }));
        });

        if (isMounted) setExerciseSets(initialSets);
      } catch (err) {
        console.warn('Failed to load ghost data:', err);
      }
    }

    loadSplitContext();

    return () => {
      isMounted = false;
    };
  }, [splitData.name, splitData.slug]);

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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Set Completion
  const handleToggleSet = (exerciseId: string, setId: string, restSecs: number) => {
    setExerciseSets((prev) => {
      const currentSets = prev[exerciseId] || [];
      const updated = currentSets.map((s) => {
        if (s.id !== setId) return s;
        const willComplete = !s.isCompleted;

        const weight = typeof s.actualWeight === 'number' ? s.actualWeight : s.targetWeight;
        const reps = typeof s.actualReps === 'number' ? s.actualReps : s.targetReps;

        if (willComplete) {
          setSessionTonnage((t) => t + weight * reps);
          setRestTimer(restSecs);
          setActiveRestExercise(s.exerciseName);
        } else {
          setSessionTonnage((t) => Math.max(0, t - weight * reps));
        }

        return { ...s, isCompleted: willComplete };
      });

      return { ...prev, [exerciseId]: updated };
    });
  };

  // Update Set Inputs
  const handleUpdateInput = (
    exerciseId: string,
    setId: string,
    field: 'actualWeight' | 'actualReps',
    value: number | ''
  ) => {
    setExerciseSets((prev) => {
      const currentSets = prev[exerciseId] || [];
      const updated = currentSets.map((s) => {
        if (s.id !== setId) return s;
        return { ...s, [field]: value };
      });
      return { ...prev, [exerciseId]: updated };
    });
  };

  // Add extra set
  const handleAddSet = (exercise: ExerciseTemplate) => {
    setExerciseSets((prev) => {
      const currentSets = prev[exercise.id] || [];
      const lastSet = currentSets[currentSets.length - 1];
      const newSetNum = currentSets.length + 1;

      const newSet: ActiveSetState = {
        id: `${exercise.id}-set-${newSetNum}`,
        exerciseName: exercise.name,
        setNumber: newSetNum,
        targetWeight: lastSet ? (typeof lastSet.actualWeight === 'number' ? lastSet.actualWeight : lastSet.targetWeight) : exercise.targetWeight,
        targetReps: lastSet ? (typeof lastSet.actualReps === 'number' ? lastSet.actualReps : lastSet.targetReps) : exercise.targetReps,
        actualWeight: lastSet ? (typeof lastSet.actualWeight === 'number' ? lastSet.actualWeight : lastSet.targetWeight) : exercise.targetWeight,
        actualReps: lastSet ? (typeof lastSet.actualReps === 'number' ? lastSet.actualReps : lastSet.targetReps) : exercise.targetReps,
        isCompleted: false,
      };

      return {
        ...prev,
        [exercise.id]: [...currentSets, newSet],
      };
    });
  };

  // Finish Session & Execute AI Progression Engine
  const handleFinishSession = () => {
    // Collect all sets (prefer completed, or all recorded)
    const allSets: ActiveSetState[] = Object.values(exerciseSets).flat();
    const completedSets = allSets.filter((s) => s.isCompleted);
    const setsToAnalyze = completedSets.length > 0 ? completedSets : allSets;

    if (setsToAnalyze.length === 0) return;

    startAnalysisTransition(async () => {
      try {
        const payload = {
          splitName: splitData.name,
          sets: setsToAnalyze.map((s) => ({
            exercise: s.exerciseName,
            setNumber: s.setNumber,
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            actualWeight: typeof s.actualWeight === 'number' ? s.actualWeight : s.targetWeight,
            actualReps: typeof s.actualReps === 'number' ? s.actualReps : s.targetReps,
          })),
        };

        const result = await analyzeSessionProgression(payload);

        setAiVerdict(result);
        setShowAiModal(true);
        setTargetsSaved(false);

        // Confetti celebration
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#06b6d4', '#10b981', '#a855f7', '#38bdf8'],
        });
      } catch (err) {
        console.error('Failed to analyze session progression:', err);
      }
    });
  };

  // Apply & Save new AI targets to client state
  const handleApplyAITargets = () => {
    if (!aiVerdict) return;

    // Update ghost targets in local memory so they appear right away
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
    setTargetsSaved(true);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10b981', '#06b6d4'],
    });

    // Auto-dismiss after 1.8 seconds
    setTimeout(() => {
      setShowAiModal(false);
    }, 1800);
  };

  // Calculate 4-week chart visual values
  const maxTonnage = Math.max(...tonnageHistory.map((h) => h.tonnage), 7000);
  const minTonnage = Math.min(...tonnageHistory.map((h) => h.tonnage), 3500);
  const firstTonnage = tonnageHistory[0]?.tonnage || 5000;
  const lastTonnage = tonnageHistory[tonnageHistory.length - 1]?.tonnage || 6000;
  const progressionDeltaPercent = Math.round(((lastTonnage - firstTonnage) / firstTonnage) * 100);

  const completedSetsTotal = Object.values(exerciseSets)
    .flat()
    .filter((s) => s.isCompleted).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Split Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Active Routine Segment
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {splitData.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              {splitData.subtitle} · <span className="text-slate-300">{splitData.focus}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 border border-white/5 rounded-2xl p-3.5 px-5 self-start sm:self-auto">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Session Tonnage</p>
              <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {sessionTonnage.toLocaleString()} <span className="text-xs font-bold text-emerald-500">KG</span>
              </p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Completed Sets</p>
              <p className="text-2xl font-black text-white font-mono tracking-tight">
                {completedSetsTotal}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Rest Timer Floating Sticky Banner */}
      {restTimer > 0 && (
        <div className="sticky top-14 md:top-4 z-40 px-4 py-2.5 bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_8px_30px_rgba(6,182,212,0.2)] animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse border border-cyan-500/30">
                <Timer size={20} />
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Rest Timer · {activeRestExercise}
                </span>
                <span className="text-xl font-black text-white font-mono tracking-tight">
                  {formatTimer(restTimer)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestTimer((prev) => prev + 30)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-200 rounded-xl hover:bg-slate-700 transition-colors"
              >
                +30s
              </button>
              <button
                onClick={() => setRestTimer(0)}
                className="px-3.5 py-1.5 text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center gap-1.5"
              >
                <FastForward size={14} />
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Week Tonnage History Summary Chart */}
      <section className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                4-Week Tonnage Progression
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical workload volume for <span className="text-cyan-300 font-semibold">{splitData.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ArrowUpRight size={14} />
              +{progressionDeltaPercent}% Growth
            </span>
          </div>
        </div>

        {/* SVG Tonnage Chart */}
        <div className="pt-2">
          {isHistoryLoading ? (
            <div className="h-44 flex items-center justify-center text-slate-500 text-xs gap-2">
              <Loader2 size={18} className="animate-spin text-cyan-400" />
              Loading 4-week tonnage analytics...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Responsive Bar & Wave Chart */}
              <div className="grid grid-cols-4 gap-2 sm:gap-4 items-end h-40 pt-4 px-2">
                {tonnageHistory.map((item, index) => {
                  const normalizedHeight = Math.max(
                    20,
                    Math.round(((item.tonnage - minTonnage * 0.7) / (maxTonnage - minTonnage * 0.7)) * 100)
                  );
                  const isLatest = index === tonnageHistory.length - 1;

                  return (
                    <div key={item.weekLabel} className="flex flex-col items-center h-full justify-end group">
                      {/* Tooltip on hover */}
                      <span className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-cyan-300 transition-colors mb-2">
                        {item.tonnage.toLocaleString()} <span className="text-[9px]">kg</span>
                      </span>

                      {/* Bar with gradient */}
                      <div className="w-full max-w-[56px] bg-slate-950/80 rounded-2xl p-1 border border-white/5 flex flex-col justify-end h-full">
                        <div
                          style={{ height: `${normalizedHeight}%` }}
                          className={`w-full rounded-xl transition-all duration-700 ease-out ${
                            isLatest
                              ? 'bg-gradient-to-t from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                              : 'bg-gradient-to-t from-slate-800 to-slate-700 group-hover:from-cyan-900 group-hover:to-cyan-600'
                          }`}
                        />
                      </div>

                      {/* Week label */}
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-bold ${isLatest ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {item.weekLabel}
                        </span>
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

      {/* Routine Exercise Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Dumbbell size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">Exercise Prescriptions & Ghosting</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {splitData.exercises.length} Exercises
          </span>
        </div>

        {splitData.exercises.map((exercise) => {
          const sets = exerciseSets[exercise.id] || [];
          const ghost = ghostTargets[exercise.name];
          const activeGhostWeight = ghost?.ghostWeight ?? exercise.targetWeight;
          const activeGhostReps = ghost?.ghostReps ?? exercise.targetReps;
          const prescribedTargetWeight = ghost?.targetWeight ?? exercise.targetWeight;
          const prescribedTargetReps = ghost?.targetReps ?? exercise.targetReps;

          return (
            <div
              key={exercise.id}
              className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-5 sm:p-6 shadow-xl space-y-4"
            >
              {/* Exercise Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{exercise.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{exercise.category}</p>
                </div>

                <div className="flex items-center gap-2">
                  {exercise.isCompound && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      COMPOUND
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    DOUBLE PROGRESSION
                  </span>
                </div>
              </div>

              {/* Ghost Benchmark UI Header */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/60 rounded-2xl border border-cyan-500/15 text-xs">
                <div className="flex items-center gap-2 text-cyan-400/90 font-medium">
                  <Ghost size={15} className="text-cyan-400 animate-pulse" />
                  <span>Ghost Benchmark (Last Session):</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-white/5">
                    {activeGhostWeight}kg × {activeGhostReps} reps
                  </span>
                </div>
              </div>

              {/* Set Rows */}
              <div className="space-y-2.5">
                {sets.map((set) => {
                  const actualR = typeof set.actualReps === 'number' ? set.actualReps : 0;
                  const isOverload = actualR > set.targetReps;

                  return (
                    <div key={set.id} className="space-y-1.5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* Set badge */}
                        <div
                          className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all ${
                            set.isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {set.setNumber}
                        </div>

                        {/* Prescribed Target Pill */}
                        <div className="flex-1 bg-slate-950/70 rounded-xl flex items-center justify-between px-3.5 py-2.5 border border-slate-800/80">
                          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                            Target
                          </span>
                          <span className="text-slate-200 font-bold text-xs sm:text-sm font-mono">
                            {set.targetWeight} kg × {set.targetReps}
                          </span>
                        </div>

                        {/* Actual Weight Input */}
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            placeholder="kg"
                            value={set.actualWeight}
                            onChange={(e) =>
                              handleUpdateInput(
                                exercise.id,
                                set.id,
                                'actualWeight',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="w-16 sm:w-20 bg-slate-950 rounded-xl px-2 py-2.5 text-center font-bold text-xs sm:text-sm border border-slate-800 text-white focus:border-cyan-500 outline-none font-mono"
                          />
                          <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold text-slate-500 bg-slate-900 px-1 rounded">
                            KG
                          </span>
                        </div>

                        {/* Actual Reps Input */}
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Reps"
                            value={set.actualReps}
                            onChange={(e) =>
                              handleUpdateInput(
                                exercise.id,
                                set.id,
                                'actualReps',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className={`w-16 sm:w-20 bg-slate-950 rounded-xl px-2 py-2.5 text-center font-bold text-xs sm:text-sm border outline-none font-mono transition-all ${
                              isOverload
                                ? 'border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                : 'border-slate-800 text-white focus:border-cyan-500'
                            }`}
                          />
                          <span className="absolute -top-1.5 right-1.5 text-[8px] font-bold text-slate-500 bg-slate-900 px-1 rounded">
                            REPS
                          </span>
                        </div>

                        {/* Log Button */}
                        <button
                          onClick={() => handleToggleSet(exercise.id, set.id, exercise.restSeconds)}
                          className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-all ${
                            set.isCompleted
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95'
                          }`}
                          title="Complete Set & Start Rest Timer"
                        >
                          <Check size={18} className={set.isCompleted ? 'stroke-[3]' : ''} />
                        </button>
                      </div>

                      {/* Double Progression Feedback Note */}
                      {isOverload && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl animate-in fade-in duration-200">
                          <TrendingUp size={13} />
                          <span>
                            Target exceeded (+{actualR - set.targetReps} reps)! AI Progression Engine will increment weight next workout.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Set Button */}
              <div className="pt-1">
                <button
                  onClick={() => handleAddSet(exercise)}
                  className="w-full py-2 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Set</span>
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Finish Session CTA */}
      <div className="pt-2">
        <button
          onClick={handleFinishSession}
          disabled={isAnalyzing}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-base tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Analyzing Overload with Gemini 2.5 Flash...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Finish Session & Run AI Progression Engine</span>
            </>
          )}
        </button>
      </div>

      {/* Step 3: Glassmorphic AI Verdict Modal */}
      {showAiModal && aiVerdict && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#0a0f1e]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.25)] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1.5px] shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Sparkles size={22} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">AI Coach Verdict</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Double Progression Targets for Next Session
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Session Stats Highlight */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/70 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Session Volume</span>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  {aiVerdict.totalTonnage.toLocaleString()} KG
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Engine Status</span>
                <p className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 size={15} />
                  <span>Gemini 2.5 Flash</span>
                </p>
              </div>
            </div>

            {/* AI Prescribed Recommendations List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Tailored Prescription & Reasons
              </h4>

              {aiVerdict.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-slate-950/60 border border-cyan-500/20 rounded-2xl p-4 space-y-2 shadow-lg hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{rec.exercise}</span>
                    <span className="text-xs font-extrabold text-cyan-300 font-mono bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                      Next: {rec.nextWeight}kg × {rec.nextReps} reps
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    "{rec.reason}"
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="pt-2">
              {!targetsSaved ? (
                <button
                  onClick={handleApplyAITargets}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-sm shadow-[0_0_24px_rgba(6,182,212,0.4)] hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Award size={18} />
                  <span>Apply & Save Targets as Ghost Data</span>
                </button>
              ) : (
                <div className="py-3 px-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                  <Check size={16} />
                  <span>Targets Saved to PostgreSQL as Ghost Benchmarks!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
