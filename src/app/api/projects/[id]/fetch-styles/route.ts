import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const reqSchema = z.object({ id: z.string().min(1) });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = reqSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const project = await db.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Return cached CSS if available
  if (project.pageCss) {
    return NextResponse.json({ css: project.pageCss, cached: true });
  }

  // Extract CSS from rawHtml
  const rawHtml = project.rawHtml || "";

  // 1. Extract <style> blocks
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const inlineStyles: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = styleRe.exec(rawHtml)) !== null) {
    inlineStyles.push(match[1].trim());
  }

  // 2. Find external CSS links
  const linkRe = /<link[^>]*href=["']([^"']+?\.css(?:\?[^"']*)?)["'][^>]*>/gi;
  const baseUrl = project.url?.replace(/\/[^/]*$/, "") || "";
  const cssUrls: string[] = [];
  while ((match = linkRe.exec(rawHtml)) !== null) {
    let href = match[1].split("?")[0]; // strip query params
    if (href.startsWith("//")) href = "https:" + href;
    else if (href.startsWith("/")) href = baseUrl + href;
    else if (!href.startsWith("http")) href = baseUrl + "/" + href;
    cssUrls.push(href);
  }

  // Deduplicate
  const uniqueUrls = [...new Set(cssUrls)].slice(0, 20); // limit to 20 CSS files

  // 3. Fetch external CSS (with timeout and error handling)
  const externalCss: string[] = [];
  for (const url of uniqueUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ComponentPreview/1.0)",
        },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const text = await res.text();
        if (text.length < 500000) {
          // skip files > 500KB
          externalCss.push(`/* Source: ${url} */\n${text}`);
        }
      }
    } catch {
      // Skip failed fetches silently
    }
  }

  const combinedCss = [inlineStyles.join("\n\n"), externalCss.join("\n\n")]
    .filter(Boolean)
    .join("\n\n");

  // Cache the result
  await db.project.update({
    where: { id },
    data: { pageCss: combinedCss || null },
  });

  return NextResponse.json({ css: combinedCss, cached: false });
}
