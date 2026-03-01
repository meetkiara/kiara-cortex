# Kiara Cortex — Agent Context

Admin dashboard for exploring and managing Kiara's FalkorDB knowledge graph. Renders entity nodes, relationship edges, and episodic memories as an interactive network.

## Stack

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | shadcn/ui (new-york style), Tailwind CSS v4 |
| State | Zustand |
| Graph DB | FalkorDB (`falkordb` npm) via direct connection |
| Graph Viz | vis-network (canvas-based) |
| Theme | next-themes (dark/light with `.dark` class) |

## Dev Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server on :3000 (Turbopack)
bun run build        # Production build — catches type errors
bun lint             # ESLint check
```

## Architecture

### Application Flow

```
connect-screen.tsx → API /connect → falkordb.ts (test + list graphs)
    → dashboard.tsx → API /graph → falkordb.ts (fetch graph data)
        → graph-canvas.tsx (vis-network rendering)
        → sidebar.tsx (entity/edge/episode lists)
        → detail-panel.tsx (selected item detail)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/falkordb.ts` | Server-side FalkorDB connection, graph queries (Cypher). Singleton with 5s timeout + `Promise.race`. |
| `src/lib/api.ts` | Client-side fetch wrappers for all API routes |
| `src/lib/store.ts` | Zustand store — all app state (connection, graph data, selection, UI toggles) |
| `src/lib/types.ts` | TypeScript interfaces, entity color maps, `getNodeColor`, `getEntityTypeColor`, attribute metadata |
| `src/lib/persist.ts` | localStorage persistence for auto-reconnect |
| `src/components/dashboard.tsx` | Main layout: header, sidebar, graph canvas, detail panel, status toast |
| `src/components/graph-canvas.tsx` | vis-network initialization, density-adaptive config, hover tooltips, zoom controls |
| `src/components/detail-panel.tsx` | Selected node/edge/episode detail with typed attribute rendering |
| `src/components/sidebar.tsx` | Searchable, filterable lists of nodes, edges, episodes |
| `src/components/workspace-dropdown.tsx` | Custom workspace selector with node/edge count pills |
| `src/components/entity-filter-bar.tsx` | Chart-legend style entity type toggle buttons |
| `src/components/stats-bar.tsx` | Compact graph statistics display |
| `src/app/api/connect/route.ts` | Test connection + list workspaces with counts |
| `src/app/api/graph/route.ts` | Fetch full graph data for a workspace |
| `src/app/api/graph/delete-node/route.ts` | Delete node by UUID |
| `src/app/api/graph/delete-edge/route.ts` | Delete edge by UUID |

### API Routes

All routes accept POST with `{ host, port, username?, password?, workspace?, uuid? }`.

Port is validated as a number (`Number.isNaN` guard) in all routes.

## Design System Conventions

### Color System

- **All design tokens** use OKLCH color space, defined in `globals.css` as CSS custom properties
- **Primary**: Coral (#FF6139) — used for selection, active states, branding
- **Entity type colors**: Defined in `ENTITY_COLORS` / `ENTITY_COLORS_DARK` in `types.ts`
  - Merchant: deep orange, Property: sky blue, Unit: violet, User: amber, ExpenseCategory: red, Entity: grey
- **Episode color**: Amber (`EPISODE_COLOR` in types.ts) — used in sidebar, detail panel, stats bar

### vis-network Colors (Important!)

`VIS_COLORS` and `VIS_FONT_FACE` in `graph-canvas.tsx` use **raw hex/rgba values** because vis-network renders on `<canvas>` and **cannot read CSS custom properties**. These intentionally duplicate some values from the design system. When changing theme colors, update both `globals.css` AND `VIS_COLORS`.

### Node Coloring

Two different color functions for different contexts:
- `getNodeColor(node, isDark)` — Hash-based vibrant color for graph rendering (generic Entity nodes get palette diversity)
- `getEntityTypeColor(labels, isDark)` — Type-based canonical color for UI chrome (badges, accent bars, detail panel headers)

### Shape & Spacing

- Buttons: Pill-shaped (`rounded-full`)
- Inputs: `rounded-lg`, `h-10`
- Cards: `rounded-xl`
- Glass effects: `backdrop-filter: blur(20px) saturate(1.2)` — used for header, status toast
- Hex alpha pattern: `${color}99` = 60% opacity (used in sidebar subtitles)

### Typography

- Body: DM Sans
- Display: Instrument Serif
- Code/mono: JetBrains Mono
- Logo: "KIARA" uppercase, `text-[11px] font-semibold tracking-[0.12em]` in coral

## Key Patterns

### Density-Adaptive Graph Configuration

`getDensityConfig(nodeCount)` in `graph-canvas.tsx` returns a `DensityConfig` object that scales all visual and physics parameters across 4 tiers:
- Small (≤15 nodes): spacious, all labels visible
- Medium (≤35): moderate spacing
- Dense (≤80): compact layout
- Very Dense (>80): minimal labels, tight physics

### Entity Attribute System

`ENTITY_ATTRIBUTE_META` in `types.ts` is the single source of truth for how entity-specific properties render. Each attribute has a label and kind (`badge`, `text`, `mono`, `boolean`). Adding a new property = one config line.

### Graph Canvas Helpers

`initNetwork` in `graph-canvas.tsx` is decomposed into pure helper functions:
- `computeDegreeMap(edges)` — O(E) degree calculation
- `buildVisNodes(...)` — node data builder
- `buildVisEdges(...)` — edge data builder with source-tinted colors
- `getNetworkOptions(cfg, hasPositions)` — vis-network options builder

### State Management

Single Zustand store (`store.ts`) with flat state. No nested selectors — components destructure what they need. Selection is mutually exclusive (node OR edge OR episode).

### Connection Safety

- 5s connect timeout via `connectTimeout` + 6s `Promise.race` outer guard
- `reconnectStrategy: false` prevents Redis auto-reconnect loops
- All API routes validate port is a valid number
- `CORE_PROPERTY_KEYS` in `falkordb.ts` defines which node properties are structural vs. entity-specific attributes

## Development Guidelines

1. **Zero inline OKLCH in components** — all tokens via CSS custom properties
2. **vis-network needs raw values** — never use `var(--color-*)` in VIS_COLORS
3. **Pure functions for graph helpers** — no hooks, no closures, data in → data out
4. **BigInt safety** — FalkorDB may return BigInt; always `Number(value)` before JSON
5. **`serverExternalPackages: ["falkordb"]`** in `next.config.ts` prevents bundling errors
6. **Test with both themes** — dark/light toggle must not shift layout or break colors
