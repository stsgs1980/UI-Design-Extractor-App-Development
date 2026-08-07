"use client";

import { useState, useCallback } from "react";
import type { CodeFormat } from "@/types/extractor";
import { useExtractorStore } from "@/store/extractor-store";
import { toast } from "sonner";

export function useProjectActions() {
  const { selectedProjectId, setCurrentProject, addReference, removeProject } = useExtractorStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpecing, setIsSpecing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("html");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refName, setRefName] = useState("");
  const [refTags, setRefTags] = useState("");
  const [pipelineLogs, setPipelineLogs] = useState<Array<{
    ts: string;
    level: string;
    step: string;
    message: string;
    component?: string;
  }> | null>(null);

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

  async function runAnalyze() {
    if (!selectedProjectId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      await fetchProject();
      toast.success("Analysis complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function runSpec() {
    if (!selectedProjectId) return;
    setIsSpecing(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/spec`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Spec failed");
      await fetchProject();
      toast.success("Spec generation complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Spec failed");
    } finally {
      setIsSpecing(false);
    }
  }

  async function runGenerate() {
    if (!selectedProjectId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeFormat }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
      await fetchProject();
      toast.success("Code generation complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function retryExtract() {
    if (!selectedProjectId) return;
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/re-extract`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Retry failed");
      await fetchProject();
      toast.success("Page extracted successfully");
    } catch (err) {
      await fetchProject();
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setIsRetrying(false);
    }
  }

  async function runFullPipeline() {
    if (!selectedProjectId) return;
    setIsPipelineRunning(true);
    setPipelineLogs(null);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeFormat }),
      });
      const data = await res.json();
      if (data._logs) setPipelineLogs(data._logs);

      if (res.status === 207) {
        await fetchProject();
        const errCount =
          data._logs?.filter((l: { level: string }) => l.level === "error").length || 0;
        toast.warning(
          `Pipeline partially completed (${errCount} error${errCount !== 1 ? "s" : ""})`,
        );
      } else if (!res.ok) {
        throw new Error(data.error || "Pipeline failed");
      } else {
        await fetchProject();
        toast.success("Full pipeline completed");
      }
    } catch (err) {
      await fetchProject();
      toast.error(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setIsPipelineRunning(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveAsReference(
    componentId: string,
    componentHtml: string,
    componentSpec: string | null,
  ) {
    if (!refName.trim()) return;
    try {
      const res = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: refName,
          componentId,
          html: componentHtml,
          spec: componentSpec,
          tags: refTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addReference(data.reference);
        toast.success("Saved to references");
        return true;
      }
    } catch {
      toast.error("Failed to save reference");
    }
    return false;
  }

  function downloadCode(code: string, filename: string) {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    fetchProject,
    runAnalyze,
    runSpec,
    runGenerate,
    runFullPipeline,
    copyToClipboard,
    saveAsReference,
    downloadCode,
    isAnalyzing,
    isSpecing,
    isGenerating,
    isPipelineRunning,
    codeFormat,
    setCodeFormat,
    copiedId,
    pipelineLogs,
    setPipelineLogs,
    refName,
    setRefName,
    refTags,
    setRefTags,
    removeProjectFromStore: removeProject,
    retryExtract,
    isRetrying,
  };
}
