'use client';

import { useEffect, useState, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { STATUS_COLORS, PIPELINE_STEPS } from '@/types/extractor';
import type { CodeFormat, PipelineStep } from '@/types/extractor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Play, Globe, ExternalLink, FileText, Code2, Palette, Eye } from 'lucide-react';
import { PipelineIndicator } from './pipeline-indicator';
import { OverviewTab } from './project-overview-tab';
import { ComponentsTab } from './project-components-tab';
import { TokensTab } from './project-tokens-tab';
import { CodeTab } from './project-code-tab';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function ProjectView() {
  const { selectedProjectId, currentProject, setCurrentProject, setView } = useExtractorStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpecing, setIsSpecing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('html');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`);
      if (res.ok) setCurrentProject(await res.json());
    } catch { /* silent */ }
  }, [selectedProjectId, setCurrentProject]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  if (!currentProject) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent" />
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
  const failedAtIndex = project.status === 'failed' ? stepDataDone.findIndex((d) => !d) : -1;

  const pipelineSteps: PipelineStep[] = PIPELINE_STEPS.map((step) => {
    let status: PipelineStep['status'] = 'pending';
    const idx = stepOrder.indexOf(step.id);
    if (project.status === 'failed') { status = idx < failedAtIndex ? 'completed' : idx === failedAtIndex ? 'failed' : 'pending'; }
    else if (stepDataDone[idx]) status = 'completed';
    else if ((project.status === 'analyzing' && step.id === 'analyze') || (project.status === 'speccing' && step.id === 'spec') || (project.status === 'generating' && step.id === 'generate') || (project.status === 'extracting' && step.id === 'extract')) status = 'running';
    else if (project.status === 'completed') status = 'completed';
    return { ...step, status };
  });

  async function apiCall(url: string, body?: object, label: string) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error((await res.json()).error || `${label} failed`);
    await fetchProject();
    toast.success(`${label} complete`);
  }

  function runAnalyze() { if (!selectedProjectId) return; setIsAnalyzing(true); apiCall(`/api/projects/${selectedProjectId}/analyze`, undefined, 'Analysis').finally(() => setIsAnalyzing(false)); }
  function runSpec() { if (!selectedProjectId) return; setIsSpecing(true); apiCall(`/api/projects/${selectedProjectId}/spec`, undefined, 'Spec generation').finally(() => setIsSpecing(false)); }
  function runGenerate() { if (!selectedProjectId) return; setIsGenerating(true); apiCall(`/api/projects/${selectedProjectId}/generate`, { codeFormat }, 'Code generation').finally(() => setIsGenerating(false)); }
  function runFullPipeline() { if (!selectedProjectId) return; apiCall(`/api/projects/${selectedProjectId}/pipeline`, { codeFormat }, 'Full pipeline'); }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function downloadCode(code: string, filename: string) {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const busy = isAnalyzing || isSpecing || isGenerating;

  return (
    <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => setView('dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <a href={project.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Globe className="h-3 w-3" />{project.url}<ExternalLink className="h-2.5 w-2.5" />
              </a>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}>{project.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PipelineIndicator steps={pipelineSteps} compact />
          {(project.status === 'extracting' || !project.rawHtml) && (
            <Button size="sm" onClick={runFullPipeline} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />} Run Pipeline
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="text-xs"><FileText className="mr-1.5 h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="components" className="text-xs">
              <Code2 className="mr-1.5 h-3.5 w-3.5" /> Components
              {components.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{components.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="tokens" className="text-xs">
              <Palette className="mr-1.5 h-3.5 w-3.5" /> Tokens
              {tokens.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{tokens.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="code" className="text-xs"><Eye className="mr-1.5 h-3.5 w-3.5" /> Code</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab project={project} components={components} tokens={tokens} pipelineSteps={pipelineSteps}
              isAnalyzing={isAnalyzing} isSpecing={isSpecing} isGenerating={isGenerating}
              copiedId={copiedId} copyToClipboard={copyToClipboard}
              runAnalyze={runAnalyze} runSpec={runSpec} runGenerate={runGenerate} runFullPipeline={runFullPipeline} />
          </TabsContent>
          <TabsContent value="components" className="mt-6">
            <ComponentsTab components={components} isAnalyzing={isAnalyzing}
              copiedId={copiedId} copyToClipboard={copyToClipboard} downloadCode={downloadCode} runAnalyze={runAnalyze} />
          </TabsContent>
          <TabsContent value="tokens" className="mt-6">
            <TokensTab tokens={tokens} codeFormat={codeFormat} setCodeFormat={setCodeFormat}
              isGenerating={isGenerating} isAnalyzing={isAnalyzing} copiedId={copiedId}
              copyToClipboard={copyToClipboard} runGenerate={runGenerate} runAnalyze={runAnalyze} />
          </TabsContent>
          <TabsContent value="code" className="mt-6">
            <CodeTab project={project} components={components} codeFormat={codeFormat} setCodeFormat={setCodeFormat}
              isGenerating={isGenerating} copiedId={copiedId}
              copyToClipboard={copyToClipboard} downloadCode={downloadCode}
              runGenerate={runGenerate} runFullPipeline={runFullPipeline} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
