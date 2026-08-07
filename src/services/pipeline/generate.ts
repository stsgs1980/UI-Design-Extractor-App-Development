import { db } from "@/lib/db";
import { llmWithRetry } from "@/lib/llm-retry";
import { log, stripMarkdownFences } from "./utils";
import { GENERATE_SYSTEM_PROMPT, buildGenerateUserPrompt } from "./prompts";
import { processComponents } from "./process-components";
import type { PipelineLog, ZaiInstance } from "./types";

export async function runGenerate(
  projectId: string,
  zai: ZaiInstance,
  codeFormat: string,
  logs: PipelineLog[],
): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { components: true, tokens: true },
  });
  if (!project) throw new Error("Project not found");

  const componentsWithSpecs = project.components.filter((c) => c.spec);
  if (componentsWithSpecs.length === 0) {
    throw new Error("No components with specs to generate code from");
  }

  await db.project.update({ where: { id: projectId }, data: { status: "GENERATING" } });
  log(
    logs,
    "info",
    "generate",
    `Generating ${codeFormat.toUpperCase()} code for ${componentsWithSpecs.length} components...`,
  );

  const tokensContext =
    project.tokens.length > 0
      ? `\n\nDesign tokens available:\n${project.tokens.map((t) => `${t.name}: ${t.value} (${t.category})`).join("\n")}`
      : "";

  const { errorCount, total } = await processComponents({
    components: componentsWithSpecs,
    logs,
    step: "generate",
    processOne: async (component, i, count) => {
      log(
        logs,
        "info",
        "generate",
        `Generating: ${component.name} (${i + 1}/${count})`,
        component.name,
      );

      const completion = await llmWithRetry(zai, {
        messages: [
          { role: "assistant", content: GENERATE_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildGenerateUserPrompt(
              codeFormat,
              component.spec!,
              component.html,
              tokensContext,
            ),
          },
        ],
        thinking: { type: "disabled" },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error("Empty LLM response during generation");

      const exists = await db.extractedComponent.findUnique({ where: { id: component.id } });
      if (!exists) throw new Error("Component disappeared from database");

      await db.extractedComponent.update({
        where: { id: component.id },
        data: {
          generatedCode: stripMarkdownFences(response),
          codeFormat,
        },
      });
      log(logs, "success", "generate", `Code generated: ${component.name}`, component.name);
    },
  });

  const genSuccess = total - errorCount;
  if (errorCount > 0) {
    log(
      logs,
      "warn",
      "generate",
      `${genSuccess}/${total} generations succeeded, ${errorCount} failed`,
    );
  } else {
    log(logs, "success", "generate", `All ${total} components generated successfully`);
  }

  if (errorCount === total) {
    throw new Error(`All ${total} component generations failed.`);
  }
}
