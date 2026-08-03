'use client';

import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, AlertCircle } from 'lucide-react';
import type { PipelineStep } from '@/types/extractor';

interface PipelineIndicatorProps {
  steps: PipelineStep[];
  compact?: boolean;
}

export function PipelineIndicator({ steps, compact = false }: PipelineIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', compact ? 'gap-0.5' : 'gap-2')}>
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              compact && 'px-2 py-0.5 text-[10px]',
              step.status === 'pending' && 'bg-muted text-muted-foreground',
              step.status === 'running' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
              step.status === 'completed' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
              step.status === 'failed' && 'bg-destructive/15 text-destructive'
            )}
          >
            {step.status === 'pending' && <Circle className="h-3 w-3" />}
            {step.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
            {step.status === 'completed' && <Check className="h-3 w-3" />}  
            {step.status === 'failed' && <AlertCircle className="h-3 w-3" />}
            <span className={compact ? 'text-[9px] font-semibold' : ''}>{compact ? step.label.charAt(0) : step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'h-px w-4 bg-border',
              compact && 'w-2'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

export function PipelineStepsDetail({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                step.status === 'pending' && 'border-muted-foreground/30 bg-background',
                step.status === 'running' && 'border-amber-500 bg-amber-500/10',
                step.status === 'completed' && 'border-emerald-500 bg-emerald-500/10',
                step.status === 'failed' && 'border-destructive bg-destructive/10'
              )}
            >
              {step.status === 'pending' && (
                <span className="text-xs text-muted-foreground">{i + 1}</span>
              )}
              {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
              {step.status === 'completed' && <Check className="h-4 w-4 text-emerald-500" />}
              {step.status === 'failed' && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-8 w-0.5',
                  step.status === 'completed' ? 'bg-emerald-500/50' : 'bg-border'
                )}
              />
            )}
          </div>
          <div className="pt-1">
            <p className="text-sm font-medium">{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
