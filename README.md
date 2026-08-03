# UI Extractor

Deconstruct any website into reusable UI components, design tokens, and specifications. Full pipeline: URL, Extract, Analyze, Spec, Generate.

[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-yellow.svg?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)]()

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Status](#status)
- [License](#license)

## Features

- **Full Pipeline** - URL to extracted components in one click: Extract, Analyze, Spec, Generate
- **AI-Powered Analysis** - LLM identifies components, generates specs and reusable code
- **Design Token Extraction** - Colors, spacing, typography, border-radius, shadows, opacity
- **Multi-Format Output** - Generate HTML, React JSX, or Vue SFC components
- **Reference Library** - Save components as references, search and regenerate from them
- **Pipeline Progress Tracking** - Visual step-by-step indicator with real-time status
- **Multiple Viewports** - Desktop (1280px), Tablet (768px), Mobile (375px)
- **Dark Theme** - Full dark mode support with next-themes
- **Syntax Highlighting** - Generated code with copy-to-clipboard and download

## Tech Stack

- **Framework** - Next.js 16 (App Router, React 19)
- **Language** - TypeScript 5
- **Styling** - Tailwind CSS 4 with shadcn/ui (New York style)
- **Database** - SQLite via Prisma ORM
- **State** - Zustand (client state), TanStack Query (server state)
- **AI** - z-ai-web-dev-sdk (page reader, LLM chat completions)
- **Icons** - Lucide React
- **Runtime** - Bun

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

Open the Preview Panel to see the application.

## Architecture

Single-page app with client-side navigation via Zustand. The backend consists of Next.js API routes that orchestrate page extraction (via z-ai-web-dev-sdk page reader), AI analysis (LLM), and persistence (Prisma/SQLite). The pipeline runs sequentially: fetch HTML, analyze into components and tokens, generate specs, then produce output code.

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/extractor/` - Application views (dashboard, extract, project, references)
- `src/components/ui/` - shadcn/ui component library
- `src/hooks/` - Custom React hooks (toast, mobile detection)
- `src/lib/` - Utilities (db client, utils)
- `src/store/` - Zustand state management
- `src/types/` - TypeScript type definitions
- `prisma/` - Database schema (SQLite)
- `eslint-rules/` - Custom ESLint rules (STD-DOC-002, STD-DOC-003)
- `eslint-processors/` - Custom ESLint processors (Markdown parser, snippet filter)

## API Reference

### Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects with component/token counts |
| `/api/projects` | POST | Create project and extract page HTML |
| `/api/projects/[id]` | GET | Get project with components and tokens |
| `/api/projects/[id]` | DELETE | Delete project and cascade related data |
| `/api/projects/[id]/analyze` | POST | AI analysis: identify components and design tokens |
| `/api/projects/[id]/spec` | POST | AI spec generation for all components |
| `/api/projects/[id]/generate` | POST | AI code generation (HTML, React, or Vue) |
| `/api/projects/[id]/pipeline` | POST | Run full pipeline: extract through generate |

### References

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/references` | GET | List saved component references |
| `/api/references` | POST | Save a new component reference |
| `/api/references/[id]` | DELETE | Delete a reference |
| `/api/references/[id]` | POST | Regenerate code from a saved reference |

## Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server on port 3000 |
| `bun run lint` | Run ESLint (includes custom rules for STD-DOC-002/003) |
| `bun run build` | Production build with standalone output |
| `bun run db:push` | Push Prisma schema to SQLite database |
| `bun run db:generate` | Generate Prisma Client |

## Configuration

### Environment Variables

```env
DATABASE_URL="file:./db/custom.db"
```

The database file is stored in `db/custom.db`. Prisma handles migrations via `db:push`.

## Status

| Phase | Status | Description |
|-------|--------|-------------|
| Core extraction | [OK] | Page fetch, HTML parsing, raw storage |
| AI analysis | [OK] | Component identification, design token extraction |
| Spec generation | [OK] | Component specification via LLM |
| Code generation | [OK] | HTML, React JSX, Vue SFC output |
| Reference library | [OK] | Save, search, regenerate from references |
| Pipeline progress | [OK] | Visual step tracking with failure detection |
| MCP server | [TODO] | AI agent integration (Cursor, Claude, Windsurf) |
| Auth sites | [TODO] | Support for authentication-required websites |
| Long screenshots | [TODO] | Full page, viewport, mobile, section captures |

## License

MIT

---
Built with: Next.js 16 + TypeScript + Tailwind CSS + Prisma + shadcn/ui
