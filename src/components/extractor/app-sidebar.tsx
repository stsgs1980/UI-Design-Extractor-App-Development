'use client';

import { cn } from '@/lib/utils';
import { useExtractorStore } from '@/store/extractor-store';
import {
  LayoutDashboard,
  Link,
  FolderOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AppView } from '@/types/extractor';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'extract', label: 'New Extraction', icon: Link },
  { id: 'references', label: 'References', icon: FolderOpen },
];

export function AppSidebar() {
  const { currentView, setView, sidebarOpen, toggleSidebar, projects } = useExtractorStore();

  const recentProjects = (projects || []).slice(0, 5);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Layers className="h-4 w-4 text-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold tracking-tight">UI Extractor</span>
            <span className="text-[10px] text-muted-foreground">Deconstruct any website</span>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <div className={cn('mb-2', !sidebarOpen && 'mb-1')}>
          {sidebarOpen && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            const button = (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                  !sidebarOpen && 'justify-center px-2'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {item.id === 'extract' && sidebarOpen && (
                  <span className="ml-auto flex h-5 items-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                    <Zap className="mr-0.5 h-2.5 w-2.5" />
                    New
                  </span>
                )}
              </button>
            );

            if (!sidebarOpen) {
              return (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return button;
          })}
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && sidebarOpen && (
          <div className="mt-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Projects
            </p>
            <div className="space-y-0.5">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    useExtractorStore.getState().selectProject(project.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                    currentView === 'project' &&
                      useExtractorStore.getState().selectedProjectId === project.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
                >
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <span className="truncate text-xs">{project.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn('w-full', sidebarOpen ? 'justify-start gap-2' : 'justify-center')}
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}