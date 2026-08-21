'use client';

import { cn } from '@/lib/utils';
import { useExtractorStore } from '@/store/extractor-store';
import {
  LayoutDashboard,
  Link,
  FolderOpen,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Command,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppView } from '@/types/extractor';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  accent?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'extract', label: 'New Extraction', icon: Link, accent: 'emerald' },
  { id: 'references', label: 'References', icon: FolderOpen, accent: 'violet' },
];

export function AppSidebar() {
  const { currentView, setView, sidebarOpen, toggleSidebar, projects } = useExtractorStore();
  const recentProjects = (projects || []).slice(0, 5);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300 ease-out',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Gradient accent line on right edge */}
      <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent" />

      <div className="relative flex h-full flex-col bg-sidebar/80 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4">
          <motion.div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Layers className="h-4 w-4 text-white" />
          </motion.div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                className="flex flex-col overflow-hidden"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">UI Extractor</span>
                <span className="text-[10px] text-sidebar-foreground/50">Deconstruct any website</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {sidebarOpen && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Menu
              </p>
            )}
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    sidebarOpen ? 'px-3 py-2.5' : 'justify-center px-2 py-2.5',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                  initial={false}
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/20"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={cn('relative h-4 w-4 shrink-0', isActive && 'text-primary')} />
                  {sidebarOpen && (
                    <span className="relative">{item.label}</span>
                  )}
                  {item.id === 'extract' && sidebarOpen && (
                    <span className="relative ml-auto flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                      <Zap className="mr-0.5 h-2.5 w-2.5" />
                      New
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Recent Projects */}
          <AnimatePresence>
            {recentProjects.length > 0 && sidebarOpen && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  Recent
                </p>
                <div className="space-y-0.5">
                  {recentProjects.map((project, i) => (
                    <motion.button
                      key={project.id}
                      onClick={() => useExtractorStore.getState().selectProject(project.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                        currentView === 'project' &&
                          useExtractorStore.getState().selectedProjectId === project.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        project.status === 'completed' ? 'bg-emerald-400' : 'bg-sidebar-foreground/30'
                      )} />
                      <span className="truncate text-xs">{project.name}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-1 border-t border-sidebar-border/50 p-2">
          {/* ⌘K hint */}
          {sidebarOpen && (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
            >
              <Command className="h-3.5 w-3.5" />
              <span>Command Menu</span>
              <kbd className="ml-auto rounded border border-sidebar-border/50 bg-sidebar-accent/50 px-1 py-0.5 font-mono text-[9px]">
                ⌘K
              </kbd>
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
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
      </div>
    </aside>
  );
}
