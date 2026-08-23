'use client';

import { useEffect, useState } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { AppSidebar } from '@/components/extractor/app-sidebar';
import { DashboardView } from '@/components/extractor/dashboard-view';
import { ExtractView } from '@/components/extractor/extract-view';
import { ProjectView } from '@/components/extractor/project-view';
import { ReferencesView } from '@/components/extractor/references-view';
import { CommandPalette } from '@/components/extractor/command-palette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/extractor';
import { AnimatePresence, motion } from 'framer-motion';

const viewVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export default function Home() {
  const { currentView, selectedProjectId, sidebarOpen, setCurrentProject } =
    useExtractorStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (currentView === 'project' && selectedProjectId) {
      fetch(`/api/projects/${selectedProjectId}`)
        .then((res) => res.ok && res.json())
        .then((data) => {
          if (data) setCurrentProject(data as Project);
        })
        .catch(() => {});
    }
  }, [currentView, selectedProjectId, setCurrentProject]);

  return (
    <TooltipProvider delayDuration={0}>
      <CommandPalette />
      <div className="flex min-h-screen bg-background">
        <AppSidebar />

        <main
          className={cn(
            'relative flex flex-1 flex-col transition-[margin] duration-200 ease-out',
            sidebarOpen ? 'ml-[260px]' : 'ml-[68px]'
          )}
        >
          {/* Content area */}
          <div className="flex-1">
            <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
              <AnimatePresence mode="wait">
                {mounted && currentView === 'dashboard' && (
                  <motion.div key="dashboard" variants={viewVariants} initial="initial" animate="animate" exit="exit">
                    <DashboardView />
                  </motion.div>
                )}
                {mounted && currentView === 'extract' && (
                  <motion.div key="extract" variants={viewVariants} initial="initial" animate="animate" exit="exit">
                    <ExtractView />
                  </motion.div>
                )}
                {mounted && currentView === 'project' && (
                  <motion.div key="project" variants={viewVariants} initial="initial" animate="animate" exit="exit">
                    <ProjectView />
                  </motion.div>
                )}
                {mounted && currentView === 'references' && (
                  <motion.div key="references" variants={viewVariants} initial="initial" animate="animate" exit="exit">
                    <ReferencesView />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Untitled UI footer — sticky bottom */}
          <footer className="mt-auto border-t border-border bg-background">
            <div
              className={cn(
                'mx-auto flex h-10 items-center justify-between px-6 text-xs text-muted-foreground transition-[margin,padding] duration-200',
                'lg:px-8'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground/70">UI Design Extractor</span>
                <span className="text-border">/</span>
                <span className="hidden sm:inline">URL → Analyze → Spec → Generate</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 sm:flex">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">Ready</span>
                </span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                  ⌘K
                </kbd>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
