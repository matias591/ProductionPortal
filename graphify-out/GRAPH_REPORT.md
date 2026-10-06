# Graph Report - production-portal  (2026-10-06)

## Corpus Check
- 41 files · ~25,242 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 111 nodes · 117 edges · 24 communities (16 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58720965`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin & Orders UI|Admin & Orders UI]]
- [[_COMMUNITY_Static Assets & Branding|Static Assets & Branding]]
- [[_COMMUNITY_App Shell & Layout|App Shell & Layout]]
- [[_COMMUNITY_Kit & Template Detail Views|Kit & Template Detail Views]]
- [[_COMMUNITY_Seapod Templates Admin|Seapod Templates Admin]]
- [[_COMMUNITY_Data Sync API|Data Sync API]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Seapod Build Trigger|Seapod Build Trigger]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 11 edges
2. `Production Portal Project (Next.js)` - 9 edges
3. `useSidebar()` - 5 edges
4. `authedFetch()` - 5 edges
5. `Next.js Framework` - 3 edges
6. `Vercel Deployment Platform` - 3 edges
7. `Home()` - 2 edges
8. `SidebarProvider()` - 2 edges
9. `SortableItem()` - 2 edges
10. `Sidebar()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `File Icon SVG` --references--> `Production Portal Project (Next.js)`  [INFERRED]
  public/file.svg → README.md
- `Globe / Web Icon SVG` --references--> `Production Portal Project (Next.js)`  [INFERRED]
  public/globe.svg → README.md
- `Browser Window Icon SVG` --references--> `Production Portal Project (Next.js)`  [INFERRED]
  public/window.svg → README.md
- `Next.js Wordmark SVG` --references--> `Next.js Framework`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG (Triangle Logomark)` --references--> `Vercel Deployment Platform`  [INFERRED]
  public/vercel.svg → README.md

## Communities (24 total, 8 thin omitted)

### Community 0 - "Admin & Orders UI"
Cohesion: 0.14
Nodes (4): Home(), Sidebar(), SidebarContext, useSidebar()

### Community 1 - "Static Assets & Branding"
Cohesion: 0.19
Nodes (13): File Icon SVG, Globe / Web Icon SVG, Next.js Wordmark SVG, Vercel Logo SVG (Triangle Logomark), Browser Window Icon SVG, app/page.tsx Entry Point, create-next-app CLI, Geist Font Family (+5 more)

### Community 2 - "App Shell & Layout"
Cohesion: 0.4
Nodes (3): inter, metadata, SidebarProvider()

### Community 17 - "Seapod Build Trigger"
Cohesion: 0.28
Nodes (6): POST(), POST(), POST(), requireRole(), POST(), POST()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (3): INVOICE_PACKAGES, SUB_TYPE_OPTIONS, authedFetch()

## Knowledge Gaps
- **21 isolated node(s):** `config`, `config`, `nextConfig`, `eslintConfig`, `inter` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 3 inferred relationships involving `Production Portal Project (Next.js)` (e.g. with `File Icon SVG` and `Globe / Web Icon SVG`) actually correct?**
  _`Production Portal Project (Next.js)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `config`, `nextConfig` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin & Orders UI` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._