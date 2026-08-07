import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function cleanSdkError(raw: string): string {
  let cleaned = raw
    .replace(/\\u003c[^>]*\\u003e/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/Function invoke failed with status \d+: /, "")
    .replace(/Page reader failed: /, "")
    .replace(/request failed with status \d+: /, "")
    .replace(/\s*\{.*\}\s*/, "")
    .trim();
  if (!cleaned)
    cleaned = "Page fetch failed. The site may be unreachable or blocking automated requests.";
  return cleaned;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.project.update({
      where: { id },
      data: { status: "extracting", error: null },
    });

    const zai = await ZAI.create();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await zai.functions.invoke("page_reader", { url: project.url });
        const pageTitle = result.data?.title || "";
        const rawHtml = result.data?.html || "";
        if (!rawHtml) throw new Error("Empty HTML received");

        const updated = await db.project.update({
          where: { id },
          data: { pageTitle, rawHtml, status: "extracted" },
        });
        return NextResponse.json(updated);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`re-extract attempt ${attempt}/3 failed, retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    const userMsg = cleanSdkError(lastError?.message || "Extraction failed");
    await db.project.update({
      where: { id },
      data: { status: "failed", error: userMsg },
    });
    return NextResponse.json({ error: userMsg }, { status: 422 });
  } catch (error) {
    console.error("Re-extract failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Re-extract failed" },
      { status: 500 },
    );
  }
}
