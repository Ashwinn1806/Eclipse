'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-[#040812]/85 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 shadow-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-end">
        {/* Sign Out Button */}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-xs font-semibold text-slate-400 hover:text-red-400 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-red-500/30 transition-all"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

