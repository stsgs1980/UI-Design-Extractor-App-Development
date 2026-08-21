'use client';

import { cn } from '@/lib/utils';

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 12, className }: MeteorsProps) {
  const meteors = Array.from({ length: number }, (_, i) => i);

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {meteors.map((i) => (
        <span
          key={i}
          className="absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-emerald-400 shadow-[0_0_0_1px_#ffffff10]"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}
