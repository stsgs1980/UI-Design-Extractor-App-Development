'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Terminal, RefreshCw, Copy, Check, Database, FilterX, ArrowDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LogViewer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');
  const [hidePrisma, setHidePrisma] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const prevLineCount = useRef(0);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLines(data.lines || []);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    }
  }, []);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // When dialog opens, fetch logs
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened — schedule fetch outside of this render
      const id = setTimeout(() => { if (mountedRef.current) fetchLogs(); }, 0);
      return () => clearTimeout(id);
    }
    prevOpenRef.current = open;
  }, [open, fetchLogs]);

  // Track if user scrolled up (disable auto-scroll)
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    autoScrollRef.current = atBottom;
  }

  const filtered = useMemo(() => {
    let result = lines;
    if (hidePrisma) {
      result = result.filter((l) => !l.startsWith('prisma:'));
    }
    if (filter) {
      const q = filter.toLowerCase();
      result = result.filter((l) => l.toLowerCase().includes(q));
    }
    return result;
  }, [lines, hidePrisma, filter]);

  const visibleCount = filtered.length;
  const prismaCount = lines.filter((l) => l.startsWith('prisma:')).length;

  // Auto-scroll to bottom when new lines arrive (only if user is already at bottom)
  useEffect(() => {
    if (!autoScrollRef.current || !scrollRef.current) return;
    if (filtered.length <= prevLineCount.current) return;
    prevLineCount.current = filtered.length;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filtered.length]);

  async function handleCopy() {
    await navigator.clipboard.writeText(filtered.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRefresh() {
    prevLineCount.current = 0;
    autoScrollRef.current = true;
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }

  function handleScrollToBottom() {
    autoScrollRef.current = true;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }

  async function handleClear() {
    await fetch('/api/logs', { method: 'POST' });
    setLines([]);
    setTotal(0);
    prevLineCount.current = 0;
    autoScrollRef.current = true;
  }

  // Reset on open
  useEffect(() => {
    if (open) {
      prevLineCount.current = 0;
      autoScrollRef.current = true;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden"
        showCloseButton={true}
      >
        {/* Inner wrapper with fixed height and its own flex layout.
            This guarantees scroll works regardless of DialogContent's base classes (grid etc.). */}
        <div className="flex h-[70vh] flex-col overflow-hidden">
          {/* Header — fixed height */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <DialogTitle className="text-sm font-medium">dev.log</DialogTitle>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {total} lines
              </span>
              {hidePrisma && prismaCount > 0 && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  ({prismaCount} prisma hidden)
                </span>
              )}
              {filter && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  / {visibleCount} shown
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-7 w-36 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                variant={hidePrisma ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setHidePrisma(!hidePrisma)}
                title={hidePrisma ? 'Show prisma queries' : 'Hide prisma queries'}
              >
                <Database className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClear}
                title="Clear logs"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy visible lines"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Log content — native scroll, takes all remaining space */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="font-mono text-[11px] leading-5">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground">
                  {filter ? (
                    <div className="flex flex-col items-center gap-2">
                      <FilterX className="h-5 w-5" />
                      <span>No matches for &quot;{filter}&quot;</span>
                    </div>
                  ) : (
                    <span>{loading ? 'Loading...' : 'No logs yet'}</span>
                  )}
                </div>
              ) : (
                filtered.map((line, i) => (
                  <div
                    key={`${i}-${line.length}`}
                    className={cn(
                      'border-b border-border/30 px-4 py-px whitespace-pre-wrap break-all hover:bg-muted/30 transition-colors',
                      getLineColor(line),
                    )}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer — fixed height */}
          <div className="flex items-center justify-between border-t border-border px-4 py-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {visibleCount} line{visibleCount !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] gap-1"
              onClick={handleScrollToBottom}
            >
              <ArrowDown className="h-3 w-3" />
              Jump to bottom
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getLineColor(line: string): string {
  if (line.startsWith('prisma:')) return 'text-muted-foreground/40';
  if (line.includes('[api:')) return 'text-blue-600 dark:text-blue-400';
  if (line.includes('[pipeline')) return 'text-amber-600 dark:text-amber-400';
  if (line.includes('[sidebar]')) return 'text-violet-600 dark:text-violet-400';
  if (line.includes('[dashboard]')) return 'text-emerald-600 dark:text-emerald-400';
  if (line.includes('[safe-update]')) return 'text-cyan-600 dark:text-cyan-400';
  if (line.includes('[extract')) return 'text-orange-600 dark:text-orange-400';
  if (/\b(error|FAIL|500|P2025)\b/i.test(line)) return 'text-red-500';
  if (line.includes('Compiled') && !line.includes('error')) return 'text-emerald-600 dark:text-emerald-400 font-medium';
  return '';
}
