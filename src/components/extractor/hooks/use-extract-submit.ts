"use client";

import { useCallback } from "react";
import { useExtractorStore } from "@/store/extractor-store";
import { toast } from "sonner";
import type { ViewportType, CodeFormat, PipelineStep } from "@/types/extractor";
import { PIPELINE_STEPS } from "@/types/extractor";

export function useExtractSubmit() {
  const { addProject, selectProject, setProcessing } = useExtractorStore();

  return useCallback(
    async (params: {
      url: string;
      name: string;
      componentQuery: string;
      viewport: ViewportType;
      codeFormat: CodeFormat;
      runFullPipeline: boolean;
      setSteps: React.Dispatch<React.SetStateAction<PipelineStep[]>>;
      updateStep: (id: string, status: PipelineStep["status"]) => void;
      onRateLimit?: () => void;
    }) => {
      const {
        url,
        name,
        componentQuery,
        viewport,
        codeFormat,
        runFullPipeline,
        setSteps,
        updateStep,
        onRateLimit,
      } = params;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      } catch {
        toast.error("Please enter a valid URL");
        return;
      }

      const fullUrl = parsedUrl.href;
      const projectName = name.trim() || new URL(fullUrl).hostname;

      setProcessing(true);
      setSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" })));

      try {
        // Step 1: Extract
        updateStep("extract", "running");
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: fullUrl,
            name: projectName,
            componentQuery: componentQuery || undefined,
            viewport,
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          const msg = err.error || "Extraction failed";
          if (err.id) {
            addProject(err);
            selectProject(err.id);
          }
          throw new Error(msg);
        }

        const project = await createRes.json();
        addProject(project);
        updateStep("extract", "completed");

        if (project.status === "completed" && !runFullPipeline) {
          toast.success("This URL was already extracted. Navigating to existing project.");
          selectProject(project.id);
          setProcessing(false);
          return;
        }

        if (!runFullPipeline) {
          toast.success("Page extracted successfully");
          selectProject(project.id);
          setProcessing(false);
          return;
        }

        // Step 2: Analyze
        updateStep("analyze", "running");
        const analyzeRes = await fetch(`/api/projects/${project.id}/analyze`, {
          method: "POST",
        });
        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || "Analysis failed");
        }
        updateStep("analyze", "completed");

        // Step 3: Spec
        updateStep("spec", "running");
        const specRes = await fetch(`/api/projects/${project.id}/spec`, {
          method: "POST",
        });
        if (!specRes.ok) {
          const err = await specRes.json();
          throw new Error(err.error || "Spec generation failed");
        }
        updateStep("spec", "completed");

        // Step 4: Generate
        updateStep("generate", "running");
        const genRes = await fetch(`/api/projects/${project.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeFormat }),
        });
        if (!genRes.ok) {
          const err = await genRes.json();
          throw new Error(err.error || "Code generation failed");
        }
        updateStep("generate", "completed");
        toast.success("Pipeline completed successfully");
        selectProject(project.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const isRateLimit = message.toLowerCase().includes("rate limit");
        if (isRateLimit) onRateLimit?.();
        toast.error(message);
        setSteps((prev) =>
          prev.map((s) => (s.status === "running" ? { ...s, status: "failed" as const } : s)),
        );
      } finally {
        setProcessing(false);
      }
    },
    [addProject, selectProject, setProcessing],
  );
}
