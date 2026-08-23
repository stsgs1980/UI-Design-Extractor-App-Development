"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtractedComponent, Project } from "@/types/extractor";

export function usePreviewCss(
  selectedComponent: ExtractedComponent | null,
  project: Project | null,
) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const lastComponentId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedComponent || !project?.id) return;
    if (selectedComponent.id === lastComponentId.current) return;
    lastComponentId.current = selectedComponent.id;

    let cancelled = false;
    const id = selectedComponent.id;

    const buildPreview = async () => {
      setPreviewLoading(true);
      let css = project.pageCss || "";
      if (!css && project.rawHtml) {
        try {
          const res = await fetch(`/api/projects/${project.id}/fetch-styles`);
          if (res.ok) {
            const data = await res.json();
            css = data.css || "";
          }
        } catch {
          // fallback to inline styles only
        }
      }
      if (cancelled) return;

      if (!css && project.rawHtml) {
        const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        const blocks: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = re.exec(project.rawHtml)) !== null) blocks.push(m[1].trim());
        css = blocks.join("\n\n");
      }

      const inline = selectedComponent.inlineStyles || "";
      const doc = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 16px; }
  img { max-width: 100%; height: auto; }
  a { color: inherit; text-decoration: none; }
  ${css}
  ${inline}
</style>
</head><body>${selectedComponent.html}</body></html>`;

      if (!cancelled) {
        setPreviewHtml(doc);
        setPreviewLoading(false);
      }
    };

    buildPreview();
    return () => {
      cancelled = true;
      lastComponentId.current = null;
    };
  }, [selectedComponent, project]);

  return { previewHtml, previewLoading };
}
