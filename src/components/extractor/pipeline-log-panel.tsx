"use client";

import { X, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogEntry = {
  ts: string;
  level: string;
  step: string;
  message: string;
  component?: string;
};

export function PipelineLogPanel({ logs, onDismiss }: { logs: LogEntry[]; onDismiss: () => void }) {
  return (
    <div className="border-border bg-card/80 rounded-lg border backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Terminal className="text-muted-foreground h-3.5 w-3.5" />
          Pipeline Logs
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDismiss}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="h-48">
        <div className="space-y-0.5 p-2">
          {logs.map((entry, i) => {
            const time = new Date(entry.ts).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const colorClass =
              entry.level === "error"
                ? "text-red-500"
                : entry.level === "warn"
                  ? "text-amber-500"
                  : "text-muted-foreground";
            return (
              <div key={i} className="flex gap-2 font-mono text-[11px]">
                <span className="text-muted-foreground/60 shrink-0">{time}</span>
                <span className={`w-8 shrink-0 font-medium uppercase ${colorClass}`}>
                  {entry.level}
                </span>
                <span className="text-muted-foreground/60 shrink-0">[{entry.step}]</span>
                <span className="text-foreground">{entry.message}</span>
                {entry.component && (
                  <span className="text-muted-foreground/50 ml-auto shrink-0">
                    {entry.component}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
