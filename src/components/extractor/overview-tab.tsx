"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Copy,
  Check,
  Code2,
  FileText,
  Play,
  RotateCcw,
  Palette,
  Layers,
  Terminal,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { PipelineStepsDetail } from "./pipeline-indicator";
import { PipelineLogPanel } from "./pipeline-log-panel";
import type { ExtractedComponent, PipelineStep } from "@/types/extractor";

type OverviewTabProps = {
  project: {
    id: string;
    name: string;
    url: string;
    status: string;
    rawHtml: string | null;
    pageTitle: string | null;
    error: string | null;
  };
  components: ExtractedComponent[];
  tokensCount: number;
  pipelineSteps: PipelineStep[];
  pipelineLogs: Array<{
    ts: string;
    level: string;
    step: string;
    message: string;
    component?: string;
  }> | null;
  isAnalyzing: boolean;
  isSpecing: boolean;
  isGenerating: boolean;
  onAnalyze: () => void;
  onSpec: () => void;
  onGenerate: () => void;
  onPipeline: () => void;
  onCopy: (text: string, id: string) => void;
  onDismissLogs: () => void;
  onRetryExtract: () => void;
  isRetrying: boolean;
  retryCooldownSeconds: number;
};

export function OverviewTab({
  project,
  components,
  tokensCount,
  pipelineSteps,
  pipelineLogs,
  isAnalyzing,
  isSpecing,
  isGenerating,
  onAnalyze,
  onSpec,
  onGenerate,
  onPipeline,
  onCopy,
  onDismissLogs,
  onRetryExtract,
  isRetrying,
  retryCooldownSeconds,
}: OverviewTabProps) {
  const [rawHtmlOpen, setRawHtmlOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, id: string) => {
    onCopy(text, id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isFailed = project.status === "FAILED" || !project.rawHtml;

  return (
    <>
      {/* Error Banner */}
      {isFailed && (
        <div className="border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
          <AlertTriangle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-destructive text-sm font-medium">Extraction failed</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {project.error ||
                "Page could not be fetched. The site may be unreachable or blocking automated requests."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetryExtract}
            disabled={isRetrying || retryCooldownSeconds > 0}
            className="shrink-0"
          >
            {retryCooldownSeconds > 0 ? (
              <span className="mr-1.5 text-[11px]">{retryCooldownSeconds}s</span>
            ) : isRetrying ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Code2 className="h-4 w-4" /> Components
            </div>
            <p className="mt-1 text-2xl font-bold">{components.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4" /> Design Tokens
            </div>
            <p className="mt-1 text-2xl font-bold">{tokensCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4" /> HTML Size
            </div>
            <p className="mt-1 text-2xl font-bold">
              {project.rawHtml ? `${(project.rawHtml.length / 1024).toFixed(1)}KB` : "--"}
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
          <Button onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Code2 className="mr-2 h-4 w-4" />
            )}
            Analyze Components
          </Button>
        )}
        {components.length > 0 && !components.some((c) => c.spec) && (
          <Button onClick={onSpec} disabled={isSpecing} variant="secondary">
            {isSpecing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Specs
          </Button>
        )}
        {components.some((c) => c.spec) && !components.some((c) => c.generatedCode) && (
          <Button onClick={onGenerate} disabled={isGenerating} variant="secondary">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Code
          </Button>
        )}
        {components.some((c) => c.generatedCode) && (
          <Button onClick={onPipeline} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Re-run Pipeline
          </Button>
        )}
      </div>

      {/* Raw HTML Preview */}
      {project.rawHtml && (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Extracted HTML
                {project.pageTitle && (
                  <span className="text-muted-foreground ml-2 text-[10px] font-normal">
                    {project.pageTitle}
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleCopy(project.rawHtml!, "raw-html")}
                >
                  {copiedId === "raw-html" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setRawHtmlOpen(!rawHtmlOpen)}
                >
                  <Terminal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className={rawHtmlOpen ? "h-64" : "h-32"}>
              <pre className="text-muted-foreground font-mono text-[11px] break-all whitespace-pre-wrap">
                {project.rawHtml}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Logs */}
      {pipelineLogs && <PipelineLogPanel logs={pipelineLogs} onDismiss={onDismissLogs} />}
    </>
  );
}
