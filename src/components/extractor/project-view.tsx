"use client";

import { useEffect, useState } from "react";
import { useExtractorStore } from "@/store/extractor-store";
import { STATUS_COLORS } from "@/types/extractor";
import type { ExtractedComponent, DesignToken } from "@/types/extractor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ExternalLink,
  Code2,
  Palette,
  FileText,
  Play,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { PipelineIndicator } from "./pipeline-indicator";
import { useProjectActions } from "./hooks/use-project-actions";
import { usePipelineSteps } from "./hooks/use-pipeline-steps";
import { OverviewTab } from "./overview-tab";
import { ComponentDetail } from "./component-detail";
import { TokenGrid } from "./token-grid";
import { CodeView } from "./code-view";

export function ProjectView() {
  const { currentProject, setView } = useExtractorStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedComponent, setSelectedComponent] = useState<ExtractedComponent | null>(null);

  const actions = useProjectActions();
  const components = currentProject?.components || [];
  const tokens = currentProject?.tokens || [];

  const pipelineSteps = usePipelineSteps(
    currentProject?.status || "pending",
    currentProject?.rawHtml || null,
    components,
    actions.isPipelineRunning,
  );

  // Sync persisted logs into hook state
  useEffect(() => {
    if (currentProject?.pipelineLogs) {
      try {
        actions.setPipelineLogs(JSON.parse(currentProject.pipelineLogs));
      } catch {
        /* ignore */
      }
    }
  }, [currentProject?.pipelineLogs, actions.setPipelineLogs]);

  useEffect(() => {
    actions.fetchProject();
  }, [actions.fetchProject]);

  const tokenCategories = tokens.reduce<Record<string, DesignToken[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  if (!currentProject) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-muted-foreground mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground mt-2 text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  const project = currentProject;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5"
            onClick={() => setView("dashboard")}
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
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                {project.url}
                <ExternalLink className="ml-0.5 inline h-3 w-3" />
              </a>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}
              >
                {project.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PipelineIndicator steps={pipelineSteps} compact />
          {!["completed", "generating", "speccing", "analyzing", "extracting"].includes(
            project.status,
          ) && (
            <Button
              size="sm"
              onClick={actions.runFullPipeline}
              disabled={actions.isPipelineRunning}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" /> Run Pipeline
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
        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewTab
            project={project}
            components={components}
            tokensCount={tokens.length}
            pipelineSteps={pipelineSteps}
            pipelineLogs={actions.pipelineLogs}
            isAnalyzing={actions.isAnalyzing}
            isSpecing={actions.isSpecing}
            isGenerating={actions.isGenerating}
            onAnalyze={actions.runAnalyze}
            onSpec={actions.runSpec}
            onGenerate={actions.runGenerate}
            onPipeline={actions.runFullPipeline}
            onCopy={actions.copyToClipboard}
            onDismissLogs={() => actions.setPipelineLogs(null)}
          />
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="mt-6 space-y-4">
          {components.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">No components extracted yet</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              {/* Component List */}
              <div className="lg:col-span-2">
                <div className="space-y-1.5">
                  {components.map((comp) => (
                    <Button
                      key={comp.id}
                      variant={selectedComponent?.id === comp.id ? "secondary" : "ghost"}
                      className="h-auto w-full justify-start px-3 py-2"
                      onClick={() => setSelectedComponent(comp)}
                    >
                      <div className="flex w-full items-center gap-2">
                        <Code2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="truncate text-xs">{comp.name}</span>
                        {comp.spec && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                        )}
                        {comp.generatedCode && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Component Detail */}
              <div className="lg:col-span-3">
                {selectedComponent ? (
                  <ComponentDetail
                    key={selectedComponent.id}
                    component={selectedComponent}
                    project={project}
                    copiedId={actions.copiedId}
                    onCopy={actions.copyToClipboard}
                    onSaveReference={(id, html, spec) => actions.saveAsReference(id, html, spec)}
                    onDownload={actions.downloadCode}
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                    <p className="text-muted-foreground text-sm">
                      Select a component to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Design Tokens Tab */}
        <TabsContent value="tokens" className="mt-6 space-y-6">
          <TokenGrid
            categories={tokenCategories}
            codeFormat={actions.codeFormat}
            isGenerating={actions.isAnalyzing}
            onGenerate={actions.runAnalyze}
            onSetCodeFormat={actions.setCodeFormat}
            onCopy={actions.copyToClipboard}
            onGenerateCode={actions.runGenerate}
            isGeneratingCode={actions.isGenerating}
            copiedId={actions.copiedId}
          />
        </TabsContent>

        {/* Generated Code Tab */}
        <TabsContent value="code" className="mt-6 space-y-4">
          <CodeView
            components={components}
            projectName={project.name}
            codeFormat={actions.codeFormat}
            isGenerating={actions.isGenerating}
            onGenerate={actions.runGenerate}
            onSetCodeFormat={actions.setCodeFormat}
            onCopy={actions.copyToClipboard}
            onDownload={actions.downloadCode}
            onPipeline={actions.runFullPipeline}
            copiedId={actions.copiedId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
