"use client";

import type { SpecData } from "@/types/extractor";
import { Badge } from "@/components/ui/badge";

export function SpecViewer({ specJson }: { specJson: string }) {
  const spec: SpecData | null = (() => {
    try {
      return JSON.parse(specJson);
    } catch {
      return null;
    }
  })();

  if (!spec) {
    return (
      <pre className="bg-muted/50 text-muted-foreground max-h-32 overflow-auto rounded-lg p-2 font-mono text-[11px]">
        {specJson}
      </pre>
    );
  }

  return (
    <div className="border-border bg-background/50 space-y-3 rounded-lg border p-3">
      {spec.description && <p className="text-muted-foreground text-xs">{spec.description}</p>}
      {spec.props && spec.props.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
            Props
          </p>
          <div className="space-y-1">
            {spec.props.map((prop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                  {prop.name}
                </code>
                <span className="text-muted-foreground">{prop.type}</span>
                {prop.default && <span className="text-muted-foreground">= {prop.default}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {spec.variants && spec.variants.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
            Variants
          </p>
          <div className="flex flex-wrap gap-1">
            {spec.variants.map((v, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {v}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {spec.accessibility && spec.accessibility.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
            Accessibility
          </p>
          <ul className="space-y-0.5">
            {spec.accessibility.map((a, i) => (
              <li key={i} className="text-muted-foreground text-[11px]">
                - {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
