import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { runAnalyze } from "@/services/pipeline/analyze";
import { runSpec } from "@/services/pipeline/spec";
import { runGenerate } from "@/services/pipeline/generate";
import { log } from "@/services/pipeline/utils";
import type { PipelineLog } from "@/services/pipeline/types";

type RouteContext = { params: Promise<{ id: string }> };
const INC = {
  include: {
    components: { orderBy: { createdAt: "asc" } as const },
    tokens: { orderBy: { category: "asc" } as const },
  },
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let failed = false;
  let errMsg = "Pipeline failed";
  const logs: PipelineLog[] = [];
  try {
    const { codeFormat = "HTML" } = (await request.json()) as { codeFormat?: string };
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!project.rawHtml)
      return NextResponse.json({ error: "No HTML data. Extract the page first." }, { status: 400 });
    log(logs, "info", "pipeline", `Starting pipeline (format: ${codeFormat})`);
    const zai = await ZAI.create();
    try {
      await runAnalyze(id, zai, project.componentQuery, logs);
      await runSpec(id, zai, logs);
      await runGenerate(id, zai, codeFormat, logs);
    } catch (e) {
      failed = true;
      errMsg = e instanceof Error ? e.message : "Pipeline failed";
      log(logs, "error", "pipeline", `Pipeline error: ${errMsg}`);
    }
    const fp = await db.project.findUnique({ where: { id }, ...INC });
    if (!fp) return NextResponse.json({ error: "Project disappeared" }, { status: 500 });
    const hasCode = fp.components.some((c) => c.generatedCode);
    const hasSpecs = fp.components.some((c) => c.spec);
    const status = hasCode
      ? "COMPLETED"
      : hasSpecs
        ? "SPECCED"
        : fp.components.length > 0
          ? "ANALYZED"
          : "FAILED";
    const err = status === "FAILED" ? errMsg : null;
    await db.project.update({
      where: { id },
      data: { status, pipelineLogs: JSON.stringify(logs), ...(err ? { error: err } : {}) },
    });
    const result = await db.project.findUnique({ where: { id }, ...INC });
    if (failed) {
      log(logs, "warn", "pipeline", `Pipeline partially completed (status: ${status})`);
      return NextResponse.json(
        { ...result, _partial: true, _error: errMsg, _logs: logs },
        { status: 207 },
      );
    }
    log(logs, "success", "pipeline", `Pipeline completed successfully (status: ${status})`);
    return NextResponse.json({ ...result, _logs: logs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log(logs, "error", "pipeline", `Fatal: ${msg}`);
    try {
      await db.project.update({
        where: { id },
        data: { status: "FAILED", error: msg, pipelineLogs: JSON.stringify(logs) },
      });
    } catch {
      /* noop */
    }
    return NextResponse.json({ error: msg, _logs: logs }, { status: 500 });
  }
}
