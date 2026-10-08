# Graph Report - production-portal  (2026-10-08)

## Corpus Check
- 55 files · ~30,457 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 208 edges · 23 communities (16 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7422334f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin & Orders UI|Admin & Orders UI]]
- [[_COMMUNITY_Static Assets & Branding|Static Assets & Branding]]
- [[_COMMUNITY_App Shell & Layout|App Shell & Layout]]
- [[_COMMUNITY_Kit & Template Detail Views|Kit & Template Detail Views]]
- [[_COMMUNITY_Data Sync API|Data Sync API]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Seapod Build Trigger|Seapod Build Trigger]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 17 edges
2. `logSyncFailure()` - 11 edges
3. `Production Portal Project (Next.js)` - 9 edges
4. `resolveSyncFailures()` - 8 edges
5. `authedFetch()` - 7 edges
6. `sendShippingWebhook()` - 7 edges
7. `sendSeapodBuild()` - 6 edges
8. `useSidebar()` - 5 edges
9. `POST()` - 5 edges
10. `buildShippingPayloads()` - 5 edges

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

## Communities (23 total, 7 thin omitted)

### Community 0 - "Admin & Orders UI"
Cohesion: 0.24
Nodes (5): CATEGORIES, RULES, SOURCES, FILTERS, STATUS_STYLE

### Community 1 - "Static Assets & Branding"
Cohesion: 0.19
Nodes (13): File Icon SVG, Globe / Web Icon SVG, Next.js Wordmark SVG, Vercel Logo SVG (Triangle Logomark), Browser Window Icon SVG, app/page.tsx Entry Point, create-next-app CLI, Geist Font Family (+5 more)

### Community 2 - "App Shell & Layout"
Cohesion: 0.13
Nodes (7): inter, metadata, Home(), Sidebar(), SidebarContext, SidebarProvider(), useSidebar()

### Community 17 - "Seapod Build Trigger"
Cohesion: 0.2
Nodes (10): POST(), POST(), requireRole(), sendSeapodBuild(), buildShippingPayloads(), POST(), POST(), GET() (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (4): INVOICE_PACKAGES, SUB_TYPE_OPTIONS, authedFetch(), SUB_TYPE_OPTIONS

### Community 27 - "Community 27"
Cohesion: 0.35
Nodes (8): POST(), sendShippingWebhook(), TARGETS, db(), logSyncFailure(), resolveSyncFailures(), classify(), POST()

## Knowledge Gaps
- **25 isolated node(s):** `config`, `config`, `nextConfig`, `eslintConfig`, `inter` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `Seapod Build Trigger` to `Community 27`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `logSyncFailure()` connect `Community 27` to `Seapod Build Trigger`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Production Portal Project (Next.js)` (e.g. with `File Icon SVG` and `Globe / Web Icon SVG`) actually correct?**
  _`Production Portal Project (Next.js)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `config`, `nextConfig` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 24` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._