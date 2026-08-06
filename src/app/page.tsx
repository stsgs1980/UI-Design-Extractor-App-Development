'use client';

import { useEffect } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { AppSidebar } from '@/components/extractor/app-sidebar';
import { DashboardView } from '@/components/extractor/dashboard-view';
import { ExtractView } from '@/components/extractor/extract-view';
import { ProjectView } from '@/components/extractor/project-view';
import { ReferencesView } from '@/components/extractor/references-view';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Project } from '@/types/extractor';

export default function Home() {
  const { currentView, selectedProjectId, sidebarOpen, setCurrentProject, selectProject, setView } =
    useExtractorStore();

  // When selecting a project, fetch its details
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
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main
          className={cn(
            'flex-1 transition-all duration-300',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          <div className="mx-auto max-w-6xl px-6 py-8 pb-24">
            {currentView === 'dashboard' && <DashboardView />}
            {currentView === 'extract' && <ExtractView />}
            {currentView === 'project' && <ProjectView />}
            {currentView === 'references' && <ReferencesView />}
          </div>

          {/* Footer */}
          <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-sm z-30">
            <div
              className={cn(
                'mx-auto flex h-10 items-center justify-between px-6 text-[11px] text-muted-foreground transition-all duration-300',
                sidebarOpen ? 'max-w-[calc(100%-16rem)] ml-64' : 'max-w-[calc(100%-4rem)] ml-16'
              )}
            >
              <div className="flex items-center gap-3">
                <span>UI Extractor</span>
                <span className="text-muted-foreground/40">|</span>
                <span>URL -&gt; Teardown -&gt; Deconstruct -&gt; Spec -&gt; Generate</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>System Active</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
