import type { ProjectStatus, ViewportType, CodeFormat, TokenCategory } from '@prisma/client';

export type { ProjectStatus, ViewportType, CodeFormat, TokenCategory };

export type AppView = 'dashboard' | 'extract' | 'project' | 'references';

/** Map Prisma UPPERCASE enum to lowercase UI values */
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PENDING: 'pending',
  EXTRACTING: 'extracting',
  EXTRACTED: 'extracted',
  ANALYZING: 'analyzing',
  ANALYZED: 'analyzed',
  SPECCING: 'speccing',
  SPECCED: 'specced',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/** Map UI lowercase values back to Prisma enums */
export const TO_PROJECT_STATUS = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([k, v]) => [v, k]),
) as Record<string, ProjectStatus>;

export const TO_VIEWPORT_TYPE: Record<string, ViewportType> = {
  desktop: 'DESKTOP',
  mobile: 'MOBILE',
  tablet: 'TABLET',
};

export const TO_CODE_FORMAT: Record<string, CodeFormat> = {
  html: 'HTML',
  react: 'REACT',
  vue: 'VUE',
};

export const TOKEN_CATEGORY_LABELS: Record<TokenCategory, string> = {
  COLOR: 'color',
  SPACING: 'spacing',
  TYPOGRAPHY: 'typography',
  BORDER_RADIUS: 'border-radius',
  SHADOW: 'shadow',
  OPACITY: 'opacity',
};

export interface Project {
  id: string;
  name: string;
  url: string;
  status: string;
  componentQuery: string | null;
  viewport: string;
  screenshotUrl: string | null;
  rawHtml: string | null;
  pageTitle: string | null;
  error: string | null;
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
  codeFormat: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignToken {
  id: string;
  projectId: string;
  category: string;
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
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'extract', label: 'Extract', description: 'Fetch and parse page HTML', status: 'pending' },
  { id: 'analyze', label: 'Analyze', description: 'Identify components and design tokens', status: 'pending' },
  { id: 'spec', label: 'Spec', description: 'Generate component specifications', status: 'pending' },
  { id: 'generate', label: 'Generate', description: 'Produce reusable HTML component', status: 'pending' },
];

/** Status colors keyed by lowercase UI status */
export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  extracting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  extracted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  analyzing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  analyzed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  speccing: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  specced: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  generating: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-destructive/10 text-destructive',
};

export const TOKEN_CATEGORY_ICONS: Record<string, string> = {
  color: 'Palette',
  spacing: 'MoveHorizontal',
  typography: 'Type',
  'border-radius': 'Square',
  shadow: 'Layers',
  opacity: 'CircleDot',
};

export interface SpecData {
  name: string;
  description: string;
  props: Array<{ name: string; type: string; default: string; description: string }>;
  variants: string[];
  accessibility: string[];
  dependencies: string[];
}
