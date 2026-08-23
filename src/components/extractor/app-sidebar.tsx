'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useExtractorStore } from '@/store/extractor-store';
import {
  LayoutDashboard,
  Link,
  FolderOpen,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppView } from '@/types/extractor';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'extract', label: 'New Extraction', icon: Link, badge: 'New' },
  { id: 'references', label: 'References', icon: FolderOpen },
];

export function AppSidebar() {
  const { currentView, setView, sidebarOpen, toggleSidebar, projects, removeProject } = useExtractorStore();
  const recentProjects = (projects || []).slice(0, 5);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeleteProject(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    console.log('[sidebar] delete requested for project:', id);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      console.log('[sidebar] DELETE response status:', res.status);
      if (res.ok) {
        removeProject(id);
        toast.success('Project deleted');
        console.log('[sidebar] project removed from store:', id);
      } else {
        const body = await res.text();
        console.error('[sidebar] DELETE failed:', res.status, body);
        toast.error('Failed to delete project');
      }
    } catch (err) {
      console.error('[sidebar] DELETE exception:', err);
      toast.error('Failed to delete project');
    }
    setDeletingId(null);
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out',
        sidebarOpen ? 'w-[260px]' : 'w-[68px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-[60px] items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Layers className="h-4 w-4" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">UI Extractor</span>
            <span className="text-[11px] text-sidebar-foreground/50">Deconstruct any website</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sidebarOpen && (
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Menu
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg text-[13px] font-medium transition-colors',
                  sidebarOpen ? 'px-3 py-2' : 'justify-center px-2 py-2',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-sidebar-primary')} />
                {sidebarOpen && <span>{item.label}</span>}
                {item.badge && sidebarOpen && (
                  <span className="ml-auto rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && sidebarOpen && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
              Recent
            </p>
            <div className="space-y-0.5">
              {recentProjects.map((project) => {
                const isActive = currentView === 'project' && useExtractorStore.getState().selectedProjectId === project.id;
                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => useExtractorStore.getState().selectProject(project.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') useExtractorStore.getState().selectProject(project.id); }}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors cursor-pointer',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        project.status === 'completed' ? 'bg-emerald-500' : 'bg-sidebar-foreground/30'
                      )}
                    />
                    <span className="truncate text-xs flex-1">{project.name}</span>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      disabled={deletingId === project.id}
                      className="shrink-0 rounded p-0.5 text-sidebar-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label={"Delete " + project.name}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3 space-y-0.5">
        {sidebarOpen && (
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/70"
            onClick={() => {}}
          >
            <Command className="h-3.5 w-3.5" />
            <span>Command Menu</span>
            <kbd className="ml-auto rounded border border-sidebar-border bg-sidebar-accent/50 px-1 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            sidebarOpen ? 'gap-2' : 'justify-center'
          )}
        >
          {sidebarOpen ? (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
