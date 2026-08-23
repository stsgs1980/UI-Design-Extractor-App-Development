'use client';

import { useState } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Link2,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  Code2,
  FileCode,
  Globe,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { PipelineStepsDetail } from './pipeline-indicator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ViewportType, CodeFormat, PipelineStep } from '@/types/extractor';
import { PIPELINE_STEPS } from '@/types/extractor';

const VIEWPORT_OPTIONS: { value: ViewportType; label: string; icon: React.ElementType }[] = [
  { value: 'desktop', label: 'Desktop (1280px)', icon: Monitor },
  { value: 'tablet', label: 'Tablet (768px)', icon: Tablet },
  { value: 'mobile', label: 'Mobile (375px)', icon: Smartphone },
];

const FORMAT_OPTIONS: { value: CodeFormat; label: string }[] = [
  { value: 'html', label: 'HTML' },
  { value: 'react', label: 'React JSX' },
  { value: 'vue', label: 'Vue SFC' },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

/** Safely parse JSON from a response, handling non-JSON bodies (HTML error pages, etc.) */
async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text().catch(() => '');
    console.error('[extract] non-JSON response:', res.status, ct, text.slice(0, 200));
    throw new Error(`Server returned ${res.status} (${ct || 'unknown content type'}). The request may have timed out — try again.`);
  }
  return res.json();
}

/** Fetch with timeout using AbortController */
async function fetchWithTimeout(input: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs, ...fetchInit } = init;
  if (!timeoutMs) return fetch(input, fetchInit);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...fetchInit, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

