'use client';

import { useEffect, useState, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { STATUS_COLORS } from '@/types/extractor';
import type { ExtractedComponent, DesignToken, CodeFormat, PipelineStep, SpecData } from '@/types/extractor';
import { PIPELINE_STEPS } from '@/types/extractor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Code2,
  Palette,
  FileText,
  Play,
  RotateCcw,
  ArrowLeft,
  Eye,
  Type,
  MoveHorizontal,
  Square,
  Layers,
  CircleDot,
  Bookmark,
  Globe,
  HardDrive,
} from 'lucide-react';
import { PipelineIndicator, PipelineStepsDetail } from './pipeline-indicator';
import { toast } from 'sonner';
import { GlowCard } from '@/components/magic-ui/shimmer-border';
import { NumberTicker } from '@/components/magic-ui/number-ticker';
import { motion } from 'framer-motion';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('html', html);

const TOKEN_ICON_MAP: Record<string, React.ElementType> = {
  color: Palette,
  spacing: MoveHorizontal,
  typography: Type,
  'border-radius': Square,
  shadow: Layers,
  opacity: CircleDot,
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export function ProjectView() {
  const { selectedProjectId, currentProject, setCurrentProject, setView, addReference } = useExtractorStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedComponent, setSelectedComponent] = useState<ExtractedComponent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpecing, setIsSpecing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [refName, setRefName] = useState('');
  const [refTags, setRefTags] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentProject(data);
      }
    } catch {
      // silent
    }
  }, [selectedProjectId, setCurrentProject]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (!currentProject) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent"
          />
          <p className="mt-3 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const project = currentProject;
  const components = project.components || [];
  const tokens = project.tokens || [];

  const extractDone = !!project.rawHtml;
  const analyzeDone = components.length > 0;
  const specDone = components.some((c) => c.spec);
  const generateDone = components.some((c) => c.generatedCode);
  const stepDataDone = [extractDone, analyzeDone, specDone, generateDone];
  const stepOrder = ['extract', 'analyze', 'spec', 'generate'];
  const failedAtIndex = project.status === 'failed' ? stepDataDone.findIndex((done) => !done) : -1;

  const pipelineSteps: PipelineStep[] = PIPELINE_STEPS.map((step) => {
    let status: PipelineStep['status'] = 'pending';
    const stepIndex = stepOrder.indexOf(step.id);
    if (project.status === 'failed') {
      if (stepIndex < failedAtIndex) status = 'completed';
      else if (stepIndex === failedAtIndex) status = 'failed';
    } else if (stepDataDone[stepIndex]) {
      status = 'completed';
    } else if (
      (project.status === 'analyzing' && step.id === 'analyze') ||
      (project.status === 'speccing' && step.id === 'spec') ||
      (project.status === 'generating' && step.id === 'generate') ||
      (project.status === 'extracting' && step.id === 'extract')
    ) {
      status = 'running';
    } else if (project.status === 'completed') {
      status = 'completed';
    }
    return { ...step, status };
  });

  async function runAnalyze() {
    if (!selectedProjectId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Analysis failed');
      await fetchProject();
      toast.success('Analysis complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runSpec() {
    if (!selectedProjectId) return;
    setIsSpecing(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/spec`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Spec failed');
      await fetchProject();
      toast.success('Spec generation complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Spec failed');
    } finally {
      setIsSpecing(false);
    }
  }

  async function runGenerate() {
    if (!selectedProjectId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFormat }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
      await fetchProject();
      toast.success('Code generation complete');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  async function runFullPipeline() {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFormat }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Pipeline failed');
      await fetchProject();
      toast.success('Full pipeline completed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pipeline failed');
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveAsReference() {
    if (!selectedComponent || !refName.trim()) return;
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: refName,
          componentId: selectedComponent.id,
          html: selectedComponent.html,
          spec: selectedComponent.spec,
          tags: refTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addReference(data.reference);
        toast.success('Saved to references');
        setSaveDialogOpen(false);
        setRefName('');
        setRefTags('');
      }
    } catch {
      toast.error('Failed to save reference');
    }
  }

  function downloadCode(code: string, filename: string) {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tokenCategories = tokens.reduce<Record<string, DesignToken[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5 hover:bg-muted" onClick={() => setView('dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-emerald-400"
              >
                <Globe className="h-3 w-3" />
                {project.url}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PipelineIndicator steps={pipelineSteps} compact />
          {(project.status === 'extracting' || !project.rawHtml) && (
            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600" onClick={runFullPipeline} disabled={isAnalyzing || isSpecing || isGenerating}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Run Pipeline
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/30">
            <TabsTrigger value="overview" className="text-xs">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="components" className="text-xs">
              <Code2 className="mr-1.5 h-3.5 w-3.5" /> Components
              {components.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {components.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tokens" className="text-xs">
              <Palette className="mr-1.5 h-3.5 w-3.5" /> Tokens
              {tokens.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {tokens.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Code
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <GlowCard glowColor="emerald">
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5 text-emerald-400" /> Components
                  </div>
                  <NumberTicker value={components.length} className="mt-2 text-2xl font-bold" />
                </div>
              </GlowCard>
              <GlowCard glowColor="violet">
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Palette className="h-3.5 w-3.5 text-violet-400" /> Design Tokens
                  </div>
                  <NumberTicker value={tokens.length} className="mt-2 text-2xl font-bold" />
                </div>
              </GlowCard>
              <GlowCard glowColor="amber">
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <HardDrive className="h-3.5 w-3.5 text-amber-400" /> HTML Size
                  </div>
                  <p className="mt-2 text-2xl font-bold">
                    {project.rawHtml ? `${(project.rawHtml.length / 1024).toFixed(1)}` : '--'}
                    <span className="text-sm font-normal text-muted-foreground">KB</span>
                  </p>
                </div>
              </GlowCard>
            </div>

            <GlowCard>
              <div className="p-5">
                <h3 className="text-sm font-semibold">Pipeline Progress</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Steps in the extraction pipeline.</p>
                <div className="mt-4">
                  <PipelineStepsDetail steps={pipelineSteps} />
                </div>
              </div>
            </GlowCard>

            <div className="flex flex-wrap gap-2">
              {project.rawHtml && components.length === 0 && (
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600" onClick={runAnalyze} disabled={isAnalyzing}>
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
              <GlowCard>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Extracted HTML</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(project.rawHtml || '', 'raw-html')}
                    >
                      {copiedId === 'raw-html' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted/30 p-3">
                    <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-all">
                      {project.rawHtml.substring(0, 5000)}
                      {project.rawHtml.length > 5000 && '\n... (truncated)'}
                    </pre>
                  </div>
                </div>
              </GlowCard>
            )}

            {project.error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="mt-1 text-xs text-destructive/80">{project.error}</p>
              </div>
            )}
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="mt-6 space-y-4">
            {components.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed p-16">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50">
                    <Code2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No components extracted yet</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Run analysis to identify UI components.</p>
                  <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
                    Analyze
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-1 pr-3">
                    {components.map((comp) => (
                      <motion.button
                        key={comp.id}
                        onClick={() => setSelectedComponent(comp)}
                        whileHover={{ x: 2 }}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${
                          selectedComponent?.id === comp.id
                            ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                            : 'border-border bg-card/50 hover:bg-card hover:border-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{comp.name}</p>
                          {comp.tag && (
                            <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{comp.tag}</Badge>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {comp.spec && (
                            <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">Spec</span>
                          )}
                          {comp.generatedCode && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">Code</span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </ScrollArea>

                {selectedComponent ? (
                  <GlowCard glowColor="emerald">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-semibold">{selectedComponent.name}</h3>
                          {selectedComponent.tag && (
                            <p className="mt-0.5 text-xs text-muted-foreground">Element: &lt;{selectedComponent.tag}&gt;</p>
                          )}
                        </div>
                        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <Bookmark className="mr-1.5 h-3 w-3" /> Save
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save as Reference</DialogTitle>
                              <DialogDescription>Save this component to your reference library.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                              <div className="space-y-2">
                                <Label>Reference Name</Label>
                                <Input value={refName} onChange={(e) => setRefName(e.target.value)} placeholder={selectedComponent.name} />
                              </div>
                              <div className="space-y-2">
                                <Label>Tags (comma separated)</Label>
                                <Input value={refTags} onChange={(e) => setRefTags(e.target.value)} placeholder="button, primary, cta" />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                              <Button onClick={saveAsReference} disabled={!refName.trim()}>Save Reference</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="mt-5 space-y-5">
                        {selectedComponent.cssClasses && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">CSS Classes</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedComponent.cssClasses.split(' ').filter(Boolean).map((cls) => (
                                <Badge key={cls} variant="outline" className="text-[10px] font-mono">.{cls}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedComponent.inlineStyles && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Inline Styles</p>
                            <pre className="max-h-32 overflow-auto rounded-lg bg-muted/30 p-3 text-[11px] font-mono text-muted-foreground">
                              {selectedComponent.inlineStyles}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">HTML Structure</p>
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(selectedComponent.html, `comp-${selectedComponent.id}`)}>
                              {copiedId === `comp-${selectedComponent.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="max-h-48 overflow-auto rounded-lg bg-muted/30 p-3">
                            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                              {selectedComponent.html}
                            </pre>
                          </div>
                        </div>
                        {selectedComponent.spec && (
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Component Spec</p>
                            <SpecViewer specJson={selectedComponent.spec} />
                          </div>
                        )}
                        {selectedComponent.generatedCode && (
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Generated Code ({selectedComponent.codeFormat})
                              </p>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(selectedComponent.generatedCode || '', `gen-${selectedComponent.id}`)}>
                                  {copiedId === `gen-${selectedComponent.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => downloadCode(selectedComponent.generatedCode || '', `${selectedComponent.name}.${selectedComponent.codeFormat === 'react' ? 'tsx' : selectedComponent.codeFormat === 'vue' ? 'vue' : 'html'}`)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language="html"
                              style={atomOneDark}
                              customStyle={{ borderRadius: '8px', fontSize: '11px', margin: 0, maxHeight: '300px' }}
                            >
                              {selectedComponent.generatedCode}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlowCard>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
                    <p className="text-sm text-muted-foreground">Select a component to view details</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Design Tokens Tab */}
          <TabsContent value="tokens" className="mt-6 space-y-6">
            {tokens.length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed p-16">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50">
                    <Palette className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No design tokens extracted</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Run analysis to extract design tokens.</p>
                  <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
                    Extract Tokens
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Select value={codeFormat} onValueChange={(v) => setCodeFormat(v as CodeFormat)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="react">React JSX</SelectItem>
                      <SelectItem value="vue">Vue SFC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white" onClick={runGenerate} disabled={isGenerating} size="sm">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Generate Code
                  </Button>
                </div>
                {Object.entries(tokenCategories).map(([category, categoryTokens]) => {
                  const IconComp = TOKEN_ICON_MAP[category] || CircleDot;
                  return (
                    <GlowCard key={category}>
                      <div className="p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50">
                            <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <h3 className="text-sm font-semibold">
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </h3>
                          <Badge variant="secondary" className="text-[10px]">{categoryTokens.length}</Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryTokens.map((token) => (
                            <div
                              key={token.id}
                              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 p-2.5 transition-colors hover:bg-background/60"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">{token.name}</p>
                                {token.originalVar && (
                                  <p className="truncate text-[10px] text-muted-foreground font-mono">{token.originalVar}</p>
                                )}
                              </div>
                              <div className="ml-2 shrink-0 flex items-center gap-2">
                                {token.category === 'color' && (
                                  <div className="h-5 w-5 rounded-md border border-border" style={{ backgroundColor: token.value }} />
                                )}
                                <code className="text-[10px] font-mono text-muted-foreground">{token.value}</code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => copyToClipboard(token.value, `token-${token.id}`)}
                                >
                                  {copiedId === `token-${token.id}` ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlowCard>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Generated Code Tab */}
          <TabsContent value="code" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select value={codeFormat} onValueChange={(v) => setCodeFormat(v as CodeFormat)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="react">React JSX</SelectItem>
                    <SelectItem value="vue">Vue SFC</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white" onClick={runGenerate} disabled={isGenerating} size="sm">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allCode = components
                    .filter((c) => c.generatedCode)
                    .map((c) => `<!-- ${c.name} -->\n${c.generatedCode}`)
                    .join('\n\n');
                  if (allCode) downloadCode(allCode, `${project.name}-components.html`);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Download All
              </Button>
            </div>

            {components.filter((c) => c.generatedCode).length === 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-dashed p-16">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50">
                    <Code2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No generated code yet</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Complete the pipeline to generate reusable component code.</p>
                  <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white" size="sm" onClick={runFullPipeline}>
                    <Play className="mr-2 h-4 w-4" /> Run Full Pipeline
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {components
                  .filter((c) => c.generatedCode)
                  .map((comp) => (
                    <GlowCard key={comp.id}>
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">{comp.name}</h3>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(comp.generatedCode || '', `full-${comp.id}`)}>
                              {copiedId === `full-${comp.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                downloadCode(
                                  comp.generatedCode || '',
                                  `${comp.name}.${comp.codeFormat === 'react' ? 'tsx' : comp.codeFormat === 'vue' ? 'vue' : 'html'}`
                                )
                              }
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <SyntaxHighlighter
                            language={comp.codeFormat === 'react' ? 'jsx' : comp.codeFormat === 'vue' ? 'xml' : 'html'}
                            style={atomOneDark}
                            customStyle={{ borderRadius: '8px', fontSize: '11px', margin: 0, maxHeight: '400px' }}
                          >
                            {comp.generatedCode || ''}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    </GlowCard>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

function SpecViewer({ specJson }: { specJson: string }) {
  const spec: SpecData | null = (() => {
    try {
      return JSON.parse(specJson);
    } catch {
      return null;
    }
  })();

  if (!spec) {
    return (
      <pre className="max-h-32 overflow-auto rounded-lg bg-muted/30 p-3 text-[11px] font-mono text-muted-foreground">
        {specJson}
      </pre>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-4 space-y-3">
      {spec.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{spec.description}</p>
      )}
      {spec.props && spec.props.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Props</p>
          <div className="space-y-1.5">
            {spec.props.map((prop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">{prop.name}</code>
                <span className="text-muted-foreground">{prop.type}</span>
                {prop.default && (
                  <span className="text-muted-foreground">= {prop.default}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {spec.variants && spec.variants.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Variants</p>
          <div className="flex flex-wrap gap-1">
            {spec.variants.map((v, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
            ))}
          </div>
        </div>
      )}
      {spec.accessibility && spec.accessibility.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accessibility</p>
          <ul className="space-y-0.5">
            {spec.accessibility.map((a, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">- {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
