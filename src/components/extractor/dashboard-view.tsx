"use client";

import { useEffect, useCallback } from "react";
import { useExtractorStore } from "@/store/extractor-store";
import { STATUS_COLORS, type Project } from "@/types/extractor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FolderOpen,
  Layers,
  Zap,
  Link2,
  CheckCircle2,
  Code2,
  Palette,
} from "lucide-react";
import { ProjectCard } from "./project-card";
import { toast } from "sonner";

export function DashboardView() {
  const {
    projects,
    setProjects,
    setView,
    selectProject,
    references,
    setReferences,
    removeProject,
  } = useExtractorStore();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      }
    } catch {
      // Silently fail on initial load
    }
  }, [setProjects]);

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch("/api/references");
      if (res.ok) {
        const data = await res.json();
        setReferences(data.references);
      }
    } catch {
      // Silently fail
    }
  }, [setReferences]);

  useEffect(() => {
    fetchProjects();
    fetchReferences();
  }, [fetchProjects, fetchReferences]);

  const safeProjects = projects || [];
  const completedCount = safeProjects.filter((p) => p.status === "completed").length;
  const getCount = (p: Project, key: string) => {
    const c = (p as unknown as Record<string, Record<string, number>>)._count;
    return c ? c[key] || 0 : 0;
  };
  const totalComponents = safeProjects.reduce((acc, p) => acc + getCount(p, "components"), 0);
  const totalTokens = safeProjects.reduce((acc, p) => acc + getCount(p, "tokens"), 0);

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      removeProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } else {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Extract, analyze, and regenerate UI components from any website.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Layers className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeProjects.length}</div>
            <p className="text-muted-foreground mt-1 text-xs">Extraction projects</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-muted-foreground mt-1 text-xs">Successfully processed</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Code2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComponents}</div>
            <p className="text-muted-foreground mt-1 text-xs">Extracted components</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Design Tokens</CardTitle>
            <Palette className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens}</div>
            <p className="text-muted-foreground mt-1 text-xs">Colors, spacing, typography</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className="group bg-card/50 hover:border-primary/50 hover:shadow-primary/5 cursor-pointer backdrop-blur-sm transition-all hover:shadow-lg"
          onClick={() => setView("extract")}
        >
          <CardHeader className="pb-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Link2 className="text-primary h-5 w-5" />
            </div>
            <CardTitle className="text-base">New Extraction</CardTitle>
            <CardDescription className="text-xs">
              Paste a URL and extract UI components, design tokens, and patterns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" size="sm" className="group-hover:text-primary -ml-2">
              Start extraction <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
        <Card
          className="group bg-card/50 hover:border-primary/50 hover:shadow-primary/5 cursor-pointer backdrop-blur-sm transition-all hover:shadow-lg"
          onClick={() => setView("references")}
        >
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <FolderOpen className="h-5 w-5 text-violet-500" />
            </div>
            <CardTitle className="text-base">Reference Library</CardTitle>
            <CardDescription className="text-xs">
              Browse saved component references and regenerate from them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-violet-500 group-hover:text-violet-400"
            >
              {(references || []).length} saved <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <CardTitle className="text-base">Pipeline</CardTitle>
            <CardDescription className="text-xs">
              Extract, analyze, spec, and generate in one step. Full automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-amber-500"
              onClick={() => setView("extract")}
            >
              Run pipeline <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      {safeProjects.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
          </div>
          <div className="space-y-2">
            {safeProjects.slice(0, 8).map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={selectProject}
                onDelete={deleteProject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeProjects.length === 0 && (
        <Card className="bg-card/30 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-2xl">
              <Layers className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Start by extracting a website to see components, design tokens, and patterns.
            </p>
            <Button className="mt-4" onClick={() => setView("extract")}>
              <Link2 className="mr-2 h-4 w-4" />
              New Extraction
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
