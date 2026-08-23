'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, RefreshCw, Copy, Check } from 'lucide-react';

export function LogViewer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const res = await fetch('/api/logs');
          if (res.ok && !cancelled) {
            const data = await res.json();
            setLines(data.lines || []);
            setTotal(data.total || 0);
          }
        } catch {
          // silent
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const filtered = filter
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  async function handleCopy() {
    await navigator.clipboard.writeText(filtered.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <DialogTitle className="text-sm font-medium">dev.log</DialogTitle>
            <span className="text-xs text-muted-foreground">{total} total lines</span>
            {filtered.length !== lines.length && (
              <span className="text-xs text-muted-foreground">
                (showing {filtered.length} matched)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-7 w-40 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="font-mono text-[11px] leading-5">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground">
                {filter ? 'No matching lines' : 'No logs yet'}
              </div>
            ) : (
              filtered.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'border-b border-border/50 px-5 py-0.5 whitespace-pre-wrap break-all',
                    line.includes('[api:') && 'text-blue-600 dark:text-blue-400',
                    line.includes('[pipeline:') && 'text-amber-600 dark:text-amber-400',
                    line.includes('[sidebar]') && 'text-violet-600 dark:text-violet-400',
                    line.includes('[dashboard]') && 'text-emerald-600 dark:text-emerald-400',
                    line.includes('error') && !line.includes('[api:') && !line.includes('[pipeline:') && !line.includes('[sidebar]') && !line.includes('[dashboard]') && 'text-red-500',
                    line.includes('Compiled') && !line.includes('error') && 'text-emerald-600 dark:text-emerald-400 font-medium',
                  )}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
