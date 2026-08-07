"use client";

import {
  Palette,
  MoveHorizontal,
  Type,
  Square,
  Layers,
  CircleDot,
  Play,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DesignToken } from "@/types/extractor";

const TOKEN_ICON_MAP: Record<string, React.ElementType> = {
  Palette,
  MoveHorizontal,
  Type,
  Square,
  Layers,
  CircleDot,
};

type TokenGridProps = {
  categories: Record<string, DesignToken[]>;
  codeFormat: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onSetCodeFormat: (v: string) => void;
  onCopy: (text: string, id: string) => void;
  onGenerateCode: () => void;
  isGeneratingCode: boolean;
  copiedId: string | null;
};

export function TokenGrid({
  categories,
  codeFormat,
  isGenerating,
  onGenerate,
  onSetCodeFormat,
  onCopy,
  onGenerateCode,
  isGeneratingCode,
  copiedId,
}: TokenGridProps) {
  const hasTokens = Object.keys(categories).length > 0;

  if (!hasTokens) {
    return (
      <Card className="bg-card/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Palette className="text-muted-foreground h-8 w-8" />
          <h3 className="mt-4 text-sm font-semibold">No design tokens extracted</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Run analysis to extract design tokens from the page.
          </p>
          <Button className="mt-4" size="sm" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? "Loading..." : "Extract Tokens"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <Select value={codeFormat} onValueChange={(v) => onSetCodeFormat(v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="react">React JSX</SelectItem>
            <SelectItem value="vue">Vue SFC</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onGenerateCode} disabled={isGeneratingCode} size="sm">
          {isGeneratingCode ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Generate Code
        </Button>
      </div>
      {Object.entries(categories).map(([category, categoryTokens]) => {
        const IconComp = TOKEN_ICON_MAP[category] || CircleDot;
        return (
          <Card key={category} className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <IconComp className="h-4 w-4" />
                {category.charAt(0).toUpperCase() + category.slice(1)}
                <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  {categoryTokens.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryTokens.map((token) => (
                  <div
                    key={token.id}
                    className="border-border bg-background/50 flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{token.name}</p>
                      {token.originalVar && (
                        <p className="text-muted-foreground truncate font-mono text-[10px]">
                          {token.originalVar}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      {token.category === "color" && (
                        <div
                          className="border-border h-5 w-5 rounded-md border"
                          style={{ backgroundColor: token.value }}
                        />
                      )}
                      <code className="text-muted-foreground font-mono text-[10px]">
                        {token.value}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => onCopy(token.value, `token-${token.id}`)}
                      >
                        {copiedId === `token-${token.id}` ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
