"use client";

import { Button } from "@/components/ui/button";
import { STATUS_COLORS } from "@/types/extractor";
import type { Project, PipelineStep } from "@/types/extractor";
import { ArrowLeft, ExternalLink, Play, Trash2 } from "lucide-react";
import { PipelineIndicator } from "./pipeline-indicator";

const RUNNING_STATUSES = ["completed", "generating", "speccing", "analyzing", "extracting"];

type ProjectHeaderProps = {
  project: Project;
  pipelineSteps: PipelineStep[];
  isPipelineRunning: boolean;
  onDelete: () => void;
  onBack: () => void;
  onRunPipeline: () => void;
};

export function ProjectHeader({
  project,
  pipelineSteps,
  isPipelineRunning,
  onDelete,
  onBack,
  onRunPipeline,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={onBack}>
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
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-8 w-8"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <PipelineIndicator steps={pipelineSteps} compact />
        {!RUNNING_STATUSES.includes(project.status) && (
          <Button size="sm" onClick={onRunPipeline} disabled={isPipelineRunning}>
            <Play className="mr-1.5 h-3.5 w-3.5" /> Run Pipeline
          </Button>
        )}
      </div>
    </div>
  );
}
