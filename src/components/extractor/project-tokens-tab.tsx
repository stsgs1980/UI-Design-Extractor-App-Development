'use client';

import type { DesignToken, CodeFormat } from '@/types/extractor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette, Copy, Check, Play, Type, MoveHorizontal, Square, Layers, CircleDot } from 'lucide-react';

const TOKEN_ICON_MAP: Record<string, React.ElementType> = {
  color: Palette, spacing: MoveHorizontal, typography: Type,
  'border-radius': Square, shadow: Layers, opacity: CircleDot,
};

interface Props {
  tokens: DesignToken[];
  codeFormat: CodeFormat;
  setCodeFormat: (v: CodeFormat) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  runGenerate: () => void;
  runAnalyze: () => void;
}

export function TokensTab({
  tokens, codeFormat, setCodeFormat, isGenerating, isAnalyzing, copiedId, copyToClipboard, runGenerate, runAnalyze,
}: Props) {
  const categories = tokens.reduce<Record<string, DesignToken[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  if (tokens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Palette className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No design tokens extracted</h3>
          <p className="mt-1 text-xs text-muted-foreground">Run analysis to extract design tokens.</p>
          <Button className="mt-4" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />} Extract Tokens
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={codeFormat} onValueChange={(v) => setCodeFormat(v as CodeFormat)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="react">React JSX</SelectItem>
            <SelectItem value="vue">Vue SFC</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={runGenerate} disabled={isGenerating} size="sm">
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Generate Code
        </Button>
      </div>

      {Object.entries(categories).map(([category, catTokens]) => {
        const Icon = TOKEN_ICON_MAP[category] || CircleDot;
        return (
          <div key={category} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              <Badge variant="secondary" className="text-[10px]">{catTokens.length}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{token.name}</p>
                    {token.originalVar && <p className="truncate text-[10px] text-muted-foreground font-mono">{token.originalVar}</p>}
                  </div>
                  <div className="ml-2 shrink-0 flex items-center gap-2">
                    {token.category === 'color' && (
                      <div className="h-5 w-5 rounded-md border border-border" style={{ backgroundColor: token.value }} />
                    )}
                    <code className="text-[10px] font-mono text-muted-foreground">{token.value}</code>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(token.value, `token-${token.id}`)}>
                      {copiedId === `token-${token.id}` ? <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
