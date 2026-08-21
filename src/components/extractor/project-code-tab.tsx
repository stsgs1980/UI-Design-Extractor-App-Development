'use client';

import type { ExtractedComponent, CodeFormat, Project } from '@/types/extractor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Code2, Copy, Check, Download, Play } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('html', html);

interface Props {
  project: Project;
  components: ExtractedComponent[];
  codeFormat: CodeFormat;
  setCodeFormat: (v: CodeFormat) => void;
  isGenerating: boolean;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  downloadCode: (code: string, filename: string) => void;
  runGenerate: () => void;
  runFullPipeline: () => void;
}

export function CodeTab({
  project, components, codeFormat, setCodeFormat, isGenerating, copiedId, copyToClipboard, downloadCode, runGenerate, runFullPipeline,
}: Props) {
  const withCode = components.filter((c) => c.generatedCode);
  const ext = (f: string) => f === 'react' ? 'tsx' : f === 'vue' ? 'vue' : 'html';

  if (withCode.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Code2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No generated code yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Complete the pipeline to generate reusable component code.</p>
          <Button className="mt-4" size="sm" onClick={runFullPipeline}>
            <Play className="mr-2 h-4 w-4" /> Run Full Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />} Generate
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const allCode = withCode.map((c) => `<!-- ${c.name} -->\n${c.generatedCode}`).join('\n\n');
          if (allCode) downloadCode(allCode, `${project.name}-components.html`);
        }}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download All
        </Button>
      </div>

      <div className="space-y-4">
        {withCode.map((comp) => (
          <div key={comp.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{comp.name}</h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(comp.generatedCode || '', `full-${comp.id}`)}>
                  {copiedId === `full-${comp.id}` ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => downloadCode(comp.generatedCode || '', `${comp.name}.${ext(comp.codeFormat)}`)}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="mt-3">
              <SyntaxHighlighter
                language={comp.codeFormat === 'react' ? 'jsx' : comp.codeFormat === 'vue' ? 'xml' : 'html'}
                style={atomOneDark}
                customStyle={{ borderRadius: '8px', fontSize: '12px', margin: 0, maxHeight: '400px' }}
              >
                {comp.generatedCode || ''}
              </SyntaxHighlighter>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
