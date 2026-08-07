import ZAI from "z-ai-web-dev-sdk";

// - Log ---------------------------------

export type PipelineLog = {
  ts: string;
  level: "info" | "warn" | "error" | "success";
  step: string;
  message: string;
  component?: string;
};

// - LLM Instance -----------------------------

export type ZaiInstance = Awaited<ReturnType<typeof ZAI.create>>;

// - Analyze step -----------------------------

/** Raw component shape as returned by the LLM (fields are optional). */
export interface RawComponent {
  name?: string;
  tag?: string | null;
  html?: string | null;
  cssClasses?: string | null;
  inlineStyles?: string | null;
}

/** Raw design-token shape as returned by the LLM. */
export interface RawDesignToken {
  category?: string | null;
  name?: string;
  value?: string | null;
  originalVar?: string | null;
}

/** Top-level JSON the analyze LLM must return. */
export interface AnalyzeResponse {
  components?: RawComponent[];
  designTokens?: RawDesignToken[];
}

/** A component that passed validation and can be written to the DB. */
export interface ValidatedComponent {
  name: string;
  tag: string | null;
  html: string;
  cssClasses: string | null;
  inlineStyles: string | null;
}

/** A design-token that passed validation and can be written to the DB. */
export interface ValidatedToken {
  category: string;
  name: string;
  value: string;
  originalVar: string | null;
}

// - Generic constraint for processComponents ---------------

export interface NamedItem {
  name: string;
}
