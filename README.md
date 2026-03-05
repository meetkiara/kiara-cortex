# Kiara Cortex

Admin dashboard for exploring and managing Kiara's knowledge graph. Renders entity nodes, relationship edges, and episodic memories as an interactive network.

Kiara is an AI-powered property management platform. Its backend maintains a **memory graph** — a knowledge graph storing everything the AI agents learn about a workspace: tenants, properties, units, merchants, expense categories, and the relationships between them. The graph is powered by [FalkorDB](https://www.falkordb.com/) and [Graphiti](https://github.com/getzep/graphiti).

Cortex makes the memory graph visible. Connect to any FalkorDB instance, pick a workspace, and explore what the AI knows.

## Features

- **Interactive graph visualization** — canvas-based network rendering with density-adaptive physics, hover tooltips, and zoom controls
- **Browse everything** — searchable, filterable lists of entity nodes, fact edges, and ingested episodes
- **Entity type filtering** — toggle visibility by type (Merchant, Property, Unit, User, ExpenseCategory) via a chart-legend filter bar
- **Temporal metadata** — inspect when facts became valid, were invalidated, or expired
- **Detail panel** — click any node, edge, or episode to see full details with typed attribute rendering
- **Multi-workspace** — switch between isolated graph databases with node/edge count indicators
- **Dark/light theme** — full theme support with OKLCH color tokens
- **Node & edge management** — delete entities and relationships directly from the dashboard

## Stack

| Layer | Tech |
|-------|------|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| State | [Zustand](https://zustand.docs.pmnd.rs) |
| Graph DB | [FalkorDB](https://www.falkordb.com/) via `falkordb` npm package |
| Graph Viz | [vis-network](https://visjs.github.io/vis-network/docs/network/) |
| Theme | [next-themes](https://github.com/pacocoursey/next-themes) |

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A running [FalkorDB](https://www.falkordb.com/) instance (local or remote)

## Getting Started

```bash
# Install dependencies
bun install

# Start the dev server (Turbopack)
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and enter your FalkorDB connection details (host, port, optional credentials). Cortex will list available workspaces — select one to load the graph.

## Scripts

```bash
bun dev          # Dev server on :3000
bun run build    # Production build
bun start        # Start production server
bun lint         # ESLint check
```

## Architecture

```
Connect Screen → /api/connect → FalkorDB (test + list graphs)
    → Dashboard → /api/graph → FalkorDB (fetch graph data)
        → Graph Canvas (vis-network)
        → Sidebar (entity/edge/episode lists)
        → Detail Panel (selected item)
```

All API routes accept POST with connection config (`host`, `port`, `username?`, `password?`) plus route-specific params (`workspace`, `uuid`). The FalkorDB client runs server-side only with a 5-second connect timeout.

### Key directories

```
src/
├── app/
│   ├── api/
│   │   ├── connect/       # Test connection + list workspaces
│   │   ├── graph/         # Fetch graph data, delete nodes/edges
│   │   └── ...
│   └── page.tsx           # Entry point
├── components/
│   ├── graph-canvas.tsx   # vis-network rendering + physics
│   ├── dashboard.tsx      # Main layout orchestration
│   ├── sidebar.tsx        # Searchable entity/edge/episode lists
│   ├── detail-panel.tsx   # Selected item detail view
│   ├── entity-filter-bar.tsx
│   ├── stats-bar.tsx
│   ├── workspace-dropdown.tsx
│   └── ui/                # shadcn/ui primitives
└── lib/
    ├── falkordb.ts        # Server-side FalkorDB queries (Cypher)
    ├── store.ts           # Zustand store
    ├── types.ts           # TypeScript interfaces + color maps
    ├── api.ts             # Client-side fetch wrappers
    └── persist.ts         # localStorage auto-reconnect
```

## License

Private — not licensed for external use.
