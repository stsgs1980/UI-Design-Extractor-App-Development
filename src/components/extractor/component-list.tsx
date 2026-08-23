"use client";

import { Button } from "@/components/ui/button";
import { Code2 } from "lucide-react";
import type { ExtractedComponent } from "@/types/extractor";

type ComponentListProps = {
  components: ExtractedComponent[];
  selectedId: string | null;
  onSelect: (comp: ExtractedComponent) => void;
};

export function ComponentList({ components, selectedId, onSelect }: ComponentListProps) {
  return (
    <div className="space-y-1.5">
      {components.map((comp) => (
        <Button
          key={comp.id}
          variant={selectedId === comp.id ? "secondary" : "ghost"}
          className="h-auto w-full justify-start px-3 py-2"
          onClick={() => onSelect(comp)}
        >
          <div className="flex w-full items-center gap-2">
            <Code2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">{comp.name}</span>
            {comp.spec && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}
            {comp.generatedCode && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}
