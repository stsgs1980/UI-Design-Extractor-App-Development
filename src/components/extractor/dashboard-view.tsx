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
} from 'lucide-react';
import { NumberTicker } from '@/components/magic-ui/number-ticker';
import { GradientText } from '@/components/magic-ui/gradient-text';
import { GlowCard } from '@/components/magic-ui/shimmer-border';
import { Meteors } from '@/components/magic-ui/meteors';
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
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

interface KPICardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
  delay?: number;
  sparkData?: { value: number }[];
}

function KPICard({ title, value, suffix = '', icon: Icon, description, color, bgColor, delay = 0, sparkData }: KPICardProps) {
  return (
    <motion.div variants={item}>
      <GlowCard glowColor={color === 'emerald' ? 'emerald' : color === 'violet' ? 'violet' : 'amber'}>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgColor}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <NumberTicker value={value} className="text-3xl font-bold tracking-tight" suffix={suffix} delay={delay * 200} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
          {sparkData && sparkData.length > 1 && (
            <div className="mt-3 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color === 'text-emerald-400' ? '#34d399' : color === 'text-violet-400' ? '#a78bfa' : '#fbbf24'}
                    strokeWidth={1.5}
                    fill={`url(#spark-${color})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </GlowCard>
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
      <motion.div variants={item} className="relative">
        <h1 className="text-2xl font-bold tracking-tight">
          <GradientText>Dashboard</GradientText>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Extract, analyze, and regenerate UI components from any website.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Projects"
          value={safeProjects.length}
          icon={Layers}
          description="Extraction projects"
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
          delay={0}
          sparkData={sparkData}
        />
        <KPICard
          title="Completed"
          value={completedCount}
          icon={CheckCircle2}
          description="Successfully processed"
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
          delay={1}
          sparkData={sparkData}
        />
        <KPICard
          title="Components"
          value={totalComponents}
          icon={Code2}
          description="Extracted components"
          color="text-violet-400"
          bgColor="bg-violet-500/10"
          delay={2}
          sparkData={sparkData}
        />
        <KPICard
          title="Design Tokens"
          value={totalTokens}
          icon={Palette}
          description="Colors, spacing, typography"
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          delay={3}
          sparkData={sparkData}
        />
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <GlowCard glowColor="emerald">
            <button
              className="group w-full p-5 text-left transition-colors"
              onClick={() => setView('extract')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/20">
                <Link2 className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">New Extraction</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Paste a URL and extract UI components, design tokens, and patterns.
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                Start extraction <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </GlowCard>

          <GlowCard glowColor="violet">
            <button
              className="group w-full p-5 text-left transition-colors"
              onClick={() => setView('references')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/20">
                <FolderOpen className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">Reference Library</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Browse saved component references and regenerate from them.
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                {(references || []).length} saved <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </GlowCard>

          <GlowCard glowColor="amber">
            <button
              className="group w-full p-5 text-left transition-colors"
              onClick={() => setView('extract')}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/20">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">Full Pipeline</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Extract, analyze, spec, and generate in one step. Full automation.
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
                Run pipeline <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </GlowCard>
        </div>
      </motion.div>

      {/* Activity Chart */}
      {safeProjects.length > 0 && (
        <motion.div variants={item}>
          <GlowCard>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Extraction Activity</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Components extracted per project</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Activity className="h-4 w-4 text-emerald-400" />
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
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="chartTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'oklch(0.6 0.02 160)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'oklch(0.6 0.02 160)' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'oklch(0.16 0.01 160)',
                        border: '1px solid oklch(0.28 0.01 160)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'oklch(0.94 0.01 160)',
                      }}
                    />
                    <Area type="monotone" dataKey="components" stroke="#34d399" strokeWidth={2} fill="url(#chartComponents)" />
                    <Area type="monotone" dataKey="tokens" stroke="#a78bfa" strokeWidth={2} fill="url(#chartTokens)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      )}

      {/* Recent Projects */}
      {safeProjects.length > 0 && (
        <motion.div variants={item}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Projects
            </h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {safeProjects.length} total
            </div>
          </div>
          <div className="space-y-2">
            {safeProjects.slice(0, 8).map((project) => (
              <motion.button
                key={project.id}
                variants={item}
                className="group w-full"
                onClick={() => selectProject(project.id)}
              >
                <GlowCard>
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/50">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
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
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-emerald-400" />
                  </div>
                </GlowCard>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {safeProjects.length === 0 && (
        <motion.div variants={item}>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-border p-16">
            <Meteors number={8} />
            <div className="relative flex flex-col items-center text-center">
              <motion.div
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 ring-1 ring-emerald-500/20"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <h3 className="mt-6 text-lg font-semibold">No projects yet</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Start by extracting a website to see components, design tokens, and patterns.
              </p>
              <Button className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600" onClick={() => setView('extract')}>
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
