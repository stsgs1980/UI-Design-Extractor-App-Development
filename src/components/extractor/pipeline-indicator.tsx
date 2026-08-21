'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PipelineStep } from '@/types/extractor';

export function PipelineIndicator({ steps, compact = false }: { steps: PipelineStep[]; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-1', compact ? 'gap-0.5' : 'gap-2')}>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              compact && 'px-1.5 py-0.5 text-[10px]',
              step.status === 'pending' && 'bg-muted text-muted-foreground',
              step.status === 'running' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              step.status === 'completed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              step.status === 'failed' && 'bg-destructive/10 text-destructive'
            )}
          >
            {step.status === 'pending' && <Circle className="h-3 w-3" />}
            {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.status === 'completed' && <Check className="h-3 w-3" />}
            {step.status === 'failed' && <AlertCircle className="h-3 w-3" />}
            <span>{compact ? step.label.charAt(0) : step.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelineStepsDetail({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-0.5">
      {steps.map((step, i) => {
        const isRunning = step.status === 'running';
        const isCompleted = step.status === 'completed';
        const isFailed = step.status === 'failed';

        return (
          <div key={step.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
            <motion.div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                step.status === 'pending' && 'border-border bg-muted',
                isRunning && 'border-amber-500/40 bg-amber-500/10',
                isCompleted && 'border-emerald-500/40 bg-emerald-500/10',
                isFailed && 'border-destructive/40 bg-destructive/10'
              )}
              animate={isRunning ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {step.status === 'pending' && <span className="text-[10px] font-medium text-muted-foreground">{i + 1}</span>}
              {isRunning && <Loader2 className="h-3 w-3 text-amber-500 dark:text-amber-400" />}
              {isCompleted && <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />}
              {isFailed && <AlertCircle className="h-3 w-3 text-destructive" />}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-xs font-medium',
                isRunning && 'text-amber-600 dark:text-amber-400',
                isCompleted && 'text-emerald-600 dark:text-emerald-400',
                isFailed && 'text-destructive'
              )}>
                {step.label}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{step.description}</p>
            </div>
            {isRunning && (
              <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Running
              </span>
            )}
            {isCompleted && (
              <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Done
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
