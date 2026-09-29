'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveOnboardingGoal } from '@/app/actions/onboarding';
import { Activity, Target, Flame, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';

type Goal = 'bulk' | 'cut' | 'maintain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Sex = 'male' | 'female';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_LABELS: Record<Goal, { label: string; desc: string; color: string; bg: string; border: string }> = {
  bulk: {
    label: 'Bulk',
    desc: 'Build maximum muscle mass with a caloric surplus.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
  },
  cut: {
    label: 'Cut',
    desc: 'Shred body fat while preserving hard-earned muscle.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
  },
  maintain: {
    label: 'Maintain',
    desc: 'Stay at peak performance balanced and sustainable.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/40',
  },
};

const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; desc: string }[] = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little or no exercise.' },
  { id: 'light', label: 'Lightly Active', desc: '1-3 days/week of light exercise.' },
  { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week of moderate exercise.' },
  { id: 'active', label: 'Very Active', desc: '6-7 days/week of intense exercise.' },
  { id: 'very_active', label: 'Athlete', desc: 'Twice a day training / physical job.' },
];

function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activity: ActivityLevel
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

function calcMacros(tdee: number, goal: Goal) {
  const surplus = goal === 'bulk' ? 300 : goal === 'cut' ? -400 : 0;
  const calories = tdee + surplus;
  return {
    calories,
    proteinG: Math.round((calories * 0.35) / 4),
    carbsG: Math.round((calories * 0.40) / 4),
    fatG: Math.round((calories * 0.25) / 9),
  };
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i <= current
              ? 'bg-cyan-400 w-8 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
              : 'bg-slate-700 w-4'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState<number | ''>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [targetWeightKg, setTargetWeightKg] = useState<number | ''>('');
  const [goal, setGoal] = useState<Goal>('bulk');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const totalSteps = 4;

  const canProceed = (() => {
    if (step === 0) return sex && age && Number(age) > 10 && Number(age) < 100;
    if (step === 1) return heightCm && weightKg && Number(heightCm) > 100 && Number(weightKg) > 30;
    if (step === 2) return !!goal;
    if (step === 3) return !!activity;
    return false;
  })();

  const handleSubmit = () => {
    const w = Number(weightKg);
    const h = Number(heightCm);
    const a = Number(age);
    const tw = Number(targetWeightKg) || w;
    const tdee = calculateTDEE(w, h, a, sex, activity);
    const macros = calcMacros(tdee, goal);

    startTransition(async () => {
      try {
        await saveOnboardingGoal({
          currentWeightKg: w,
          targetWeightKg: tw,
          goal,
          activityLevel: activity,
          tdeeKcal: tdee,
          dailyCalTarget: macros.calories,
          dailyProteinTarget: macros.proteinG,
        });
        router.push('/');
      } catch (err) {
        console.error('Onboarding save failed:', err);
      }
    });
  };

  const inputClass =
    'w-full bg-slate-800/60 border border-white/8 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 transition-all';
  const labelClass = 'text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            ECLIPSE
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 tracking-widest uppercase">Set up your engine</p>
        </div>

        <StepIndicator current={step} total={totalSteps} />

        <div className="relative bg-slate-900/60 border border-white/8 rounded-2xl p-6 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]">

          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <p className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase mb-1">Step 1 of 4</p>
                <h2 className="text-xl font-bold text-white">Your Profile</h2>
                <p className="text-sm text-slate-400 mt-1">We will use this to calculate your precise metabolic rate.</p>
              </div>
              <div>
                <label className={labelClass}>Biological Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`py-3 rounded-xl border text-sm font-bold capitalize transition-all duration-200 ${
                        sex === s
                          ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 24"
                  min={10}
                  max={99}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <p className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase mb-1">Step 2 of 4</p>
                <h2 className="text-xl font-bold text-white">Body Metrics</h2>
                <p className="text-sm text-slate-400 mt-1">Mifflin-St Jeor needs these measurements.</p>
              </div>
              <div>
                <label className={labelClass}>Height (cm)</label>
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 178" min={100} max={250} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Current Weight (kg)</label>
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 82" min={30} max={300} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Target Weight (kg) <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input type="number" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 88" min={30} max={300} className={inputClass} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <p className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase mb-1">Step 3 of 4</p>
                <h2 className="text-xl font-bold text-white">Your Goal</h2>
                <p className="text-sm text-slate-400 mt-1">This determines your caloric surplus or deficit.</p>
              </div>
              <div className="space-y-3">
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => {
                  const meta = GOAL_LABELS[g];
                  const isSelected = goal === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected ? `${meta.bg} ${meta.border}` : 'bg-slate-800/40 border-white/5 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? meta.bg : 'bg-slate-700/60'}`}>
                        <Target size={18} className={isSelected ? meta.color : 'text-slate-500'} />
                      </div>
                      <div className="flex-1">
                        <span className={`block font-bold text-sm ${isSelected ? meta.color : 'text-slate-300'}`}>{meta.label}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{meta.desc}</span>
                      </div>
                      {isSelected && <CheckCircle2 size={18} className={`${meta.color} shrink-0`} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <p className="text-[11px] text-cyan-400 font-bold tracking-widest uppercase mb-1">Step 4 of 4</p>
                <h2 className="text-xl font-bold text-white">Activity Level</h2>
                <p className="text-sm text-slate-400 mt-1">Applied as your TDEE activity multiplier.</p>
              </div>
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map((opt) => {
                  const isSelected = activity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setActivity(opt.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                        isSelected ? 'bg-violet-500/10 border-violet-500/50' : 'bg-slate-800/40 border-white/5 hover:border-slate-600'
                      }`}
                    >
                      <Activity size={16} className={isSelected ? 'text-violet-400' : 'text-slate-600'} />
                      <div className="flex-1">
                        <span className={`block text-sm font-semibold ${isSelected ? 'text-violet-300' : 'text-slate-300'}`}>{opt.label}</span>
                        <span className="block text-xs text-slate-500">{opt.desc}</span>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="text-violet-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-3 rounded-xl border border-white/8 text-slate-400 text-sm font-semibold hover:border-slate-600 hover:text-white transition-all"
              >
                Back
              </button>
            )}
            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(6,182,212,0.4)] transition-all duration-200"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed || isPending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] transition-all duration-200"
              >
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Flame size={16} /> Launch Eclipse</>
                )}
              </button>
            )}
          </div>
        </div>

        {step >= 2 && weightKg && heightCm && age && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between">
            <span className="text-slate-500 text-xs font-medium">Estimated TDEE</span>
            <span className="font-black text-cyan-400 text-sm">
              {calculateTDEE(Number(weightKg), Number(heightCm), Number(age), sex, activity).toLocaleString()} kcal/day
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