export function ExtractView() {
  const { addProject, selectProject, setProcessing, isProcessing } = useExtractorStore();

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [componentQuery, setComponentQuery] = useState('');
  const [viewport, setViewport] = useState<ViewportType>('desktop');
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [runFullPipeline, setRunFullPipeline] = useState(true);
  const [currentSteps, setCurrentSteps] = useState<PipelineStep[]>(
    PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' }))
  );

  function updateStep(stepId: string, status: PipelineStep['status']) {
    setCurrentSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    const fullUrl = parsedUrl.href;
    const projectName = name.trim() || new URL(fullUrl).hostname;

    setProcessing(true);
    setCurrentSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' })));
    console.log('[extract] starting pipeline for:', fullUrl, '| fullPipeline:', runFullPipeline);

    try {
      updateStep('extract', 'running');
      console.log('[extract] step 1/4: creating project...');
      const createRes = await fetchWithTimeout('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, name: projectName, componentQuery: componentQuery || undefined, viewport }),
        timeoutMs: 30_000,
      });

      if (!createRes.ok) {
        const err = await safeJson(createRes);
        throw new Error((err.error as string) || 'Extraction failed');
      }

      const project = await safeJson(createRes);
      if (project.status === 'failed') {
        throw new Error((project.error as string) || 'Extraction failed');
      }
      console.log('[extract] project created:', (project as Record<string, string>).id, (project as Record<string, string>).name);

      addProject(project as Parameters<typeof addProject>[0]);
      updateStep('extract', 'completed');

      if (!runFullPipeline) {
        toast.success('Page extracted successfully');
        selectProject((project as Record<string, string>).id);
        return;
      }

      updateStep('analyze', 'running');
      console.log('[extract] step 2/4: analyzing...');
      const analyzeRes = await fetchWithTimeout(`/api/projects/${(project as Record<string, string>).id}/analyze`, {
        method: 'POST',
        timeoutMs: 120_000,
      });
      if (!analyzeRes.ok) {
        const err = await safeJson(analyzeRes);
        throw new Error((err.error as string) || 'Analysis failed');
      }
      await analyzeRes.json();
      updateStep('analyze', 'completed');
      console.log('[extract] step 2/4: analyze done');

      updateStep('spec', 'running');
      console.log('[extract] step 3/4: generating specs...');
      const specRes = await fetchWithTimeout(`/api/projects/${(project as Record<string, string>).id}/spec`, {
        method: 'POST',
        timeoutMs: 180_000,
      });
      if (!specRes.ok) {
        const err = await safeJson(specRes);
        throw new Error((err.error as string) || 'Spec generation failed');
      }
      console.log('[extract] step 3/4: spec done');
      updateStep('spec', 'completed');

      updateStep('generate', 'running');
      console.log('[extract] step 4/4: generating code...');
      const genRes = await fetchWithTimeout(`/api/projects/${(project as Record<string, string>).id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFormat }),
        timeoutMs: 180_000,
      });
      if (!genRes.ok) {
        const err = await safeJson(genRes);
        throw new Error((err.error as string) || 'Code generation failed');
      }
      updateStep('generate', 'completed');
      console.log('[extract] pipeline completed successfully');
      toast.success('Pipeline completed successfully');
      selectProject((project as Record<string, string>).id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[extract] pipeline FAILED:', message);
      toast.error(message);
      setCurrentSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' as const } : s))
      );
    } finally {
      setProcessing(false);
    }
  }

  const isRunning = currentSteps.some((s) => s.status === 'running');

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-semibold tracking-tight">New Extraction</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a URL to extract UI components, design tokens, and patterns.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
        {/* Form Card */}
        <motion.div variants={fadeUp}>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Extraction Configuration</h2>
                <p className="text-xs text-muted-foreground">Configure what to extract and how to process it.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-xs font-medium">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="url"
                    placeholder="https://ui.shadcn.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                    className="pl-10 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Project Name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="name"
                  placeholder="Auto-detected from URL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="component" className="text-xs font-medium">Component Filter <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="component"
                  placeholder="e.g. button, card, navbar, hero"
                  value={componentQuery}
                  onChange={(e) => setComponentQuery(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-[11px] text-muted-foreground">Focus extraction on specific component types.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Viewport</Label>
                  <Select value={viewport} onValueChange={(v) => setViewport(v as ViewportType)} disabled={isProcessing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEWPORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-3.5 w-3.5" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {runFullPipeline && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Output Format</Label>
                    <Select
                      value={codeFormat}
                      onValueChange={(v) => setCodeFormat(v as CodeFormat)}
                      disabled={isProcessing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              {opt.value === 'html' && <FileCode className="h-3.5 w-3.5" />}
                              {opt.value === 'react' && <Code2 className="h-3.5 w-3.5" />}
                              {opt.value === 'vue' && <FileCode className="h-3.5 w-3.5" />}
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Pipeline Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Full Pipeline</p>
                    <p className="text-xs text-muted-foreground">Extract, analyze, spec, and generate.</p>
                  </div>
                </div>
                <Switch
                  checked={runFullPipeline}
                  onCheckedChange={setRunFullPipeline}
                  disabled={isProcessing}
                />
              </div>

              {/* Submit */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={isProcessing ? 'loading' : 'idle'}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {runFullPipeline ? (
                          <Zap className="mr-2 h-4 w-4" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        {runFullPipeline ? 'Run Full Pipeline' : 'Extract Page'}
                      </>
                    )}
                  </Button>
                </motion.div>
              </AnimatePresence>
            </form>
          </div>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Pipeline Progress */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                isRunning ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-muted'
              )}>
                <Cpu className={cn('h-4 w-4', isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Pipeline Progress</h3>
                <p className="text-xs text-muted-foreground">Real-time step tracking</p>
              </div>
            </div>
            <PipelineStepsDetail steps={currentSteps} />
          </div>

          {/* Supported Sites */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Supported Sites</h3>
            <div className="flex flex-wrap gap-1.5">
              {['shadcn/ui', 'Vercel', 'Ant Design', 'Linear', 'Pinterest', 'GitHub', 'Stripe'].map((site) => (
                <Badge key={site} variant="secondary" className="text-[11px] font-normal">
                  {site}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Public sites work out of the box.</p>
          </div>

          {/* MCP Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">MCP Integration</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Connect to Cursor, Claude, or Windsurf via MCP server.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
