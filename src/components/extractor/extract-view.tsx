'use client';

import { useState } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ArrowRight,
  Code2,
  FileCode,
  Settings2,
} from 'lucide-react';
import { PipelineStepsDetail } from './pipeline-indicator';
import { toast } from 'sonner';
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

export function ExtractView() {
  const { addProject, selectProject, setProcessing, isProcessing } =
    useExtractorStore();

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
    setCurrentSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
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
      // Step 1: Extract
      updateStep('extract', 'running');
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullUrl,
          name: projectName,
          componentQuery: componentQuery || undefined,
          viewport,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        const msg = err.error || 'Extraction failed';
        throw new Error(msg);
      }

      const project = await createRes.json();

      // Double-check: backend may return 200 with failed status
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

      // Step 2: Analyze
      updateStep('analyze', 'running');
      const analyzeRes = await fetch(`/api/projects/${project.id}/analyze`, {
        method: 'POST',
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || 'Analysis failed');
      }

      await analyzeRes.json();
      updateStep('analyze', 'completed');

      // Step 3: Spec
      updateStep('spec', 'running');
      const specRes = await fetch(`/api/projects/${project.id}/spec`, {
        method: 'POST',
      });

      if (!specRes.ok) {
        const err = await specRes.json();
        throw new Error(err.error || 'Spec generation failed');
      }

      updateStep('spec', 'completed');

      // Step 4: Generate
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
      // Mark current running step as failed
      setCurrentSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' as const } : s))
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Extraction</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter a URL to extract UI components, design tokens, and patterns.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        {/* Form */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Extraction Configuration</CardTitle>
            </div>
            <CardDescription>Configure what to extract and how to process it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  placeholder="https://ui.shadcn.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isProcessing}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Auto-detected from URL"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="component">Component Filter (optional)</Label>
                <Input
                  id="component"
                  placeholder="e.g. button, card, navbar, hero"
                  value={componentQuery}
                  onChange={(e) => setComponentQuery(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-[11px] text-muted-foreground">
                  Focus extraction on specific component types.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Viewport</Label>
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
                    <Label>Output Format</Label>
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

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Full Pipeline</p>
                    <p className="text-[11px] text-muted-foreground">Extract, analyze, spec, and generate in one step.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRunFullPipeline(!runFullPipeline)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    runFullPipeline ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      runFullPipeline ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing} size="lg">
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
            </form>
          </CardContent>
        </Card>

        {/* Pipeline Progress Sidebar */}
        <div className="space-y-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Pipeline Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <PipelineStepsDetail steps={currentSteps} />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Supported Sites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {['shadcn/ui', 'Vercel', 'Ant Design', 'Linear', 'Pinterest', 'GitHub', 'Stripe'].map(
                  (site) => (
                    <Badge key={site} variant="secondary" className="text-[10px]">
                      {site}
                    </Badge>
                  )
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Public sites work out of the box. Auth-required sites show login walls.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">MCP Integration</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Connect to Cursor, Claude, or Windsurf via MCP server for AI agent integration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
