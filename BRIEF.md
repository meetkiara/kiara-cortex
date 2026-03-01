# Kiara Cortex

## What is Kiara?

Kiara is an AI-powered property management platform. Its backend maintains a **memory graph** — a knowledge graph that stores everything the AI agents learn about a workspace: tenants, properties, units, merchants, expense categories, leases, payment patterns, and the relationships between them.

The graph is powered by **FalkorDB** (a Redis-based graph database) and **Graphiti** (an open-source framework for temporal knowledge graphs). Each workspace has its own isolated graph database.

## The Problem

Today there is no way to see what the AI actually knows. The memory graph is a black box — you can query it through CLI tools, but you can't explore it visually, understand its structure, or audit what facts the system has learned.

For the team building Kiara, this means:

- **Debugging is blind** — when the AI gives a wrong answer, you can't easily see what knowledge it drew from or what's missing
- **No trust signal** — there's no way to show a user "here's what I know about your workspace"
- **Quality is hard to measure** — you can't tell if the entity extraction is creating clean, well-connected graphs or fragmented noise
- **No audit trail** — facts have temporal metadata (valid_at, invalid_at, expired_at) but there's no way to visualize how knowledge evolves over time

## The Product

Kiara Cortex is a standalone web app for exploring and understanding Kiara's memory graphs.

### What it should do

1. **Visualize the graph** — show entity nodes and their relationships as an interactive network diagram. Nodes should be color-coded by type (Merchant, Property, Unit, User, ExpenseCategory, etc.). Edges represent facts connecting entities.

2. **Browse everything** — list all nodes, facts (edges), and episodes (raw ingested content) in a searchable sidebar. Click anything to see its full details.

3. **Show facts in context** — when you click a node, show all the facts connected to it. When you click a fact, show the two entities it connects and its temporal metadata.

4. **Live data** — connect to the Kiara backend API to fetch graph data for any workspace. Include a refresh button to reload without a page refresh.

5. **Filter and explore** — filter by entity type, search across all content, toggle visibility of node types via the legend.

### What the graph contains

- **Entity nodes** — extracted entities like "Sunset Apartments" (Property), "Tenant Transfer" (Merchant), "Unit 5B" (Unit), "Rent Income" (ExpenseCategory). Each has a name, summary, labels, and UUID.

- **Entity edges (facts)** — relationships like "Unit 5B is within Marina District Condo" or "Transactions from Tenant Transfer are classified as Rent Income." Each has temporal metadata: when the fact became true, when it was invalidated, when it was manually expired.

- **Episodes** — raw content that was ingested (text from agent conversations, JSON from transaction processing). The source material from which entities and facts were extracted.

### Data source

The Kiara backend exposes a REST API. Cortex needs one endpoint to fetch the full graph for a workspace:

```
GET /api/v1/memory-graph/{workspace_id}
```

Response shape:
```json
{
  "workspace_id": 1,
  "group_id": "ws-1",
  "stats": {
    "total_nodes": 11,
    "total_edges": 24,
    "entity_nodes": 9,
    "entity_edges": 12,
    "episodes": 2
  },
  "nodes": [
    {
      "uuid": "...",
      "name": "Sunset Apartments",
      "summary": "A property in the workspace",
      "labels": ["Entity", "Property"],
      "group_id": "ws-1",
      "created_at": "2026-02-28T..."
    }
  ],
  "edges": [
    {
      "uuid": "...",
      "name": "is_unit_of",
      "fact": "Unit 201 is a unit within Sunset Apartments",
      "source_uuid": "...",
      "source_name": "Unit 201",
      "target_uuid": "...",
      "target_name": "Sunset Apartments",
      "created_at": "2026-02-28T...",
      "valid_at": "2026-02-28T...",
      "invalid_at": null,
      "expired_at": null,
      "group_id": "ws-1"
    }
  ],
  "episodes": [
    {
      "uuid": "...",
      "name": "memory_agent",
      "source": "text",
      "source_description": "Agent memory from conversation",
      "content": "...",
      "created_at": "2026-02-28T...",
      "group_id": "ws-1"
    }
  ]
}
```

### Entity types and their meaning

| Type | What it represents | Example |
|------|--------------------|---------|
| Merchant | A vendor or payment source | "PG&E", "Tenant Transfer" |
| Property | A real estate property | "Sunset Apartments", "Marina District Condo" |
| Unit | A unit within a property | "Unit 5B", "Unit 201" |
| User | A person (tenant, landlord, agent) | "Sarah Chen" |
| ExpenseCategory | A category from the chart of accounts | "Rent Income", "Utilities" |
| Entity | Generic (no specific type assigned) | "lease 3", "Rent Batch Deposit" |

### Design direction

Follow the Kiara brand identity. The reference UI library is at `~/projects/kiara/ui` — use its design tokens, colors, and typography.

**Key brand elements:**
- **Primary color**: Coral `#FF6139`
- **Accent**: Teal `#A1CACC` / `#5EC4C0`
- **Dark mode**: Warm espresso undertones, never cold gray/blue. Background `#151010`, surfaces warm-tinted.
- **Fonts**: General Sans (UI), JetBrains Mono (code/data)
- **Shape**: Rounded, pill-shaped badges, soft corners
- **Shadows**: Warm espresso-toned, never pure black

A working prototype already exists as a static HTML file at:
```
~/conductor/workspaces/kiara-backend/chengdu/scripts/memory_graph_template.html
```

This prototype has the complete UI structure (sidebar with tabs, interactive graph via vis-network, detail panel, legend, search) and can be used as a functional reference. Generate it with real data by running:
```
cd ~/conductor/workspaces/kiara-backend/chengdu
uv run python -m scripts.visualize_memory --workspace-id 1 -o /tmp/cortex_preview.html --open
```
