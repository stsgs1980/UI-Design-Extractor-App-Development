'use client';

import { useState } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { GradientText } from '@/components/magic-ui/gradient-text';
import { GlowCard } from '@/components/magic-ui/shimmer-border';

import { motion, AnimatePresence } from 'framer-motion';
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
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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

    try {
      updateStep('extract', 'running');
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl, name: projectName, componentQuery: componentQuery || undefined, viewport }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || 'Extraction failed');
      }

      const project = await createRes.json();
      if (project.status === 'failed') {
        throw new Error(project.error || 'Extraction failed');
      }

      addProject(project);
      updateStep('extract', 'completed');

      if (!runFullPipeline) {
        toast.success('Page extracted successfully');
        selectProject(project.id);
        setProcessing(false);
        return;
      }

      updateStep('analyze', 'running');
      const analyzeRes = await fetch(`/api/projects/${project.id}/analyze`, { method: 'POST' });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || 'Analysis failed');
      }
      await analyzeRes.json();
      updateStep('analyze', 'completed');

      updateStep('spec', 'running');
      const specRes = await fetch(`/api/projects/${project.id}/spec`, { method: 'POST' });
      if (!specRes.ok) {
        const err = await specRes.json();
        throw new Error(err.error || 'Spec generation failed');
      }
      updateStep('spec', 'completed');

      updateStep('generate', 'running');
      const genRes = await fetch(`/api/projects/${project.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFormat }),
      });
      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'Code generation failed');
      }
      updateStep('generate', 'completed');
      toast.success('Pipeline completed successfully');
      selectProject(project.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
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
        <h1 className="text-2xl font-bold tracking-tight">
          <GradientText>New Extraction</GradientText>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a URL to extract UI components, design tokens, and patterns.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* Form */}
        <motion.div variants={fadeUp}>
          <GlowCard glowColor="emerald">
            <div className="p-6">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/20">
                  <Globe className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Extraction Configuration</h2>
                  <p className="text-[11px] text-muted-foreground">Configure what to extract and how to process it.</p>
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
                  <Label htmlFor="name" className="text-xs font-medium">Project Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Auto-detected from URL"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="component" className="text-xs font-medium">Component Filter (optional)</Label>
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
                <motion.div
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4"
                  whileTap={{ scale: 0.995 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                      <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Full Pipeline</p>
                      <p className="text-[11px] text-muted-foreground">Extract, analyze, spec, and generate.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRunFullPipeline(!runFullPipeline)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      runFullPipeline ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  >
                    <motion.span
                      className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
                      animate={{ x: runFullPipeline ? 22 : 4 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </motion.div>

                {/* Submit */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isProcessing ? 'loading' : 'idle'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="submit"
                      className={`w-full text-white ${
                        runFullPipeline
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600'
                          : ''
                      }`}
                      disabled={isProcessing}
                      size="lg"
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
          </GlowCard>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Pipeline Progress */}
          <GlowCard glowColor={isRunning ? 'emerald' : undefined}>
            <div className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-colors',
                  isRunning ? 'bg-emerald-500/10 ring-emerald-500/20' : 'bg-muted ring-border'
                )}>
                  <Cpu className={cn('h-4 w-4', isRunning ? 'text-emerald-400' : 'text-muted-foreground')} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Pipeline Progress</h3>
                  <p className="text-[11px] text-muted-foreground">Real-time step tracking</p>
                </div>
              </div>
              <PipelineStepsDetail steps={currentSteps} />
            </div>
          </GlowCard>

          {/* Supported Sites */}
          <GlowCard>
            <div className="p-5">
              <h3 className="mb-3 text-sm font-semibold">Supported Sites</h3>
              <div className="flex flex-wrap gap-1.5">
                {['shadcn/ui', 'Vercel', 'Ant Design', 'Linear', 'Pinterest', 'GitHub', 'Stripe'].map((site) => (
                  <Badge key={site} variant="secondary" className="text-[10px] font-medium">
                    {site}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Public sites work out of the box.</p>
            </div>
          </GlowCard>

          {/* MCP Card */}
          <GlowCard glowColor="emerald">
            <div className="relative overflow-hidden p-5">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">MCP Integration</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Connect to Cursor, Claude, or Windsurf via MCP server.
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
