import { db } from "@/lib/db";
import { llmWithRetry } from "@/lib/llm-retry";
import { log, stripMarkdownFences, repairJson } from "./utils";
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzeUserPrompt } from "./prompts";
import type {
  PipelineLog,
  ZaiInstance,
  AnalyzeResponse,
  ValidatedComponent,
  ValidatedToken,
} from "./types";

export async function runAnalyze(
  projectId: string,
  zai: ZaiInstance,
  componentQuery: string | null,
  logs: PipelineLog[],
): Promise<void> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !project.rawHtml) {
    throw new Error("No HTML data to analyze");
  }

  await db.project.update({ where: { id: projectId }, data: { status: "ANALYZING" } });
  log(logs, "info", "analyze", "Starting analysis...");

  const userPrompt = buildAnalyzeUserPrompt(project.rawHtml, componentQuery);

  let retryCount = 0;
  const completion = await llmWithRetry(zai, {
    messages: [
      { role: "assistant", content: ANALYZE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    thinking: { type: "disabled" },
  }).catch((err: Error) => {
    const match = err?.message?.match(/retry (\d+)\//);
    if (match) retryCount = parseInt(match[1], 10);
    throw err;
  });

  if (retryCount > 0) {
    log(logs, "warn", "analyze", `LLM rate limited, retried ${retryCount} time(s)`);
  }

  const response = completion.choices[0]?.message?.content;
  if (!response) throw new Error("Empty LLM response during analysis");

  const parsed: AnalyzeResponse = JSON.parse(repairJson(stripMarkdownFences(response)));

  // - Validate components -----------------------
  const validComponents: ValidatedComponent[] = (parsed.components || []).filter(
    (c): c is ValidatedComponent =>
      !!c.name && !!c.html && typeof c.html === "string" && c.html.trim().length > 0,
  );

  if (validComponents.length === 0) {
    throw new Error("No valid components found in the analysis.");
  }

  // - Validate tokens -------------------------
  const validTokens: ValidatedToken[] = (parsed.designTokens || []).filter(
    (t): t is ValidatedToken => !!t.name && !!t.value && !!t.category,
  );

  // - Atomic delete + create inside a single transaction --------
  const componentOps = validComponents.map((comp) =>
    db.extractedComponent.create({
      data: {
        projectId,
        name: comp.name,
        tag: comp.tag ?? null,
        html: comp.html,
        cssClasses: comp.cssClasses ?? null,
        inlineStyles: comp.inlineStyles ?? null,
      },
    }),
  );

  const tokenOps = validTokens.map((token) =>
    db.designToken.create({
      data: {
        projectId,
        category: token.category,
        name: token.name,
        value: token.value,
        originalVar: token.originalVar ?? null,
      },
    }),
  );

  await db.$transaction([
    db.extractedComponent.deleteMany({ where: { projectId } }),
    db.designToken.deleteMany({ where: { projectId } }),
    ...componentOps,
    ...tokenOps,
  ]);

  log(
    logs,
    "success",
    "analyze",
    `Found ${validComponents.length} components and ${validTokens.length} design tokens`,
  );
}
