import { db } from "@/lib/db";
import { llmWithRetry } from "@/lib/llm-retry";
import { log, stripMarkdownFences } from "./utils";
import { SPEC_SYSTEM_PROMPT, buildSpecUserPrompt } from "./prompts";
import { processComponents } from "./process-components";
import type { PipelineLog, ZaiInstance } from "./types";

export async function runSpec(
  projectId: string,
  zai: ZaiInstance,
  logs: PipelineLog[],
): Promise<void> {
  const components = await db.extractedComponent.findMany({ where: { projectId } });
  if (components.length === 0) throw new Error("No components to generate specs for");

  await db.project.update({ where: { id: projectId }, data: { status: "SPECCING" } });
  log(logs, "info", "spec", `Generating specs for ${components.length} components...`);

  const { errorCount, total } = await processComponents({
    components,
    logs,
    step: "spec",
    processOne: async (component, i, count) => {
      log(
        logs,
        "info",
        "spec",
        `Specifying: ${component.name} (${i + 1}/${count})`,
        component.name,
      );

      const completion = await llmWithRetry(zai, {
        messages: [
          { role: "assistant", content: SPEC_SYSTEM_PROMPT },
          { role: "user", content: buildSpecUserPrompt(component) },
        ],
        thinking: { type: "disabled" },
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error("Empty LLM response during specification");

      const cleanedResponse = stripMarkdownFences(response);

      const exists = await db.extractedComponent.findUnique({ where: { id: component.id } });
      if (!exists) throw new Error("Component disappeared from database");

      // If JSON is invalid, save a fallback wrapper instead of failing
      try {
        JSON.parse(cleanedResponse);
      } catch {
        await db.extractedComponent.update({
          where: { id: component.id },
          data: {
            spec: JSON.stringify({
              name: component.name,
              description: cleanedResponse,
              props: [],
              variants: [],
              accessibility: [],
              dependencies: [],
            }),
          },
        });
        log(
          logs,
          "warn",
          "spec",
          `Invalid JSON for ${component.name}, saved as text`,
          component.name,
        );
        return;
      }

      await db.extractedComponent.update({
        where: { id: component.id },
        data: { spec: cleanedResponse },
      });
      log(logs, "success", "spec", `Spec done: ${component.name}`, component.name);
    },
  });

  const specSuccess = total - errorCount;
  if (errorCount > 0) {
    log(logs, "warn", "spec", `${specSuccess}/${total} specs succeeded, ${errorCount} failed`);
  } else {
    log(logs, "success", "spec", `All ${total} specs generated successfully`);
  }

  if (errorCount === total) {
    throw new Error(`All ${total} component specs failed.`);
  }
}
