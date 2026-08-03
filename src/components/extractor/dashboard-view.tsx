'use client';

import { useEffect, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { STATUS_COLORS, type Project } from '@/types/extractor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  FolderOpen,
  Layers,
  Zap,
  Link2,
  Clock,
  CheckCircle2,
  Code2,
  Palette,
} from 'lucide-react';

export function DashboardView() {
  const { projects, setProjects, setView, selectProject, references, setReferences } = useExtractorStore();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
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
      const res = await fetch('/api/references');
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
  const completedCount = safeProjects.filter((p) => p.status === 'completed').length;
  const getCount = (p: Project, key: string) => {
    const c = (p as unknown as Record<string, Record<string, number>>)._count;
    return c ? c[key] || 0 : 0;
  };
  const totalComponents = safeProjects.reduce((acc, p) => acc + getCount(p, 'components'), 0);
  const totalTokens = safeProjects.reduce((acc, p) => acc + getCount(p, 'tokens'), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Extract, analyze, and regenerate UI components from any website.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeProjects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Extraction projects</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComponents}</div>
            <p className="text-xs text-muted-foreground mt-1">Extracted components</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Design Tokens</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens}</div>
            <p className="text-xs text-muted-foreground mt-1">Colors, spacing, typography</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className="group cursor-pointer bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setView('extract')}
        >
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">New Extraction</CardTitle>
            <CardDescription className="text-xs">
              Paste a URL and extract UI components, design tokens, and patterns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" size="sm" className="-ml-2 group-hover:text-primary">
              Start extraction <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
        <Card
          className="group cursor-pointer bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          onClick={() => setView('references')}
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
            <Button variant="ghost" size="sm" className="-ml-2 text-violet-500 group-hover:text-violet-400">
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
            <Button variant="ghost" size="sm" className="-ml-2 text-amber-500" onClick={() => setView('extract')}>
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
              <Card
                key={project.id}
                className="group cursor-pointer bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30"
                onClick={() => selectProject(project.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[project.status]}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{project.url}</p>
                  </div>
                  <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                    {project._count?.components !== undefined && (
                      <span className="flex items-center gap-1">
                        <Code2 className="h-3 w-3" /> {project._count.components}
                      </span>
                    )}
                    {project._count?.tokens !== undefined && (
                      <span className="flex items-center gap-1">
                        <Palette className="h-3 w-3" /> {project._count.tokens}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{' '}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {safeProjects.length === 0 && (
        <Card className="border-dashed bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by extracting a website to see components, design tokens, and patterns.
            </p>
            <Button className="mt-4" onClick={() => setView('extract')}>
              <Link2 className="mr-2 h-4 w-4" />
              New Extraction
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
