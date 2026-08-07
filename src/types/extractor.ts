export type ProjectStatus =
  | "PENDING"
  | "EXTRACTING"
  | "EXTRACTED"
  | "ANALYZING"
  | "ANALYZED"
  | "SPECCING"
  | "SPECCED"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED";

export type ViewportType = "DESKTOP" | "MOBILE" | "TABLET";
export type CodeFormat = "HTML" | "REACT" | "VUE";
export type TokenCategory =
  "color" | "spacing" | "typography" | "border-radius" | "shadow" | "opacity";

export type AppView = "dashboard" | "extract" | "project" | "references";

export interface Project {
  id: string;
  name: string;
  url: string;
  status: ProjectStatus;
  componentQuery: string | null;
  viewport: ViewportType;
  screenshotUrl: string | null;
  rawHtml: string | null;
  pageTitle: string | null;
  error: string | null;
  pipelineLogs: string | null;
  pageCss: string | null;
  createdAt: string;
  updatedAt: string;
  components?: ExtractedComponent[];
  tokens?: DesignToken[];
}

export interface ExtractedComponent {
  id: string;
  projectId: string;
  name: string;
  tag: string | null;
  html: string;
  cssClasses: string | null;
  inlineStyles: string | null;
  spec: string | null;
  generatedCode: string | null;
  codeFormat: CodeFormat;
  createdAt: string;
  updatedAt: string;
}

export interface DesignToken {
  id: string;
  projectId: string;
  category: TokenCategory;
  name: string;
  value: string;
  originalVar: string | null;
  createdAt: string;
}

export interface Reference {
  id: string;
  name: string;
  description: string | null;
  sourceUrl: string | null;
  componentId: string | null;
  html: string;
  css: string | null;
  spec: string | null;
  tags: string;
  thumbnail: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
}

export interface CreateProjectRequest {
  url: string;
  name?: string;
  componentQuery?: string;
  viewport?: ViewportType;
}

export interface PipelineRequest {
  componentQuery?: string;
  codeFormat?: CodeFormat;
}

export interface SaveReferenceRequest {
  name: string;
  description?: string;
  sourceUrl?: string;
  componentId?: string;
  html: string;
  css?: string;
  spec?: string;
  tags?: string[];
}

export interface SpecData {
  name: string;
  description: string;
  props: Array<{ name: string; type: string; default: string; description: string }>;
  variants: string[];
  accessibility: string[];
  dependencies: string[];
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "extract", label: "Extract", description: "Fetch and parse page HTML", status: "pending" },
  {
    id: "analyze",
    label: "Analyze",
    description: "Identify components and design tokens",
    status: "pending",
  },
  {
    id: "spec",
    label: "Spec",
    description: "Generate component specifications",
    status: "pending",
  },
  {
    id: "generate",
    label: "Generate",
    description: "Produce reusable HTML component",
    status: "pending",
  },
];

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  EXTRACTING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  EXTRACTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ANALYZING: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ANALYZED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  SPECCING: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  SPECCED: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  GENERATING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  FAILED: "bg-destructive/10 text-destructive",
};

export const TOKEN_CATEGORY_ICONS: Record<TokenCategory, string> = {
  color: "Palette",
  spacing: "MoveHorizontal",
  typography: "Type",
  "border-radius": "Square",
  shadow: "Layers",
  opacity: "CircleDot",
};
