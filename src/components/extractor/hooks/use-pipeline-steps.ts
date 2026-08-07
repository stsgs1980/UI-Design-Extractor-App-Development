"use client";

import type { ExtractedComponent, PipelineStep, ProjectStatus } from "@/types/extractor";
import { PIPELINE_STEPS } from "@/types/extractor";

export function usePipelineSteps(
  projectStatus: ProjectStatus,
  rawHtml: string | null,
  components: ExtractedComponent[],
  isPipelineRunning: boolean,
) {
  const extractDone = !!rawHtml;
  const analyzeDone = components.length > 0;
  const specDone = components.some((c) => c.spec);
  const generateDone = components.some((c) => c.generatedCode);
  const stepDataDone = [extractDone, analyzeDone, specDone, generateDone];
  const stepOrder = ["extract", "analyze", "spec", "generate"];
  const failedAtIndex = projectStatus === "failed" ? stepDataDone.findIndex((done) => !done) : -1;

  const pipelineSteps: PipelineStep[] = PIPELINE_STEPS.map((step) => {
    let status: PipelineStep["status"] = "pending";
    const stepIndex = stepOrder.indexOf(step.id);

    if (projectStatus === "failed") {
      if (stepIndex < failedAtIndex) status = "completed";
      else if (stepIndex === failedAtIndex) status = "failed";
    } else if (stepDataDone[stepIndex]) {
      status = "completed";
    } else if (
      (projectStatus === "extracting" && step.id === "extract") ||
      (projectStatus === "analyzing" && step.id === "analyze") ||
      (projectStatus === "speccing" && step.id === "spec") ||
      (projectStatus === "generating" && step.id === "generate")
    ) {
      status = "running";
    } else if (isPipelineRunning && !stepDataDone[stepIndex]) {
      const allPrevDone = stepDataDone.slice(0, stepIndex).every(Boolean);
      if (allPrevDone) status = "running";
    }

    return { ...step, status };
  });

  return pipelineSteps;
}
