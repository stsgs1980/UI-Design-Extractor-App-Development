"use client";

import { useEffect, useState } from "react";
import { useExtractorStore } from "@/store/extractor-store";
import type { ExtractedComponent, DesignToken } from "@/types/extractor";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Code2, Palette, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { useProjectActions } from "./hooks/use-project-actions";
import { usePipelineSteps } from "./hooks/use-pipeline-steps";
import { ProjectHeader } from "./project-header";
import { OverviewTab } from "./overview-tab";
import { ComponentDetail } from "./component-detail";
import { TokenGrid } from "./token-grid";
import { CodeView } from "./code-view";
import { ComponentList } from "./component-list";

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

  const deleteProject = async () => {
    if (!currentProject) return;
    if (!confirm(`Delete "${currentProject.name}" and all its data?`)) return;
    const res = await fetch(`/api/projects/${currentProject.id}`, { method: "DELETE" });
    if (res.ok) {
      actions.removeProjectFromStore(currentProject.id);
      setView("dashboard");
      toast.success("Project deleted");
    } else {
      toast.error("Failed to delete project");
    }
  };

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
      <ProjectHeader
        project={project}
        pipelineSteps={pipelineSteps}
        isPipelineRunning={actions.isPipelineRunning}
        onDelete={deleteProject}
        onBack={() => setView("dashboard")}
        onRunPipeline={actions.runFullPipeline}
      />
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
            onRetryExtract={actions.retryExtract}
            isRetrying={actions.isRetrying}
          />
        </TabsContent>

        <TabsContent value="components" className="mt-6 space-y-4">
          {components.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-muted-foreground text-sm">No components extracted yet</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <ComponentList
                  components={components}
                  selectedId={selectedComponent?.id ?? null}
                  onSelect={setSelectedComponent}
                />
              </div>
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
