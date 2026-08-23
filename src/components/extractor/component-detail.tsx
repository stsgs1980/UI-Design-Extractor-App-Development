"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  Download,
  Star,
  Code2,
  FileText,
  FileCode2,
  Eye,
  Loader2,
} from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import type { ExtractedComponent } from "@/types/extractor";
import { usePreviewCss } from "./hooks/use-preview-css";
import { SpecViewer } from "./spec-viewer";
import { SaveReferenceDialog } from "./save-reference-dialog";

SyntaxHighlighter.registerLanguage("html", html);

const TAB_CLS =
  "data-[state=active]:bg-background data-[state=active]:border-primary h-7 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:shadow-sm";

type ComponentDetailProps = {
  component: ExtractedComponent;
  project: { id: string; pageCss: string | null; rawHtml: string | null } | null;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onSaveReference: (componentId: string, html: string, spec: string | null) => Promise<boolean>;
  onDownload: (code: string, filename: string) => void;
};

export function ComponentDetail({
  component,
  project,
  copiedId,
  onCopy,
  onSaveReference,
  onDownload,
}: ComponentDetailProps) {
  const [compDetailTab, setCompDetailTab] = useState("preview");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [refName, setRefName] = useState("");
  const [refTags, setRefTags] = useState("");
  const { previewHtml, previewLoading } = usePreviewCss(component, project);

  return (
    <Card className="bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm">{component.name}</CardTitle>
            {component.tag && (
              <Badge variant="outline" className="mt-1 text-[10px]">
                &lt;{component.tag}&gt;
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setSaveDialogOpen(true)}
          >
            <Star className="mr-1.5 h-3 w-3" /> Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={compDetailTab} onValueChange={setCompDetailTab}>
          <TabsList className="bg-muted/50 h-8 w-full justify-start p-0">
            <TabsTrigger value="preview" className={TAB_CLS}>
              <Eye className="mr-1.5 h-3 w-3" /> Preview
            </TabsTrigger>
            <TabsTrigger value="html" className={TAB_CLS}>
              <Code2 className="mr-1.5 h-3 w-3" /> HTML
            </TabsTrigger>
            {component.spec && (
              <TabsTrigger value="spec" className={TAB_CLS}>
                <FileText className="mr-1.5 h-3 w-3" /> Spec
              </TabsTrigger>
            )}
            {component.generatedCode && (
              <TabsTrigger value="code" className={TAB_CLS}>
                <FileCode2 className="mr-1.5 h-3 w-3" /> Code
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="preview" className="mt-3">
            <div className="overflow-hidden rounded-lg border bg-white">
              <div className="bg-muted/30 flex items-center gap-1.5 border-b px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              {previewLoading ? (
                <div className="flex h-64 items-center justify-center bg-white">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml || ""}
                  sandbox="allow-same-origin"
                  className="h-64 w-full border-0"
                  title={`${component.name} preview`}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="html" className="mt-3 space-y-3">
            {component.cssClasses && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium">CSS Classes</p>
                <div className="flex flex-wrap gap-1">
                  {component.cssClasses
                    .split(" ")
                    .filter(Boolean)
                    .map((cls) => (
                      <Badge key={cls} variant="outline" className="font-mono text-[10px]">
                        .{cls}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {component.inlineStyles && (
              <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-medium">Inline Styles</p>
                <pre className="bg-muted/50 text-muted-foreground max-h-32 overflow-auto rounded-lg p-2 font-mono text-[11px]">
                  {component.inlineStyles}
                </pre>
              </div>
            )}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium">HTML Structure</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => onCopy(component.html, `comp-${component.id}`)}
                >
                  {copiedId === `comp-${component.id}` ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 max-h-48 overflow-auto rounded-lg p-3">
                <pre className="text-muted-foreground font-mono text-[11px] break-all whitespace-pre-wrap">
                  {component.html}
                </pre>
              </div>
            </div>
          </TabsContent>

          {component.spec && (
            <TabsContent value="spec" className="mt-3">
              <SpecViewer specJson={component.spec} />
            </TabsContent>
          )}

          {component.generatedCode && (
            <TabsContent value="code" className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium">
                  Generated Code ({component.codeFormat})
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => onCopy(component.generatedCode || "", `gen-${component.id}`)}
                  >
                    {copiedId === `gen-${component.id}` ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() =>
                      onDownload(
                        component.generatedCode || "",
                        `${component.name}.${component.codeFormat === "REACT" ? "tsx" : component.codeFormat === "VUE" ? "vue" : "html"}`,
                      )
                    }
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <SyntaxHighlighter
                language="html"
                style={atomOneDark}
                customStyle={{
                  borderRadius: "8px",
                  fontSize: "11px",
                  margin: 0,
                  maxHeight: "300px",
                }}
              >
                {component.generatedCode}
              </SyntaxHighlighter>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <SaveReferenceDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        refName={refName}
        onSetRefName={setRefName}
        refTags={refTags}
        onSetRefTags={setRefTags}
        onSave={async () => {
          const ok = await onSaveReference(component.id, component.html, component.spec);
          if (ok) {
            setSaveDialogOpen(false);
            setRefName("");
            setRefTags("");
          }
        }}
        canSave={!refName.trim()}
      />
    </Card>
  );
}
