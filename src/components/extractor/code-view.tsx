"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Download, Play, Code2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import type { ExtractedComponent, CodeFormat } from "@/types/extractor";

SyntaxHighlighter.registerLanguage("html", html);

type CodeViewProps = {
  components: ExtractedComponent[];
  projectName: string;
  codeFormat: CodeFormat;
  isGenerating: boolean;
  onGenerate: () => void;
  onSetCodeFormat: (v: CodeFormat) => void;
  onCopy: (text: string, id: string) => void;
  onDownload: (code: string, filename: string) => void;
  onPipeline: () => void;
  copiedId: string | null;
};

export function CodeView({
  components,
  projectName,
  codeFormat,
  isGenerating,
  onGenerate,
  onSetCodeFormat,
  onCopy,
  onDownload,
  onPipeline,
  copiedId,
}: CodeViewProps) {
  const withCode = components.filter((c) => c.generatedCode);

  if (withCode.length === 0) {
    return (
      <Card className="bg-card/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Code2 className="text-muted-foreground h-8 w-8" />
          <h3 className="mt-4 text-sm font-semibold">No generated code yet</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Complete the pipeline to generate reusable component code.
          </p>
          <Button className="mt-4" size="sm" onClick={onPipeline}>
            <Play className="mr-2 h-4 w-4" /> Run Full Pipeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={codeFormat} onValueChange={(v) => onSetCodeFormat(v as CodeFormat)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="react">React JSX</SelectItem>
              <SelectItem value="vue">Vue SFC</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onGenerate} disabled={isGenerating} size="sm">
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allCode = withCode
              .map((c) => `<!-- ${c.name} -->\n${c.generatedCode}`)
              .join("\n\n");
            if (allCode) onDownload(allCode, `${projectName}-components.html`);
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download All
        </Button>
      </div>
      {withCode.map((comp) => (
        <Card key={comp.id} className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">{comp.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {comp.codeFormat}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onCopy(comp.generatedCode || "", `full-${comp.id}`)}
                >
                  {copiedId === `full-${comp.id}` ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() =>
                    onDownload(
                      comp.generatedCode || "",
                      `${comp.name}.${comp.codeFormat === "react" ? "tsx" : comp.codeFormat === "vue" ? "vue" : "html"}`,
                    )
                  }
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SyntaxHighlighter
              language={
                comp.codeFormat === "react" ? "jsx" : comp.codeFormat === "vue" ? "xml" : "html"
              }
              style={atomOneDark}
              customStyle={{ borderRadius: "8px", fontSize: "11px", margin: 0, maxHeight: "400px" }}
            >
              {comp.generatedCode || ""}
            </SyntaxHighlighter>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
