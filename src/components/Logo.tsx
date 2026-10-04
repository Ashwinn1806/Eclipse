'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell } from 'lucide-react';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', showSubtitle = true, size = 'md' }: LogoProps) {
  const iconBoxSize = size === 'lg' ? 'w-12 h-12 rounded-2xl' : size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-9 h-9 rounded-xl';
  const iconSize = size === 'lg' ? 26 : size === 'sm' ? 15 : 20;
  const titleSize = size === 'lg' ? 'text-2xl font-black' : size === 'sm' ? 'text-sm font-black' : 'text-base font-black';

  return (
    <Link href="/" className={`flex items-center gap-3 group ${className}`}>
      <div className={`${iconBoxSize} bg-gradient-to-br from-cyan-500 via-teal-400 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform`}>
        <Dumbbell size={iconSize} className="text-slate-950 fill-slate-950 stroke-[2.5]" />
      </div>
      <div>
        <h1 className={`${titleSize} tracking-wider text-white uppercase flex items-center gap-1.5`}>
          ECLIPSE
        </h1>
        {showSubtitle && (
          <p className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">
            PROGRESSION ENGINE
          </p>
        )}
      </div>
    </Link>
  );
}
