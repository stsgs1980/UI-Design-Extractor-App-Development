'use client';

import { useState } from 'react';
import type { ExtractedComponent } from '@/types/extractor';
import { useExtractorStore } from '@/store/extractor-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Code2, Copy, Check, Download, Bookmark } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { toast } from 'sonner';
import { SpecViewer } from './spec-viewer';
import { cn } from '@/lib/utils';

SyntaxHighlighter.registerLanguage('html', html);

interface Props {
  components: ExtractedComponent[];
  isAnalyzing: boolean;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  downloadCode: (code: string, filename: string) => void;
  runAnalyze: () => void;
}

export function ComponentsTab({ components, isAnalyzing, copiedId, copyToClipboard, downloadCode, runAnalyze }: Props) {
  const { addReference } = useExtractorStore();
  const [selected, setSelected] = useState<ExtractedComponent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refName, setRefName] = useState('');
  const [refTags, setRefTags] = useState('');

  const openSaveDialog = () => { setRefName(selected?.name || ''); setRefTags(''); setDialogOpen(true); };

  async function saveAsReference() {
    if (!selected || !refName.trim()) return;
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: refName, componentId: selected.id, html: selected.html, spec: selected.spec,
          tags: refTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) { addReference((await res.json()).reference); toast.success('Saved to references'); setDialogOpen(false); }
    } catch { toast.error('Failed to save reference'); }
  }

  const ext = (f: string) => f === 'react' ? 'tsx' : f === 'vue' ? 'vue' : 'html';

  if (components.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Code2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No components extracted yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">Run analysis to identify UI components.</p>
          <Button className="mt-4" size="sm" onClick={runAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />} Analyze
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-1 pr-3">
          {components.map((comp) => (
            <button key={comp.id} onClick={() => setSelected(comp)}
              className={cn('w-full rounded-lg border p-3 text-left transition-colors',
                selected?.id === comp.id ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/50')}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{comp.name}</p>
                {comp.tag && <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{comp.tag}</Badge>}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                {comp.spec && <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-600 dark:text-violet-400">Spec</span>}
                {comp.generatedCode && <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Code</span>}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {selected ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold">{selected.name}</h3>
              {selected.tag && <p className="mt-0.5 text-xs text-muted-foreground">Element: &lt;{selected.tag}&gt;</p>}
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8" onClick={openSaveDialog}><Bookmark className="mr-1.5 h-3 w-3" /> Save</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Save as Reference</DialogTitle><DialogDescription>Save this component to your reference library.</DialogDescription></DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2"><Label>Reference Name</Label><Input value={refName} onChange={(e) => setRefName(e.target.value)} placeholder={selected.name} /></div>
                  <div className="space-y-2"><Label>Tags (comma separated)</Label><Input value={refTags} onChange={(e) => setRefTags(e.target.value)} placeholder="button, primary, cta" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={saveAsReference} disabled={!refName.trim()}>Save Reference</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-5 space-y-5">
            {selected.cssClasses && (
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">CSS Classes</p>
                <div className="flex flex-wrap gap-1">{selected.cssClasses.split(' ').filter(Boolean).map((c) => <Badge key={c} variant="outline" className="text-[10px] font-mono">.{c}</Badge>)}</div>
              </div>)}
            {selected.inlineStyles && (
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Inline Styles</p>
                <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-[11px] font-mono text-muted-foreground">{selected.inlineStyles}</pre>
              </div>)}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">HTML Structure</p>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(selected.html, `comp-${selected.id}`)}>
                  {copiedId === `comp-${selected.id}` ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <div className="max-h-48 overflow-auto rounded-lg bg-muted p-3">
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all">{selected.html}</pre>
              </div>
            </div>
            {selected.spec && (
              <div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Component Spec</p><SpecViewer specJson={selected.spec} /></div>)}
            {selected.generatedCode && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Generated Code ({selected.codeFormat})</p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(selected.generatedCode || '', `gen-${selected.id}`)}>
                      {copiedId === `gen-${selected.id}` ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3 w-3" />}</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => downloadCode(selected.generatedCode || '', `${selected.name}.${ext(selected.codeFormat)}`)}>
                      <Download className="h-3 w-3" /></Button>
                  </div>
                </div>
                <SyntaxHighlighter language="html" style={atomOneDark} customStyle={{ borderRadius: '8px', fontSize: '12px', margin: 0, maxHeight: '300px' }}>{selected.generatedCode}</SyntaxHighlighter>
              </div>)}
          </div>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">Select a component to view details</p>
        </div>
      )}
    </div>
  );
}
