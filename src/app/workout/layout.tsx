'use client';

import React, { useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Dumbbell, 
  Flame, 
  Zap, 
  Activity, 
  Shield, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Sparkles, 
  Home, 
  Utensils,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { USER_SPLITS } from '@/lib/splits';
import { deleteAndReindexSplit, reorderSplit, createNewSplit } from '@/app/actions';

const ICONS_MAP = {
  dumbbell: Dumbbell,
  flame: Flame,
  zap: Zap,
  activity: Activity,
  shield: Shield,
};

export default function WorkoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeleteSplit = (splitId: string) => {
    if (!confirm('Are you sure you want to delete this split? Remaining splits will re-index sequentially.')) return;
    startDeleteTransition(async () => {
      const res = await deleteAndReindexSplit(splitId);
      router.refresh();
      if (res?.success) {
        toast.success('Split deleted and re-indexed sequentially');
        const isCurrentActive = pathname === `/workout/${splitId}` || pathname.includes(splitId);
        if (isCurrentActive) {
          const remaining = res.splits || USER_SPLITS;
          const firstAvailableSlug = remaining[0]?.slug || 'push';
          router.push(`/workout/${firstAvailableSlug}`);
        }
      } else {
        toast.error('Failed to delete split');
      }
    });
  };

  const handleReorderSplit = (splitId: string, direction: 'up' | 'down') => {
    startDeleteTransition(async () => {
      const res = await reorderSplit(splitId, direction);
      router.refresh();
      if (res?.success) {
        toast.success(`Split shifted ${direction}`);
      }
    });
  };

  const handleCreateNewSplit = () => {
    startDeleteTransition(async () => {
      const res = await createNewSplit();
      router.refresh();
      if (res?.success) {
        toast.success(`Created ${res.newSplit?.name || 'New Session'}!`);
        if (res.newSplit?.slug) {
          router.push(`/workout/${res.newSplit.slug}`);
        }
      } else {
        toast.error('Failed to create new split');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Desktop Sidebar (Master View) */}
      <aside className="hidden md:flex flex-col w-72 lg:w-80 shrink-0 border-r border-white/5 bg-[#030816]/90 backdrop-blur-2xl p-6 sticky top-0 h-screen justify-between z-30">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <Link href="/" className="group flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-400 p-[1.5px] shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Dumbbell size={20} className="text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  ECLIPSE
                </h1>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Progression Engine</p>
              </div>
            </Link>
          </div>

          {/* Quick Dashboard Switch */}
          <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-white/5 text-xs">
            <Link 
              href="/" 
              className="flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all font-semibold"
            >
              <Home size={14} />
              <span>Dashboard</span>
            </Link>
            <div className="flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
              <Dumbbell size={14} />
              <span>Splits</span>
            </div>
          </div>

          {/* Splits Master Navigation */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Custom Splits</span>
              <span className="text-[10px] font-bold text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                {USER_SPLITS.length} Active
              </span>
            </div>

            <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar pr-1">
              {USER_SPLITS.map((split) => {
                const IconComponent = ICONS_MAP[split.iconName] || Dumbbell;
                const isActive = pathname === `/workout/${split.slug}`;

                return (
                  <Link
                    key={split.slug}
                    href={`/workout/${split.slug}`}
                    className={`group relative flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border ${
                      isActive
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.18)] translate-x-1'
                        : 'bg-slate-950/40 border-white/5 hover:border-slate-700/80 hover:bg-slate-900/50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute -left-[1px] top-3 bottom-3 w-1 bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                    )}

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                          isActive
                            ? 'bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:border-slate-700'
                        }`}
                      >
                        <IconComponent size={18} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                            {split.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{split.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReorderSplit(split.slug, 'up');
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                          title="Shift Up"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReorderSplit(split.slug, 'down');
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                          title="Shift Down"
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteSplit(split.slug);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete & Re-index Split"
                          aria-label={`Delete ${split.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`transition-all ${
                          isActive
                            ? 'text-cyan-400 translate-x-0.5'
                            : 'text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5'
                        }`}
                      />
                    </div>
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={handleCreateNewSplit}
              disabled={isDeleting}
              className="w-full mt-3 py-2.5 px-3 shrink-0 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-dashed border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] active:scale-98 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              <span>+ Add Session</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer info */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="bg-gradient-to-br from-purple-950/40 to-slate-900/40 border border-purple-500/20 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
              <Sparkles size={14} className="animate-pulse" />
              <span>AI Progression Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Target overload calculated automatically with Gemini 2.5 Flash upon session finish.
            </p>
          </div>

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Utensils size={14} />
            <span>Return to Macros & Logs</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area (Detail View) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Sticky Header & Swipeable Pill Menu */}
        <header className="md:hidden sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px]">
                <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                  <Dumbbell size={14} className="text-cyan-400" />
                </div>
              </div>
              <span className="font-black text-base tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                ECLIPSE
              </span>
            </Link>

            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-white bg-slate-900/80 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors"
            >
              <Home size={12} />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Swipeable Horizontal Pill Menu */}
          <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2 touch-pan-x">
            {USER_SPLITS.map((split) => {
              const IconComponent = ICONS_MAP[split.iconName] || Dumbbell;
              const isActive = pathname === `/workout/${split.slug}`;

              return (
                <Link
                  key={split.slug}
                  href={`/workout/${split.slug}`}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/25 via-teal-500/20 to-emerald-500/25 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]'
                      : 'bg-slate-900/70 text-slate-400 border-white/5 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <IconComponent size={14} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                  <span>{split.shortName}</span>
                </Link>
              );
            })}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 pb-32">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#020617]/95 backdrop-blur-xl border-t border-white/5 px-6 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-around items-center z-40">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-200 transition-all group"
          >
            <Home size={22} className="stroke-2 group-hover:scale-105 transition-all" />
            <span className="text-[10px] font-bold tracking-wider">DASHBOARD</span>
          </Link>
          <Link
            href="/workout/push"
            className="flex flex-col items-center gap-1 text-cyan-400 scale-105 transition-all"
          >
            <Dumbbell size={22} className="stroke-[2.5]" />
            <span className="text-[10px] font-bold tracking-wider">FULL HUB</span>
          </Link>
          <Link
            href="/?tab=nutrition"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-amber-400 transition-all group"
          >
            <Utensils size={22} className="stroke-2 group-hover:scale-105 transition-all" />
            <span className="text-[10px] font-bold tracking-wider">MACROS</span>
          </Link>
          <Link
            href="/?tab=ai"
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-purple-400 transition-all group"
          >
            <Sparkles size={22} className="stroke-2 group-hover:scale-105 transition-all" />
            <span className="text-[10px] font-bold tracking-wider">ENGINE</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
