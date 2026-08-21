'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PipelineStep } from '@/types/extractor';

interface PipelineIndicatorProps {
  steps: PipelineStep[];
  compact?: boolean;
}

export function PipelineIndicator({ steps, compact = false }: PipelineIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', compact ? 'gap-0.5' : 'gap-2')}>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300',
              compact && 'px-2 py-0.5 text-[10px]',
              step.status === 'pending' && 'bg-muted/50 text-muted-foreground',
              step.status === 'running' && 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20',
              step.status === 'completed' && 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20',
              step.status === 'failed' && 'bg-destructive/15 text-destructive ring-1 ring-destructive/20'
            )}
          >
            {step.status === 'pending' && <Circle className="h-3 w-3" />}
            {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.status === 'completed' && <Check className="h-3 w-3" />}
            {step.status === 'failed' && <AlertCircle className="h-3 w-3" />}
            <span className={compact ? 'text-[9px] font-semibold' : ''}>{compact ? step.label.charAt(0) : step.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelineStepsDetail({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const isCompleted = step.status === 'completed';
        const isRunning = step.status === 'running';
        const isFailed = step.status === 'failed';

        return (
          <div key={step.id} className="relative flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30">
            {/* Status Icon */}
            <motion.div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
                step.status === 'pending' && 'border-muted-foreground/20 bg-muted/30',
                isRunning && 'border-amber-500/50 bg-amber-500/10 shadow-sm shadow-amber-500/10',
                isCompleted && 'border-emerald-500/50 bg-emerald-500/10',
                isFailed && 'border-destructive/50 bg-destructive/10'
              )}
              animate={isRunning ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {step.status === 'pending' && <span className="text-[10px] font-medium text-muted-foreground">{i + 1}</span>}
              {isRunning && <Loader2 className="h-3.5 w-3.5 text-amber-400" />}
              {isCompleted && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              {isFailed && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
            </motion.div>

            {/* Label + Description */}
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-xs font-medium transition-colors',
                isRunning ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : isFailed ? 'text-destructive' : ''
              )}>
                {step.label}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
            </div>

            {/* Status Badge */}
            {isRunning && (
              <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400">
                RUNNING
              </span>
            )}
            {isCompleted && (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                DONE
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
