"use client";

import { useState } from "react";
import { useExtractorStore } from "@/store/extractor-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, Loader2, Monitor, Smartphone, Tablet, Zap, Code2, FileCode } from "lucide-react";
import { toast } from "sonner";
import type { ViewportType, CodeFormat, PipelineStep } from "@/types/extractor";
import { PIPELINE_STEPS } from "@/types/extractor";
import { ExtractSidebar } from "./extract-sidebar";
import { useExtractSubmit } from "./hooks/use-extract-submit";

const VIEWPORT_OPTIONS: { value: ViewportType; label: string; icon: React.ElementType }[] = [
  { value: "desktop", label: "Desktop (1280px)", icon: Monitor },
  { value: "tablet", label: "Tablet (768px)", icon: Tablet },
  { value: "mobile", label: "Mobile (375px)", icon: Smartphone },
];

const FORMAT_OPTIONS: { value: CodeFormat; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "react", label: "React JSX" },
  { value: "vue", label: "Vue SFC" },
];

export function ExtractView() {
  const { isProcessing } = useExtractorStore();
  const submit = useExtractSubmit();

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [componentQuery, setComponentQuery] = useState("");
  const [viewport, setViewport] = useState<ViewportType>("desktop");
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("html");
  const [runFullPipeline, setRunFullPipeline] = useState(true);
  const [currentSteps, setCurrentSteps] = useState<PipelineStep[]>(
    PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" })),
  );

  function updateStep(stepId: string, status: PipelineStep["status"]) {
    setCurrentSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status } : s)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    submit({
      url,
      name,
      componentQuery,
      viewport,
      codeFormat,
      runFullPipeline,
      setSteps: setCurrentSteps,
      updateStep,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Extraction</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter a URL to extract UI components, design tokens, and patterns.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,320px]">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="text-primary h-5 w-5" />
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
                <p className="text-muted-foreground text-[11px]">
                  Focus extraction on specific component types.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Viewport</Label>
                  <Select
                    value={viewport}
                    onValueChange={(v) => setViewport(v as ViewportType)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEWPORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-3.5 w-3.5" /> {opt.label}
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
                              {opt.value === "html" && <FileCode className="h-3.5 w-3.5" />}
                              {opt.value === "react" && <Code2 className="h-3.5 w-3.5" />}
                              {opt.value === "vue" && <FileCode className="h-3.5 w-3.5" />}
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="border-border flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Full Pipeline</p>
                    <p className="text-muted-foreground text-[11px]">
                      Extract, analyze, spec, and generate in one step.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRunFullPipeline(!runFullPipeline)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${runFullPipeline ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${runFullPipeline ? "translate-x-4" : "translate-x-1"}`}
                  />
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={isProcessing} size="lg">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    {runFullPipeline ? (
                      <Zap className="mr-2 h-4 w-4" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4" />
                    )}
                    {runFullPipeline ? "Run Full Pipeline" : "Extract Page"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <ExtractSidebar steps={currentSteps} />
      </div>
    </div>
  );
}
