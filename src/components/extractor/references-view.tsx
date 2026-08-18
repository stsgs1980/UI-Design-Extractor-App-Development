'use client';

import { useEffect, useState, useCallback } from 'react';
import { useExtractorStore } from '@/store/extractor-store';
import type { Reference } from '@/types/extractor';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FolderOpen,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Loader2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('html', html);

export function ReferencesView() {
  const { references, setReferences, removeReference, addReference } = useExtractorStore();
  const [search, setSearch] = useState('');
  const [selectedRef, setSelectedRef] = useState<Reference | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHtml, setNewHtml] = useState('');
  const [newTags, setNewTags] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regenResult, setRegenResult] = useState<string | null>(null);

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch('/api/references');
      if (res.ok) {
        const data = await res.json();
        setReferences(Array.isArray(data) ? data : data.references || []);
      }
    } catch {
      // ignore
    }
  }, [setReferences]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
      if (res.ok) {
        removeReference(id);
        if (selectedRef?.id === id) setSelectedRef(null);
        toast.success('Reference deleted');
      }
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newHtml.trim()) return;
    try {
      const res = await fetch('/api/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          html: newHtml,
          tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addReference(data.reference || data);
        setCreateOpen(false);
        setNewName('');
        setNewHtml('');
        setNewTags('');
        toast.success('Reference created');
      }
    } catch {
      toast.error('Failed to create reference');
    }
  }

  async function handleRegenerate(id: string) {
    setRegenerating(id);
    setRegenResult(null);
    try {
      const res = await fetch(`/api/references/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          setRegenResult(data.code);
        }
        toast.success('Regeneration complete');
        fetchReferences();
      }
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegenerating(null);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const safeRefs = references || [];
  const filtered = safeRefs.filter((ref) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ref.name.toLowerCase().includes(q) ||
      ref.tags.toLowerCase().includes(q) ||
      (ref.description && ref.description.toLowerCase().includes(q))
    );
  });

  const favorites = filtered.filter((r) => r.isFavorite);
  const others = filtered.filter((r) => !r.isFavorite);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reference Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save and catalog component references. Regenerate code from saved specs.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Reference
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Reference</DialogTitle>
              <DialogDescription>Manually create a component reference for your library.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Primary Button" />
              </div>
              <div className="space-y-2">
                <Label>HTML</Label>
                <Textarea
                  value={newHtml}
                  onChange={(e) => setNewHtml(e.target.value)}
                  placeholder="Paste component HTML here..."
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="button, primary, cta" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || !newHtml.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search references by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 text-sm font-semibold">
              {search ? 'No matching references' : 'No references saved yet'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search
                ? 'Try a different search term.'
                : 'Save components from your extractions to build a reference library.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3 pr-3">
              {favorites.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Favorites
                  </p>
                  <div className="space-y-1.5">
                    {favorites.map((ref) => (
                      <RefCard
                        key={ref.id}
                        reference={ref}
                        isSelected={selectedRef?.id === ref.id}
                        onClick={() => { setSelectedRef(ref); setRegenResult(null); }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {others.length > 0 && (
                <div>
                  {favorites.length > 0 && (
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      All References
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {others.map((ref) => (
                      <RefCard
                        key={ref.id}
                        reference={ref}
                        isSelected={selectedRef?.id === ref.id}
                        onClick={() => { setSelectedRef(ref); setRegenResult(null); }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedRef ? (
            <div className="space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedRef.name}</CardTitle>
                      {selectedRef.description && (
                        <CardDescription className="mt-0.5">{selectedRef.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(selectedRef.id)}
                        disabled={regenerating === selectedRef.id}
                      >
                        {regenerating === selectedRef.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(selectedRef.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedRef.sourceUrl && (
                      <a
                        href={selectedRef.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Source <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {JSON.parse(selectedRef.tags || '[]').map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">HTML</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(selectedRef.html, `ref-${selectedRef.id}`)}
                      >
                        {copiedId === `ref-${selectedRef.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <SyntaxHighlighter
                      language="html"
                      style={atomOneDark}
                      customStyle={{ borderRadius: '8px', fontSize: '11px', margin: 0, maxHeight: '300px' }}
                    >
                      {selectedRef.html}
                    </SyntaxHighlighter>
                  </div>

                  {regenResult && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Regenerated Code</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(regenResult, `regen-${selectedRef.id}`)}
                        >
                          {copiedId === `regen-${selectedRef.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <SyntaxHighlighter
                        language="html"
                        style={atomOneDark}
                        customStyle={{ borderRadius: '8px', fontSize: '11px', margin: 0, maxHeight: '300px' }}
                      >
                        {regenResult}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">Select a reference to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RefCard({
  reference,
  isSelected,
  onClick,
}: {
  reference: Reference;
  isSelected: boolean;
  onClick: () => void;
}) {
  const tags: string[] = JSON.parse(reference.tags || '[]');

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card/50 hover:bg-card'
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="truncate text-sm font-medium">{reference.name}</p>
        {reference.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
      </div>
      {reference.sourceUrl && (
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {new URL(reference.sourceUrl).hostname}
        </p>
      )}
      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
          )}
        </div>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {new Date(reference.createdAt).toLocaleDateString()}
      </p>
    </button>
  );
}
