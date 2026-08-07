'use client';

import { useEffect, useState, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { STATUS_COLORS, TOKEN_CATEGORY_ICONS } from '@/types/extractor';
import type { ExtractedComponent, DesignToken, CodeFormat, PipelineStep, SpecData, TokenCategory } from '@/types/extractor';
import { PIPELINE_STEPS } from '@/types/extractor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Copy,
  Check,
  X,
  Download,
  Star,
  ExternalLink,
  Code2,
  Palette,
  FileText,
  FileCode2,
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
  Terminal,
} from 'lucide-react';
import { PipelineIndicator, PipelineStepsDetail } from './pipeline-indicator';
import { toast } from 'sonner';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('html', html);

const TOKEN_ICON_MAP: Record<string, React.ElementType> = {
  Palette,
  MoveHorizontal,
  Type,
  Square,
  Layers,
  CircleDot,
};

export function ProjectView() {
  const { selectedProjectId, currentProject, setCurrentProject, setView, addReference, sidebarOpen } = useExtractorStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedComponent, setSelectedComponent] = useState<ExtractedComponent | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpecing, setIsSpecing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [compDetailTab, setCompDetailTab] = useState('preview');
  const [pipelineLogs, setPipelineLogs] = useState<Array<{ts: string; level: string; step: string; message: string; component?: string}> | null>(null);

  // Reset component detail tab when switching components
  useEffect(() => {
    setCompDetailTab('preview');
  }, [selectedComponent?.id]);

  // Load persisted logs from project data
  useEffect(() => {
    if (currentProject?.pipelineLogs) {
      try {
        setPipelineLogs(JSON.parse(currentProject.pipelineLogs));
      } catch { /* ignore */ }
    } else {
      setPipelineLogs(null);
    }
  }, [currentProject?.pipelineLogs]);
  const [refName, setRefName] = useState('');
  const [refTags, setRefTags] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
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
      // ignore
    }
  }, [selectedProjectId, setCurrentProject]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (!currentProject) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const project = currentProject;
  const components = project.components || [];
  const tokens = project.tokens || [];

  // Pipeline step completion based on actual data presence
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
      if (stepIndex < failedAtIndex) {
        status = 'completed';
      } else if (stepIndex === failedAtIndex) {
        status = 'failed';
      }
    } else if (stepDataDone[stepIndex]) {
      status = 'completed';
    } else if (
      (project.status === 'extracting' && step.id === 'extract') ||
      (project.status === 'analyzing' && step.id === 'analyze') ||
      (project.status === 'speccing' && step.id === 'spec') ||
      (project.status === 'generating' && step.id === 'generate')
    ) {
      status = 'running';
    } else if (isPipelineRunning && !stepDataDone[stepIndex]) {
      // When pipeline is running client-side, show next incomplete step as running
      const allPrevDone = stepDataDone.slice(0, stepIndex).every(Boolean);
      if (allPrevDone) status = 'running';
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
    setIsPipelineRunning(true);
    setPipelineLogs(null);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeFormat }),
      });
      const data = await res.json();
      
      // Store logs from response
      if (data._logs) setPipelineLogs(data._logs);

      if (res.status === 207) {
        // Partial success
        await fetchProject();
        const errCount = data._logs?.filter((l: {level: string}) => l.level === 'error').length || 0;
        toast.warning(`Pipeline partially completed (${errCount} error${errCount !== 1 ? 's' : ''})`);
      } else if (!res.ok) {
        throw new Error(data.error || 'Pipeline failed');
      } else {
        await fetchProject();
        toast.success('Full pipeline completed');
      }
    } catch (err) {
      await fetchProject();
      toast.error(err instanceof Error ? err.message : 'Pipeline failed');
    } finally {
      setIsPipelineRunning(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5"
            onClick={() => setView('dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {project.url}
                <ExternalLink className="ml-0.5 inline h-3 w-3" />
              </a>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PipelineIndicator steps={pipelineSteps} compact />
          {!['completed', 'generating', 'speccing', 'analyzing', 'extracting'].includes(project.status) && (
            <Button size="sm" onClick={runFullPipeline} disabled={isPipelineRunning}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Run Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
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
            <Palette className="mr-1.5 h-3.5 w-3.5" /> Design Tokens
            {tokens.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {tokens.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="code" className="text-xs">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Generated Code
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code2 className="h-4 w-4" /> Components
                </div>
                <p className="mt-1 text-2xl font-bold">{components.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Palette className="h-4 w-4" /> Design Tokens
                </div>
                <p className="mt-1 text-2xl font-bold">{tokens.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" /> HTML Size
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {project.rawHtml ? `${(project.rawHtml.length / 1024).toFixed(1)}KB` : '--'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Steps Detail */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pipeline Progress</CardTitle>
              <CardDescription>Steps completed in the extraction pipeline.</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineStepsDetail steps={pipelineSteps} />
            </CardContent>
          </Card>

          {/* Action Buttons */}
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

          {/* Raw HTML Preview */}
          {project.rawHtml && (
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Extracted HTML</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(project.rawHtml || '', 'raw-html')}
                  >
                    {copiedId === 'raw-html' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3">
                  <pre className="text-[11px] leading-relaxed text-muted-foreground font-mono whitespace-pre-wrap break-all">
                    {project.rawHtml.substring(0, 5000)}
                    {project.rawHtml.length > 5000 && '\n... (truncated)'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {project.error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="mt-1 text-xs text-destructive/80">{project.error}</p>
              </CardContent>
            </Card>
          )}

          {/* Pipeline Logs */}
          {pipelineLogs && pipelineLogs.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm"><Terminal className="mr-1.5 inline h-3.5 w-3.5" />Pipeline Log</CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setPipelineLogs(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-72">
                  <div className="space-y-0.5">
                    {pipelineLogs.map((entry, i) => {
                      const time = new Date(entry.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const colorClass = entry.level === 'error'
                        ? 'text-destructive'
                        : entry.level === 'warn'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : entry.level === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground';
                      return (
                        <div key={i} className="flex items-start gap-2 py-0.5 font-mono text-[11px]">
                          <span className="shrink-0 text-muted-foreground/60">{time}</span>
                          <span className={`shrink-0 w-12 uppercase font-semibold ${colorClass}`}>{entry.step}</span>
                          <span className={colorClass}>{entry.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4 mt-6">
          {components.length === 0 ? (
            <Card className="border-dashed bg-card/30">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Code2 className="h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">No components extracted yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run analysis to identify UI components from the page.
                </p>
                <Button className="mt-4" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
                  Analyze Components
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-1 pr-3">
                  {components.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => setSelectedComponent(comp)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedComponent?.id === comp.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card/50 hover:bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{comp.name}</p>
                        {comp.tag && (
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                            {comp.tag}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {comp.spec && (
                          <Badge variant="secondary" className="text-[10px]">Spec</Badge>
                        )}
                        {comp.generatedCode && (
                          <Badge variant="secondary" className="text-[10px]">Code</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {selectedComponent ? (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{selectedComponent.name}</CardTitle>
                        {selectedComponent.tag && (
                          <CardDescription className="mt-0.5">Element: &lt;{selectedComponent.tag}&gt;</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save as Reference</DialogTitle>
                              <DialogDescription>
                                Save this component to your reference library for later use.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                              <div className="space-y-2">
                                <Label>Reference Name</Label>
                                <Input
                                  value={refName}
                                  onChange={(e) => setRefName(e.target.value)}
                                  placeholder={selectedComponent.name}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Tags (comma separated)</Label>
                                <Input
                                  value={refTags}
                                  onChange={(e) => setRefTags(e.target.value)}
                                  placeholder="button, primary, cta"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                              <Button onClick={saveAsReference} disabled={!refName.trim()}>Save Reference</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Tabs value={compDetailTab} onValueChange={setCompDetailTab}>
                      <TabsList className="w-full justify-start h-8 p-0 bg-muted/50">
                        <TabsTrigger value="preview" className="h-7 text-xs px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                          <Eye className="mr-1.5 h-3 w-3" /> Preview
                        </TabsTrigger>
                        <TabsTrigger value="html" className="h-7 text-xs px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                          <Code2 className="mr-1.5 h-3 w-3" /> HTML
                        </TabsTrigger>
                        {selectedComponent.spec && (
                          <TabsTrigger value="spec" className="h-7 text-xs px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                            <FileText className="mr-1.5 h-3 w-3" /> Spec
                          </TabsTrigger>
                        )}
                        {selectedComponent.generatedCode && (
                          <TabsTrigger value="code" className="h-7 text-xs px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                            <FileCode2 className="mr-1.5 h-3 w-3" /> Code
                          </TabsTrigger>
                        )}
                      </TabsList>

                      {/* Preview Tab */}
                      <TabsContent value="preview" className="mt-3">
                        <div className="rounded-lg border bg-white overflow-hidden">
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30">
                            <div className="h-2 w-2 rounded-full bg-red-400" />
                            <div className="h-2 w-2 rounded-full bg-yellow-400" />
                            <div className="h-2 w-2 rounded-full bg-green-400" />
                          </div>
                          <iframe
                            srcDoc={selectedComponent.html}
                            className="w-full h-64 border-0"
                            sandbox="allow-same-origin"
                            title={`${selectedComponent.name} preview`}
                          />
                        </div>
                      </TabsContent>

                      {/* HTML Tab */}
                      <TabsContent value="html" className="mt-3 space-y-3">
                        {selectedComponent.cssClasses && (
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">CSS Classes</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedComponent.cssClasses.split(' ').filter(Boolean).map((cls) => (
                                <Badge key={cls} variant="outline" className="text-[10px] font-mono">.{cls}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedComponent.inlineStyles && (
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Inline Styles</p>
                            <pre className="max-h-32 overflow-auto rounded-lg bg-muted/50 p-2 text-[11px] font-mono text-muted-foreground">
                              {selectedComponent.inlineStyles}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">HTML Structure</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => copyToClipboard(selectedComponent.html, `comp-${selectedComponent.id}`)}
                            >
                              {copiedId === `comp-${selectedComponent.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3">
                            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                              {selectedComponent.html}
                            </pre>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Spec Tab */}
                      {selectedComponent.spec && (
                        <TabsContent value="spec" className="mt-3">
                          <SpecViewer specJson={selectedComponent.spec} />
                        </TabsContent>
                      )}

                      {/* Code Tab */}
                      {selectedComponent.generatedCode && (
                        <TabsContent value="code" className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">
                              Generated Code ({selectedComponent.codeFormat})
                            </p>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => copyToClipboard(selectedComponent.generatedCode || '', `gen-${selectedComponent.id}`)}
                              >
                                {copiedId === `gen-${selectedComponent.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
                            customStyle={{
                              borderRadius: '8px',
                              fontSize: '11px',
                              margin: 0,
                              maxHeight: '300px',
                            }}
                          >
                            {selectedComponent.generatedCode}
                          </SyntaxHighlighter>
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">Select a component to view details</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Design Tokens Tab */}
        <TabsContent value="tokens" className="space-y-6 mt-6">
          {tokens.length === 0 ? (
            <Card className="border-dashed bg-card/30">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Palette className="h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">No design tokens extracted</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Run analysis to extract design tokens from the page.
                </p>
                <Button className="mt-4" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
                  Extract Tokens
                </Button>
              </CardContent>
            </Card>
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
                <Button onClick={runGenerate} disabled={isGenerating} size="sm">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Generate Code
                </Button>
              </div>
              {Object.entries(tokenCategories).map(([category, categoryTokens]) => {
                const IconComp = TOKEN_ICON_MAP[category] || CircleDot;
                return (
                  <Card key={category} className="bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <IconComp className="h-4 w-4" />
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                        <Badge variant="secondary" className="text-[10px]">{categoryTokens.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryTokens.map((token) => (
                          <div
                            key={token.id}
                            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{token.name}</p>
                              {token.originalVar && (
                                <p className="truncate text-[10px] text-muted-foreground font-mono">{token.originalVar}</p>
                              )}
                            </div>
                            <div className="ml-2 shrink-0 flex items-center gap-2">
                              {token.category === 'color' && (
                                <div
                                  className="h-5 w-5 rounded-md border border-border"
                                  style={{ backgroundColor: token.value }}
                                />
                              )}
                              <code className="text-[10px] font-mono text-muted-foreground">{token.value}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => copyToClipboard(token.value, `token-${token.id}`)}
                              >
                                {copiedId === `token-${token.id}` ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Generated Code Tab */}
        <TabsContent value="code" className="space-y-4 mt-6">
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
              <Button onClick={runGenerate} disabled={isGenerating} size="sm">
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
            <Card className="border-dashed bg-card/30">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Code2 className="h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-sm font-semibold">No generated code yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Complete the pipeline to generate reusable component code.
                </p>
                <Button className="mt-4" size="sm" onClick={runFullPipeline}>
                  <Play className="mr-2 h-4 w-4" /> Run Full Pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {components
                .filter((c) => c.generatedCode)
                .map((comp) => (
                  <Card key={comp.id} className="bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{comp.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => copyToClipboard(comp.generatedCode || '', `full-${comp.id}`)}
                          >
                            {copiedId === `full-${comp.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
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
                    </CardHeader>
                    <CardContent>
                      <SyntaxHighlighter
                        language={comp.codeFormat === 'react' ? 'jsx' : comp.codeFormat === 'vue' ? 'xml' : 'html'}
                        style={atomOneDark}
                        customStyle={{
                          borderRadius: '8px',
                          fontSize: '11px',
                          margin: 0,
                          maxHeight: '400px',
                        }}
                      >
                        {comp.generatedCode || ''}
                      </SyntaxHighlighter>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
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
      <pre className="max-h-32 overflow-auto rounded-lg bg-muted/50 p-2 text-[11px] font-mono text-muted-foreground">
        {specJson}
      </pre>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3 space-y-3">
      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}
      {spec.props && spec.props.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Props</p>
          <div className="space-y-1">
            {spec.props.map((prop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{prop.name}</code>
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
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Variants</p>
          <div className="flex flex-wrap gap-1">
            {spec.variants.map((v, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
            ))}
          </div>
        </div>
      )}
      {spec.accessibility && spec.accessibility.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accessibility</p>
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
