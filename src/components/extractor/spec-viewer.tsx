'use client';

import type { SpecData } from '@/types/extractor';
import { Badge } from '@/components/ui/badge';

export function SpecViewer({ specJson }: { specJson: string }) {
  const spec: SpecData | null = (() => {
    try { return JSON.parse(specJson); } catch { return null; }
  })();

  if (!spec) {
    return (
      <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-[11px] font-mono text-muted-foreground">
        {specJson}
      </pre>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      {spec.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{spec.description}</p>
      )}
      {spec.props?.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Props</p>
          <div className="space-y-1.5">
            {spec.props.map((prop, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{prop.name}</code>
                <span className="text-muted-foreground">{prop.type}</span>
                {prop.default && <span className="text-muted-foreground">= {prop.default}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {spec.variants?.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Variants</p>
          <div className="flex flex-wrap gap-1">
            {spec.variants.map((v, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>
            ))}
          </div>
        </div>
      )}
      {spec.accessibility?.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accessibility</p>
          <ul className="space-y-0.5">
            {spec.accessibility.map((a, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">- {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
