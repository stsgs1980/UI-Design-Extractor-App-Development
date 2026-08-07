import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchPageWithRetry, PageFetchError } from "@/lib/page-fetch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.project.update({
      where: { id },
      data: { status: "extracting", error: null, pageCss: null },
    });

    const { title: pageTitle, html: rawHtml } = await fetchPageWithRetry(project.url);

    const updated = await db.project.update({
      where: { id },
      data: { pageTitle, rawHtml, status: "extracted" },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const userMessage =
      err instanceof PageFetchError
        ? err.userMessage
        : err instanceof Error
          ? err.message
          : "Re-extract failed";

    // Update project status to failed
    try {
      const { id } = await context.params;
      await db.project.update({
        where: { id },
        data: { status: "failed", error: userMessage },
      });
    } catch {
      // Project update failed, just return the error
    }

    return NextResponse.json({ error: userMessage }, { status: 422 });
  }
}
