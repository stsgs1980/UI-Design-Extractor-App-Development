import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchPageWithRetry, PageFetchError } from "@/lib/page-fetch";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        componentQuery: true,
        viewport: true,
        pageTitle: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { components: true, tokens: true },
        },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, name, componentQuery, viewport } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const projectName = name || new URL(url).hostname;

    // Check for existing project with the same URL to avoid duplicates
    const existing = await db.project.findFirst({
      where: { url },
      orderBy: { createdAt: "desc" },
    });

    // If an existing project already has extracted HTML, return it
    if (existing && existing.rawHtml && existing.status !== "failed") {
      return NextResponse.json({
        id: existing.id,
        name: existing.name,
        url: existing.url,
        status: existing.status,
        componentQuery: existing.componentQuery,
        viewport: existing.viewport,
        pageTitle: existing.pageTitle,
        error: existing.error,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });
    }

    // If existing project exists but failed or has no HTML, re-extract into it
    if (existing && (!existing.rawHtml || existing.status === "failed")) {
      try {
        await db.project.update({
          where: { id: existing.id },
          data: { status: "extracting", error: null },
        });

        const { title: pageTitle, html: rawHtml } = await fetchPageWithRetry(url);

        const updatedProject = await db.project.update({
          where: { id: existing.id },
          data: {
            pageTitle,
            rawHtml,
            status: "extracted",
            name: projectName,
            componentQuery: componentQuery || existing.componentQuery,
            viewport: viewport || existing.viewport,
          },
        });

        return NextResponse.json({
          id: updatedProject.id,
          name: updatedProject.name,
          url: updatedProject.url,
          status: updatedProject.status,
          componentQuery: updatedProject.componentQuery,
          viewport: updatedProject.viewport,
          pageTitle: updatedProject.pageTitle,
          error: updatedProject.error,
          createdAt: updatedProject.createdAt,
          updatedAt: updatedProject.updatedAt,
        });
      } catch (extractError) {
        const userMessage =
          extractError instanceof PageFetchError ? extractError.userMessage : "Extraction failed";

        await db.project.update({
          where: { id: existing.id },
          data: { status: "failed", error: userMessage },
        });

        return NextResponse.json(
          {
            id: existing.id,
            name: existing.name,
            url: existing.url,
            status: "failed",
            error: userMessage,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
          },
          { status: 422 },
        );
      }
    }

    // No existing project — create new one
    const project = await db.project.create({
      data: {
        name: projectName,
        url,
        status: "extracting",
        componentQuery: componentQuery || null,
        viewport: viewport || "desktop",
      },
    });

    try {
      const { title: pageTitle, html: rawHtml } = await fetchPageWithRetry(url);

      const updatedProject = await db.project.update({
        where: { id: project.id },
        data: { pageTitle, rawHtml, status: "extracted" },
      });

      return NextResponse.json({
        id: updatedProject.id,
        name: updatedProject.name,
        url: updatedProject.url,
        status: updatedProject.status,
        componentQuery: updatedProject.componentQuery,
        viewport: updatedProject.viewport,
        pageTitle: updatedProject.pageTitle,
        error: updatedProject.error,
        createdAt: updatedProject.createdAt,
        updatedAt: updatedProject.updatedAt,
      });
    } catch (extractError) {
      const userMessage =
        extractError instanceof PageFetchError ? extractError.userMessage : "Extraction failed";

      await db.project.update({
        where: { id: project.id },
        data: { status: "failed", error: userMessage },
      });

      return NextResponse.json(
        {
          id: project.id,
          name: project.name,
          url: project.url,
          status: "failed",
          error: userMessage,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        { status: 422 },
      );
    }
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 },
    );
  }
}
