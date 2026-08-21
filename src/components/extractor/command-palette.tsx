'use client';

import { useEffect, useState, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Link,
  FolderOpen,
  Search,
  ArrowRight,
  Layers,
  Settings2,
} from 'lucide-react';

const NAV_COMMANDS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { id: 'extract', label: 'New Extraction', icon: Link, shortcut: 'G N' },
  { id: 'references', label: 'Reference Library', icon: FolderOpen, shortcut: 'G R' },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { setView, projects, selectProject, toggleSidebar } = useExtractorStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
      }

      // Shortcut: G then D/N/R
      if (e.key === 'g') {
        const handler = (ev: KeyboardEvent) => {
          if (ev.key === 'd') { setView('dashboard'); setOpen(false); }
          if (ev.key === 'n') { setView('extract'); setOpen(false); }
          if (ev.key === 'r') { setView('references'); setOpen(false); }
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setView]);

  const handleSelect = useCallback(
    (action: () => void) => {
      action();
      setOpen(false);
      setQuery('');
    },
    []
  );

  const safeProjects = projects || [];
  const filteredProjects = query
    ? safeProjects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.url.toLowerCase().includes(query.toLowerCase())
      )
    : safeProjects.slice(0, 5);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery(''); }}
      />

      {/* Dialog */}
      <div className="relative mx-auto mt-[15vh] max-w-lg">
        <Command className="rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="flex items-center border-b border-border px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {NAV_COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <Command.Item
                    key={cmd.id}
                    onSelect={() => handleSelect(() => setView(cmd.id as 'dashboard' | 'extract' | 'references'))}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{cmd.label}</span>
                    <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                      {cmd.shortcut}
                    </kbd>
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Actions */}
            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              <Command.Item
                onSelect={() => handleSelect(toggleSidebar)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">Toggle Sidebar</span>
                <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                  [
                </kbd>
              </Command.Item>
            </Command.Group>

            {/* Recent Projects */}
            {safeProjects.length > 0 && (
              <Command.Group heading="Recent Projects" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {filteredProjects.map((project) => (
                  <Command.Item
                    key={project.id}
                    onSelect={() => handleSelect(() => selectProject(project.id))}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{project.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{project.url}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
              <span>to toggle</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>
              <span>navigate</span>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              <span>select</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
