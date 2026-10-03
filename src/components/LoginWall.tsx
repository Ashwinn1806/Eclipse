'use client';

import { signIn } from 'next-auth/react';
import { Sparkles, Shield, TrendingUp, Zap } from 'lucide-react';

const features = [
  { icon: TrendingUp, label: 'AI Progression Engine', desc: 'Gemini prescribes your next session weight and reps.' },
  { icon: Zap, label: 'Auto-Rest Timer', desc: 'Optimised rest intervals triggered on every logged set.' },
  { icon: Shield, label: 'Ghost Benchmarks', desc: 'Beat your last performance with live ghosting overlays.' },
];

export default function LoginWall() {
  const handleDevBypass = () => {
    document.cookie = 'eclipse_dev_bypass=true; path=/; max-age=2592000';
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-15%] w-[600px] h-[600px] bg-cyan-600/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[130px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 mb-2 mx-auto shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <Sparkles size={28} className="text-cyan-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            ECLIPSE
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Data-Driven Progression.<br />
            <span className="text-slate-500">Your AI-powered gym &amp; nutrition engine.</span>
          </p>
        </div>

        {/* Feature pills */}
        <div className="space-y-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/6 backdrop-blur-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_24px_rgba(255,255,255,0.12)]"
          >
            {/* Google SVG logo */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={handleDevBypass}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold text-sm hover:bg-cyan-500 hover:text-slate-950 active:scale-[0.98] transition-all duration-150 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
          >
            🚀 Local Dev Bypass (Skip Login)
          </button>

          <p className="text-center text-[11px] text-slate-600 leading-relaxed">
            By signing in you agree to our terms of service.<br />
            Your data is private and never sold.
          </p>
        </div>
      </div>
    </div>
  );
}
