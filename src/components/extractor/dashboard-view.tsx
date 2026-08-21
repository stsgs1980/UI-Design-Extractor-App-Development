'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { STATUS_COLORS, type Project } from '@/types/extractor';
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
  TrendingUp,
  Activity,
  Sparkles,
  Plus,
} from 'lucide-react';
import { NumberTicker } from '@/components/magic-ui/number-ticker';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

interface KPICardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  description: string;
  delay?: number;
  sparkData?: { value: number }[];
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ title, value, suffix = '', icon: Icon, description, delay = 0, sparkData, trend = 'neutral' }: KPICardProps) {
  return (
    <motion.div variants={item}>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <NumberTicker value={value} className="text-2xl font-semibold tracking-tight" suffix={suffix} delay={delay * 150} />
          {trend === 'up' && (
            <span className="mb-0.5 flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />+12%
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {sparkData && sparkData.length > 1 && (
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={1.5}
                  fill={`url(#spark-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
      // silent
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
      // silent
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

  const sparkData = useMemo(() => {
    if (safeProjects.length === 0) return [];
    return Array.from({ length: 7 }, () => ({
      value: Math.floor(Math.random() * safeProjects.length * 3) + 1,
    }));
  }, [safeProjects.length]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Extract, analyze, and regenerate UI components from any website.
          </p>
        </div>
        <Button onClick={() => setView('extract')} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Extraction
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Projects"
          value={safeProjects.length}
          icon={Layers}
          description="Extraction projects"
          delay={0}
          sparkData={sparkData}
          trend="up"
        />
        <KPICard
          title="Completed"
          value={completedCount}
          icon={CheckCircle2}
          description="Successfully processed"
          delay={1}
          sparkData={sparkData}
        />
        <KPICard
          title="Components"
          value={totalComponents}
          icon={Code2}
          description="Extracted components"
          delay={2}
          sparkData={sparkData}
        />
        <KPICard
          title="Design Tokens"
          value={totalTokens}
          icon={Palette}
          description="Colors, spacing, typography"
          delay={3}
          sparkData={sparkData}
        />
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* New Extraction */}
          <button
            className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-border hover:shadow-md"
            onClick={() => setView('extract')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Link2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">New Extraction</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Paste a URL and extract UI components, design tokens, and patterns.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Start extraction <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          {/* Reference Library */}
          <button
            className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-border hover:shadow-md"
            onClick={() => setView('references')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <FolderOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Reference Library</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Browse saved component references and regenerate from them.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              {(references || []).length} saved <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          {/* Full Pipeline */}
          <button
            className="group rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-border hover:shadow-md"
            onClick={() => setView('extract')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Full Pipeline</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Extract, analyze, spec, and generate in one step. Full automation.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Run pipeline <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </motion.div>

      {/* Activity Chart */}
      {safeProjects.length > 0 && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Extraction Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Components extracted per project</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeProjects.slice(0, 8).map((p) => ({
                  name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
                  components: getCount(p, 'components'),
                  tokens: getCount(p, 'tokens'),
                }))}>
                  <defs>
                    <linearGradient id="chartComponents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="chartTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area type="monotone" dataKey="components" stroke="var(--chart-1)" strokeWidth={2} fill="url(#chartComponents)" />
                  <Area type="monotone" dataKey="tokens" stroke="var(--chart-2)" strokeWidth={2} fill="url(#chartTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Projects */}
      {safeProjects.length > 0 && (
        <motion.div variants={item}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recent Projects
            </h2>
            <span className="text-xs text-muted-foreground">{safeProjects.length} total</span>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {safeProjects.slice(0, 8).map((project) => (
                <motion.button
                  key={project.id}
                  variants={item}
                  className="group flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => selectProject(project.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[project.status]}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{project.url}</p>
                  </div>
                  <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
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
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {safeProjects.length === 0 && (
        <motion.div variants={item}>
          <div className="rounded-xl border border-dashed border-border p-16">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-5 text-base font-semibold">No projects yet</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Start by extracting a website to see components, design tokens, and patterns.
              </p>
              <Button className="mt-6" onClick={() => setView('extract')}>
                <Link2 className="mr-2 h-4 w-4" />
                New Extraction
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
