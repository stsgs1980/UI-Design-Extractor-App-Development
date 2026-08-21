'use client';

import { cn } from '@/lib/utils';

export function ShimmerBorder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative group', className)}>
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/40 to-cyan-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-sm" />
      <div className="relative rounded-xl border border-border bg-card transition-colors group-hover:border-emerald-500/30">
        {children}
      </div>
    </div>
  );
}

export function GlowCard({
  children,
  className,
  glowColor = 'emerald',
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/20 via-teal-500/30 to-cyan-500/20',
    violet: 'from-violet-500/20 via-purple-500/30 to-fuchsia-500/20',
    amber: 'from-amber-500/20 via-orange-500/30 to-yellow-500/20',
    rose: 'from-rose-500/20 via-pink-500/30 to-red-500/20',
  };

  return (
    <div className={cn('relative group', className)}>
      <div className={cn('absolute -inset-[1px] rounded-xl bg-gradient-to-r opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-sm', colorMap[glowColor] || colorMap.emerald)} />
      <div className="relative h-full rounded-xl border border-border bg-card/80 backdrop-blur-sm transition-colors group-hover:border-border/80">
        {children}
      </div>
    </div>
  );
}
