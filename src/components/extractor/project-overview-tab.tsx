'use client';

import type { Project, ExtractedComponent, DesignToken, PipelineStep } from '@/types/extractor';
import { Button } from '@/components/ui/button';
import { PipelineStepsDetail } from './pipeline-indicator';
import { Loader2, Code2, Palette, HardDrive, FileText, Play, RotateCcw, Copy, Check } from 'lucide-react';

interface Props {
  project: Project;
  components: ExtractedComponent[];
  tokens: DesignToken[];
  pipelineSteps: PipelineStep[];
  isAnalyzing: boolean;
  isSpecing: boolean;
  isGenerating: boolean;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  runAnalyze: () => void;
  runSpec: () => void;
  runGenerate: () => void;
  runFullPipeline: () => void;
}

export function OverviewTab({
  project, components, tokens, pipelineSteps,
  isAnalyzing, isSpecing, isGenerating, copiedId, copyToClipboard,
  runAnalyze, runSpec, runGenerate, runFullPipeline,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">Components</span>
          </div>
          <span className="mt-3 block text-2xl font-semibold">{components.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <Palette className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">Design Tokens</span>
          </div>
          <span className="mt-3 block text-2xl font-semibold">{tokens.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <HardDrive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground">HTML Size</span>
          </div>
          <span className="mt-3 block text-2xl font-semibold">
            {project.rawHtml ? `${(project.rawHtml.length / 1024).toFixed(1)}` : '--'}
            <span className="text-sm font-normal text-muted-foreground"> KB</span>
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Pipeline Progress</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Steps in the extraction pipeline.</p>
        <div className="mt-4"><PipelineStepsDetail steps={pipelineSteps} /></div>
      </div>

      <div className="flex flex-wrap gap-2">
        {project.rawHtml && components.length === 0 && (
          <Button onClick={runAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
            Analyze Components
          </Button>
        )}
        {components.length > 0 && !components.some((c) => c.spec) && (
          <Button onClick={runSpec} disabled={isSpecing} variant="secondary">
            {isSpecing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Generate Specs
          </Button>
        )}
        {components.some((c) => c.spec) && !components.some((c) => c.generatedCode) && (
          <Button onClick={runGenerate} disabled={isGenerating} variant="secondary">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Generate Code
          </Button>
        )}
        {components.some((c) => c.generatedCode) && (
          <Button onClick={runFullPipeline} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Re-run Pipeline
          </Button>
        )}
      </div>

      {project.rawHtml && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Extracted HTML</h3>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(project.rawHtml || '', 'raw-html')}>
              {copiedId === 'raw-html' ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted p-3">
            <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-all">
              {project.rawHtml.substring(0, 5000)}
              {project.rawHtml.length > 5000 && '\n... (truncated)'}
            </pre>
          </div>
        </div>
      )}

      {project.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="mt-1 text-xs text-destructive/80">{project.error}</p>
        </div>
      )}
    </div>
  );
}
