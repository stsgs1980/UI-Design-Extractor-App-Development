'use client';

import { useEffect, useState } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { AppSidebar } from '@/components/extractor/app-sidebar';
import { DashboardView } from '@/components/extractor/dashboard-view';
import { ExtractView } from '@/components/extractor/extract-view';
import { ProjectView } from '@/components/extractor/project-view';
import { ReferencesView } from '@/components/extractor/references-view';
import { CommandPalette } from '@/components/extractor/command-palette';
import { DotPattern } from '@/components/magic-ui/particles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/extractor';
import { AnimatePresence, motion } from 'framer-motion';

const viewVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
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
      <div className="flex min-h-screen bg-background overflow-hidden">
        {/* Background Effects */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <DotPattern className="opacity-40" />
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-teal-500/[0.03] blur-[100px]" />
        </div>

        <AppSidebar />

        <main
          className={cn(
            'relative z-10 flex-1 transition-all duration-300 ease-out',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          <div className="mx-auto max-w-6xl px-6 py-8 pb-24">
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

          {/* Footer */}
          <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 bg-background/60 backdrop-blur-xl">
            <div
              className={cn(
                'mx-auto flex h-10 items-center justify-between px-6 text-[11px] text-muted-foreground transition-all duration-300',
                sidebarOpen ? 'max-w-[calc(100%-16rem)] ml-64' : 'max-w-[calc(100%-4rem)] ml-16'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground/80">UI Extractor</span>
                <span className="text-border">|</span>
                <span className="hidden sm:inline">URL &rarr; Analyze &rarr; Spec &rarr; Generate</span>
                <kbd className="hidden sm:inline-flex rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  ⌘K
                </kbd>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">Ready</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
