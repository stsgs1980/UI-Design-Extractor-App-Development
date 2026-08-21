'use client';

import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
  animate?: boolean;
}

export function GradientText({
  children,
  className,
  from = 'from-emerald-400',
  via = 'via-teal-400',
  to = 'to-cyan-400',
  animate = false,
}: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        from,
        via,
        to,
        animate && 'animate-gradient bg-[length:200%_auto] bg-gradient-to-r',
        className
      )}
    >
      {children}
    </span>
  );
}
