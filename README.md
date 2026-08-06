# UI-Design-Extractor-App-Development

AI-powered tool that deconstructs any public website into reusable UI components, design tokens, and specifications. Feed it a URL, and the four-stage pipeline produces clean, production-ready code in HTML, React JSX, or Vue SFC format.

[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-yellow.svg?style=flat-square)]()
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg?style=flat-square)]()
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue.svg?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [UI Views](#ui-views)
- [Custom ESLint Rules](#custom-eslint-rules)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Roadmap](#roadmap)
- [License](#license)

## How It Works

The application runs a sequential four-stage pipeline:

```text
+-------------------+     +-------------------+     +-------------------+     +-------------------+
|   1. EXTRACT      |     |   2. ANALYZE      |     |   3. SPEC         |     |   4. GENERATE     |
|                   |     |                   |     |                   |     |                   |
|  Fetch page HTML  | --> |  LLM identifies   | --> |  Generate detailed| --> |  Produce reusable |
|  via page_reader  |     |  components and   |     |  specifications   |     |  code in chosen   |
|  SDK function     |     |  design tokens    |     |  for each         |     |  output format    |
+-------------------+     +-------------------+     |  component        |     |                   |
                                                    +-------------------+     +-------------------+
```

Each stage can run individually via dedicated API endpoints, or all at once with the full pipeline endpoint. Progress is tracked visually with a real-time step indicator.

**Supported output formats:**

- HTML with embedded CSS
- React JSX (TypeScript)
- Vue SFC (Single File Component)

## Features

- **Full Pipeline** - URL to extracted components in one click: Extract, Analyze, Spec, Generate
- **AI-Powered Analysis** - LLM identifies distinct UI components and generates specs and reusable code
- **Design Token Extraction** - Colors, spacing, typography, border-radius, shadows, opacity
- **Multi-Format Output** - Generate HTML, React JSX, or Vue SFC components
- **Reference Library** - Save components as references, search, and regenerate from saved specs
- **Pipeline Progress Tracking** - Visual step-by-step indicator with compact and detailed modes
- **Multiple Viewports** - Desktop (1280px), Tablet (768px), Mobile (375px)
- **Dark Theme** - Full dark mode with oklch color system
- **Syntax Highlighting** - Generated code with copy-to-clipboard and file download
- **Component Filtering** - Optional text filter to target specific components for extraction
- **Dashboard Analytics** - Project stats, recent activity, and quick-action shortcuts

## Tech Stack

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| Framework       | Next.js 16 (App Router, standalone)     |
| Language        | TypeScript 5                            |
| Runtime         | Bun                                     |
| UI              | React 19                                |
| Styling         | Tailwind CSS 4 + shadcn/ui (New York)   |
| Database        | SQLite via Prisma ORM                   |
| Client State    | Zustand                                 |
| AI Engine       | z-ai-web-dev-sdk (page reader + LLM)    |
| Icons           | Lucide React                            |
| Notifications   | Sonner (toast)                          |
| Code Display    | react-syntax-highlighter                |
| Linting         | ESLint 9 with custom rules/processors   |

## Getting Started

### Prerequisites

- Bun 1.3+
- A Z.ai environment with `z-ai-web-dev-sdk` access

### Installation

```bash
git clone <repo-url>
cd ui-extractor
bun install
bun run db:push
```

### Run

```bash
bun run dev
```

The development server starts on port 3000. Open the Preview Panel to see the application.

### Production Build

```bash
bun run build
bun run start
```

The build produces a standalone output in `.next/standalone/`.

## Architecture

Single-page application with client-side view navigation managed by Zustand. There is no file-based routing for views -- `src/app/page.tsx` conditionally renders one of four views based on `currentView` state.

```text
Client (React SPA)                         Server (Next.js API Routes)
+---------------------+                   +-----------------------------+
| Zustand Store       |                   | /api/projects               |
| extractor-store.ts  |  <--fetch-->     |   GET  - list projects       |
|                     |                   |   POST - create + extract    |
| 4 Views:            |                   | /api/projects/[id]           |
| - DashboardView     |                   |   GET    - with components   |
| - ExtractView       |                   |   DELETE - cascade remove    |
| - ProjectView       |                   | /api/projects/[id]/analyze  |
| - ReferencesView    |                   | /api/projects/[id]/spec     |
|                     |                   | /api/projects/[id]/generate |
| Sidebar:            |                   | /api/projects/[id]/pipeline |
| - AppSidebar        |                   | /api/references             |
+---------------------+                   |   GET/POST - list/create    |
                                           | /api/references/[id]        |
                                           |   DELETE/POST - remove/regen |
                                           +--------------+--------------+
                                                          |
                                                 +--------+--------+
                                                 | z-ai-web-dev-sdk |
                                                 |  - page_reader  |
                                                 |  - LLM chat     |
                                                 +--------+--------+
                                                          |
                                                 +--------+--------+
                                                 |   SQLite DB     |
                                                 |   (Prisma ORM)  |
                                                 +-----------------+
```

### Data Flow

1. User enters a URL in ExtractView
2. Client calls `POST /api/projects` which creates a DB record and invokes the page reader SDK to fetch HTML
3. HTML is stored in the `rawHtml` field of the Project model
4. User triggers analysis (or the full pipeline does it automatically)
5. `POST /api/projects/[id]/analyze` sends the HTML to the LLM, which returns identified components and design tokens
6. Components and tokens are persisted in the database
7. `POST /api/projects/[id]/spec` sends each component to the LLM for specification generation
8. `POST /api/projects/[id]/generate` sends each spec to the LLM for code generation in the chosen format

## Database Schema

Four models managed by Prisma with SQLite:

- **Project** - id, name, url, status, componentQuery, viewport, screenshotUrl, rawHtml, pageTitle, error, timestamps. Has many ExtractedComponent and DesignToken.
- **ExtractedComponent** - id, projectId, name, tag, html, cssClasses, inlineStyles, spec (JSON), generatedCode, codeFormat. Belongs to Project, has many Reference.
- **DesignToken** - id, projectId, category (color/spacing/typography/border-radius/shadow/opacity), name, value, originalVar. Belongs to Project.
- **Reference** - id, name, description, sourceUrl, componentId (optional), html, css, spec, tags (JSON), thumbnail, isFavorite. Standalone or linked to ExtractedComponent.

Cascade delete: removing a Project deletes all associated ExtractedComponents and DesignTokens.

Project status progresses through: `pending` -> `extracting` -> `analyzing` -> `speccing` -> `generating` -> `completed` (or `failed` at any stage).

## Project Structure

```text
src/
  app/
    page.tsx                  # Single entry point, renders views by Zustand state
    layout.tsx                # Root layout with dark theme, fonts, sidebar
    globals.css               # Tailwind directives, oklch CSS variables
    api/
      projects/               # Project CRUD + pipeline endpoints
        [id]/
          analyze/route.ts    # AI component and token analysis
          spec/route.ts       # AI spec generation
          generate/route.ts   # AI code generation
          pipeline/route.ts   # Full pipeline orchestration
      references/             # Reference CRUD + regeneration
  components/
    extractor/                # Application views and domain components
      dashboard-view.tsx      # Stats, recent projects, quick actions
      extract-view.tsx        # URL input form, viewport/format selectors
      project-view.tsx        # Tabs: Overview, Components, Design Tokens
      references-view.tsx     # Search, split panel, favorites
      app-sidebar.tsx         # Navigation, recent projects, collapse
      pipeline-indicator.tsx  # Compact (E-A-S-G) and detailed stepper
    ui/                       # 40+ shadcn/ui components (New York style)
  store/
    extractor-store.ts        # Zustand: currentView, selectedProject, etc.
  types/
    extractor.ts              # TypeScript interfaces for all models
  lib/
    db.ts                     # Prisma client singleton
    utils.ts                  # cn() utility for class merging
  hooks/                     # Custom hooks (toast, mobile detection)
prisma/
  schema.prisma              # Database schema (SQLite, 4 models)
eslint-rules/
  code-block-language.mjs     # STD-DOC-002: require language on code fences
  unicode-policy.mjs          # STD-DOC-003: ban emoji and box-drawing chars
eslint-processors/
  md-parser.mjs              # Minimal AST parser for raw-text .md linting
  markdown-snippets.mjs      # Wrapper filtering false positives from code snippets
```

## API Reference

### Projects

| Endpoint                      | Method | Description                                      |
|-------------------------------|--------|--------------------------------------------------|
| `/api/projects`               | GET    | List all projects with component/token counts    |
| `/api/projects`               | POST   | Create project and extract page HTML             |
| `/api/projects/[id]`          | GET    | Get project with components and design tokens    |
| `/api/projects/[id]`          | DELETE | Delete project and cascade related data          |
| `/api/projects/[id]/analyze`  | POST   | AI analysis: identify components and design tokens |
| `/api/projects/[id]/spec`     | POST   | AI spec generation for all components            |
| `/api/projects/[id]/generate` | POST   | AI code generation (HTML, React, or Vue)         |
| `/api/projects/[id]/pipeline` | POST   | Run full pipeline: extract through generate      |

### References

| Endpoint               | Method | Description                              |
|------------------------|--------|------------------------------------------|
| `/api/references`      | GET    | List saved component references          |
| `/api/references`      | POST   | Save a new component reference           |
| `/api/references/[id]` | DELETE | Delete a reference                       |
| `/api/references/[id]` | POST   | Regenerate code from a saved reference   |

## UI Views

### Dashboard
Stats grid (total projects, completed, components, tokens), quick-action buttons, and a list of recent projects with status badges and metadata.

### New Extraction
URL input form with optional project name and component filter. Viewport selector (Desktop/Tablet/Mobile), output format selector (HTML/React/Vue), and a full-pipeline toggle. Pipeline progress sidebar shows real-time stage status.

### Project View
Tabbed interface for a single project:

- **Overview** - Project metadata, URL, status, pipeline indicator, and manual step buttons (Analyze, Spec, Generate)
- **Components** - Expandable list of extracted components. Each component shows original HTML, parsed spec (props, variants, accessibility, dependencies), and generated code with format selector, copy, and download. Includes a "Save as Reference" dialog.
- **Design Tokens** - Tokens grouped by category (color, spacing, typography, border-radius, shadow, opacity) with appropriate icons.

### References
Split-panel layout with searchable reference list on the left and detail view on the right. Favorites section, tag filtering, manual reference creation dialog, and regeneration from saved specs.

### Sidebar
Collapsible navigation (w-64 to w-16) with logo, nav items (Dashboard, New Extraction, References), and quick-access links to recent projects. Tooltips in collapsed mode.

## Custom ESLint Rules

The project enforces two documentation standards via custom ESLint rules and processors:

### STD-DOC-002: Markdown Formatting

**Rule:** `code-block-language` (`eslint-rules/code-block-language.mjs`)

Requires every fenced code block in Markdown files to specify a language identifier. Falls back to `text` or `bash` if the language is unknown.

### STD-DOC-003: No-Unicode Policy

**Rules:** `eslint-rules/unicode-policy.mjs` (exports 4 rules)

| Rule                       | Scope        | What it catches                       |
|----------------------------|--------------|---------------------------------------|
| `emoji`                    | Source code  | Emoji characters in .ts/.tsx/.js/.jsx |
| `unicode-graphics`         | Source code  | Box/line drawing chars in source files |
| `emoji-in-md`              | Markdown     | Emoji in .md files (excluding code blocks) |
| `unicode-graphics-in-md`   | Markdown     | Box/line drawing chars in .md files    |

All rules suggest text-tag alternatives (`[OK]`, `[FAIL]`, `[TODO]`, etc.) in their error messages.

### Custom Processors

| Processor                | File                               | Purpose                                              |
|--------------------------|------------------------------------|------------------------------------------------------|
| `md-parser`              | `eslint-processors/md-parser.mjs` | Minimal AST for raw-text .md linting via `sourceCode.getText()` |
| `markdown-snippets`      | `eslint-processors/markdown-snippets.mjs` | Wraps `eslint-plugin-markdown` and filters parsing errors from incomplete code snippets |

## Scripts

| Script              | Description                                              |
|---------------------|----------------------------------------------------------|
| `bun run dev`       | Start development server on port 3000 (logs to dev.log) |
| `bun run build`     | Production build with standalone output                  |
| `bun run start`     | Run production server (logs to server.log)               |
| `bun run lint`      | Run ESLint with custom STD-DOC-002/003 rules             |
| `bun run db:push`   | Push Prisma schema to SQLite database                    |
| `bun run db:generate` | Generate Prisma Client types                           |
| `bun run db:migrate` | Run Prisma migrations                                    |
| `bun run db:reset`  | Reset database (destructive)                             |

## Configuration

### Environment Variables

```env
DATABASE_URL="file:./db/custom.db"
```

The database file is stored in `db/custom.db`. Prisma handles schema changes via `db:push`.

### Key Config Files

| File                  | Purpose                                          |
|-----------------------|--------------------------------------------------|
| `next.config.ts`      | Standalone output, strict mode off               |
| `tsconfig.json`       | ES2017 target, `@/*` path alias, strict mode     |
| `tailwind.config.ts`  | oklch color system, dark mode via class, shadcn/ui |
| `components.json`     | shadcn/ui: New York style, neutral base, Lucide   |
| `eslint.config.mjs`   | Flat config, custom rules, extended ignores       |
| `postcss.config.mjs`  | Tailwind CSS 4 PostCSS plugin                     |

## Roadmap

| Feature              | Status  | Description                                       |
|----------------------|---------|---------------------------------------------------|
| Core extraction      | [OK]    | Page fetch via SDK, HTML storage                  |
| AI analysis          | [OK]    | Component identification, design token extraction |
| Spec generation      | [OK]    | Component specification via LLM                   |
| Code generation      | [OK]    | HTML, React JSX, Vue SFC output                   |
| Reference library    | [OK]    | Save, search, regenerate from references          |
| Pipeline progress    | [OK]    | Visual step tracking with failure detection       |
| Custom ESLint rules  | [OK]    | STD-DOC-002 and STD-DOC-003 enforcement           |
| MCP server           | [TODO]  | AI agent integration (Cursor, Claude, Windsurf)   |
| Auth sites support   | [TODO]  | Authentication-required websites (Pinterest, etc.) |
| Long screenshots     | [TODO]  | Full page, viewport, mobile, section captures     |
| Component diff       | [TODO]  | Compare extracted components across project runs  |
| Bulk export          | [TODO]  | Export all components as a zip archive            |

## License

MIT

---
Built with: Next.js 16 + TypeScript 5 + Tailwind CSS 4 + Prisma + shadcn/ui + Bun
