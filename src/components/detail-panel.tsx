"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useCortexStore } from "@/lib/store";
import { apiDeleteNode, apiDeleteEdge } from "@/lib/api";
import {
  getEntityType,
  getNodeColor,
  getEntityTypeColor,
  ENTITY_COLORS,
  ENTITY_COLORS_DARK,
  ENTITY_ATTRIBUTE_META,
  formatAttributeValue,
  EPISODE_COLOR,
  type AttributeMeta,
  type GraphData,
  type GraphNode,
  type GraphEdge,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  X,
  Trash2,
  Circle,
  ArrowRight,
  Clock,
  CalendarX,
  CalendarCheck,
  FileText,
  Loader2,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDate(d: string | null) {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function MetaRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-xs text-foreground break-all font-mono">{value}</p>
      </div>
    </div>
  );
}

export function DetailPanel() {
  const {
    connection,
    selectedWorkspace,
    selectedNode,
    selectedEdge,
    selectedEpisode,
    graphData,
    clearSelection,
    removeNode,
    removeEdge,
    setSelectedNode,
    setSelectedEdge,
  } = useCortexStore();

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? ENTITY_COLORS_DARK : ENTITY_COLORS;

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteNode = async () => {
    if (!connection || !selectedWorkspace || !selectedNode) return;
    setIsDeleting(true);
    try {
      await apiDeleteNode(connection, selectedWorkspace, selectedNode.uuid);
      removeNode(selectedNode.uuid);
      toast.success(`Deleted node "${selectedNode.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEdge = async () => {
    if (!connection || !selectedWorkspace || !selectedEdge) return;
    setIsDeleting(true);
    try {
      await apiDeleteEdge(connection, selectedWorkspace, selectedEdge.uuid);
      removeEdge(selectedEdge.uuid);
      toast.success("Deleted edge");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Connected edges for selected node
  const connectedEdges = selectedNode
    ? graphData?.edges.filter(
        (e) =>
          e.source_uuid === selectedNode.uuid ||
          e.target_uuid === selectedNode.uuid
      ) || []
    : [];

  // Build nodeColorMap for edge source/target coloring
  const nodeColorMap = new Map<string, string>();
  if (graphData) {
    for (const n of graphData.nodes) {
      nodeColorMap.set(n.uuid, getNodeColor(n, isDark));
    }
  }

  // Get entity TYPE color for accent bar (grey for generic Entity, not hash-palette)
  const accentColor = selectedNode
    ? getEntityTypeColor(selectedNode.labels, isDark)
    : selectedEdge
    ? colors.Entity
    : selectedEpisode
    ? (isDark ? EPISODE_COLOR.dark : EPISODE_COLOR.light)
    : undefined;

  return (
    <div className="w-[340px] shrink-0 border-l border-border/50 glass flex flex-col animate-slide-in-right overflow-hidden min-h-0">
      {/* Colored accent bar */}
      {accentColor && (
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <h3 className="text-sm font-serif italic text-foreground">
          {selectedNode
            ? "Entity"
            : selectedEdge
            ? "Relationship"
            : "Episode"}
        </h3>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={clearSelection}
          className="rounded-full cursor-pointer"
          aria-label="Close detail panel"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 [&>[data-slot=scroll-area-viewport]]:!overflow-x-hidden">
        <div className="p-4 space-y-4">
          {/* NODE DETAIL */}
          {selectedNode && <NodeDetail
            node={selectedNode}
            nodeColor={getNodeColor(selectedNode, isDark)}
            typeColor={getEntityTypeColor(selectedNode.labels, isDark)}
            connectedEdges={connectedEdges}
            isDeleting={isDeleting}
            onDelete={handleDeleteNode}
            onSelectEdge={setSelectedEdge}
            nodeColorMap={nodeColorMap}
          />}

          {/* EDGE DETAIL */}
          {selectedEdge && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <ClickableEntityName
                    name={selectedEdge.source_name}
                    uuid={selectedEdge.source_uuid}
                    color={nodeColorMap.get(selectedEdge.source_uuid)}
                    graphData={graphData}
                    onSelectNode={setSelectedNode}
                  />
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <ClickableEntityName
                    name={selectedEdge.target_name}
                    uuid={selectedEdge.target_uuid}
                    color={nodeColorMap.get(selectedEdge.target_uuid)}
                    graphData={graphData}
                    onSelectNode={setSelectedNode}
                  />
                </div>
                <Badge
                  className="text-[10px] border-0 font-medium bg-primary/10 text-primary"
                >
                  <GitBranch className="w-3 h-3 mr-1" />
                  {selectedEdge.name}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                <p className="text-xs leading-relaxed">{selectedEdge.fact}</p>
              </div>

              <Separator className="bg-border/30" />

              <div className="space-y-1">
                <MetaRow label="UUID" value={selectedEdge.uuid} />
                <MetaRow
                  label="Created"
                  value={formatDate(selectedEdge.created_at)}
                  icon={<Clock className="w-3 h-3" />}
                />
                <MetaRow
                  label="Valid At"
                  value={formatDate(selectedEdge.valid_at)}
                  icon={<CalendarCheck className="w-3 h-3" />}
                />
                <MetaRow
                  label="Invalid At"
                  value={formatDate(selectedEdge.invalid_at)}
                  icon={<CalendarX className="w-3 h-3" />}
                />
                <MetaRow
                  label="Expired At"
                  value={formatDate(selectedEdge.expired_at)}
                  icon={<CalendarX className="w-3 h-3" />}
                />
              </div>

              {selectedEdge.invalid_at && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <CalendarX className="w-3.5 h-3.5" />
                  This fact has been invalidated
                </div>
              )}

              <Separator className="bg-border/30" />

              <DeleteConfirmDialog
                title="Delete this relationship?"
                description={`This will permanently remove the relationship "${selectedEdge.fact}" from the graph.`}
                isDeleting={isDeleting}
                onConfirm={handleDeleteEdge}
                buttonLabel="Delete Edge"
              />
            </>
          )}

          {/* EPISODE DETAIL */}
          {selectedEpisode && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <h2 className="text-base font-semibold">
                    {selectedEpisode.name}
                  </h2>
                </div>
                <Badge className="text-[10px] border-0 font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {selectedEpisode.source}
                </Badge>
              </div>

              {selectedEpisode.source_description && (
                <p className="text-xs text-muted-foreground">
                  {selectedEpisode.source_description}
                </p>
              )}

              <Separator className="bg-border/30" />

              <div className="space-y-1">
                <MetaRow label="UUID" value={selectedEpisode.uuid} />
                <MetaRow
                  label="Created"
                  value={formatDate(selectedEpisode.created_at)}
                  icon={<Clock className="w-3 h-3" />}
                />
                <MetaRow label="Group" value={selectedEpisode.group_id} />
              </div>

              <Separator className="bg-border/30" />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                  Content
                </p>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/20 max-h-64 overflow-auto">
                  <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-foreground/80 leading-relaxed">
                    {selectedEpisode.content}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* --- Extracted sub-components --- */

function NodeDetail({
  node,
  nodeColor,
  typeColor,
  connectedEdges,
  isDeleting,
  onDelete,
  onSelectEdge,
  nodeColorMap,
}: {
  node: GraphNode;
  /** Vibrant per-node color (hash-based for generic Entity) — used for node dot */
  nodeColor: string;
  /** Canonical entity-type color (grey for Entity) — used for badges, attributes card */
  typeColor: string;
  connectedEdges: GraphEdge[];
  isDeleting: boolean;
  onDelete: () => void;
  onSelectEdge: (edge: GraphEdge) => void;
  nodeColorMap: Map<string, string>;
}) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {/* Colored node dot with glow ring — uses graph-matching nodeColor */}
          <span
            className="w-4 h-4 rounded-full mt-0.5 shrink-0 ring-4"
            style={{
              backgroundColor: nodeColor,
              boxShadow: `0 0 12px ${nodeColor}50`,
              outlineColor: `${nodeColor}20`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ["--tw-ring-color" as any]: `${nodeColor}20`,
            }}
          />
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {node.name}
            </h2>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {node.labels.map((l) => (
                <Badge
                  key={l}
                  className="text-[9px] px-1.5 py-0 h-4 border-0 font-medium"
                  style={{
                    backgroundColor: `${typeColor}18`,
                    color: typeColor,
                  }}
                >
                  {l}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {node.summary && (
          <CollapsibleSummary text={node.summary} />
        )}
      </div>

      {/* Entity-specific attributes card — uses type color */}
      <EntityAttributes node={node} color={typeColor} />

      <Separator className="bg-border/30" />

      <div className="space-y-1">
        <MetaRow
          label="UUID"
          value={node.uuid}
          icon={<Circle className="w-3 h-3" />}
        />
        <MetaRow
          label="Created"
          value={formatDate(node.created_at)}
          icon={<Clock className="w-3 h-3" />}
        />
        <MetaRow label="Group" value={node.group_id} />
      </div>

      {connectedEdges.length > 0 && (
        <>
          <Separator className="bg-border/30" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Connected Facts ({connectedEdges.length})
            </p>
            <div className="space-y-1.5">
              {connectedEdges.map((e) => {
                const srcColor = nodeColorMap.get(e.source_uuid) || nodeColor;
                const tgtColor = nodeColorMap.get(e.target_uuid) || nodeColor;
                return (
                  <button
                    key={e.uuid}
                    className="w-full text-left p-2.5 rounded-xl bg-muted/20 border border-border/20 text-[10px] cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => onSelectEdge(e)}
                  >
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: srcColor }}
                      />
                      <span className="font-medium text-foreground truncate min-w-0">
                        {e.source_name}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-primary shrink-0" />
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: tgtColor }}
                      />
                      <span className="font-medium text-foreground truncate min-w-0">
                        {e.target_name}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{e.fact}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Separator className="bg-border/30" />

      <DeleteConfirmDialog
        title={`Delete "${node.name}"?`}
        description="This will permanently delete this entity node and all its connected edges from the graph. This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={onDelete}
        buttonLabel="Delete Node"
      />
    </>
  );
}

function EntityAttributes({
  node,
  color,
}: {
  node: GraphNode;
  color: string;
}) {
  const type = getEntityType(node.labels);
  const metaConfig = ENTITY_ATTRIBUTE_META[type];
  if (!metaConfig || !node.attributes) return null;

  // Gather rows: configured attributes that exist on this node
  const rows: { key: string; meta: AttributeMeta; value: unknown }[] = [];
  for (const [key, meta] of Object.entries(metaConfig)) {
    const val = node.attributes[key];
    if (val != null && val !== "") {
      rows.push({ key, meta, value: val });
    }
  }

  // Also show any extra attributes NOT in the config (future-proofing)
  const configuredKeys = new Set(Object.keys(metaConfig));
  for (const [key, val] of Object.entries(node.attributes)) {
    if (!configuredKeys.has(key) && val != null && val !== "") {
      rows.push({
        key,
        meta: {
          label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          kind: "text",
        },
        value: val,
      });
    }
  }

  if (rows.length === 0) return null;

  const typeLabel = type === "ExpenseCategory" ? "Category" : type;

  return (
    <div className="rounded-xl bg-muted/20 border border-border/20 overflow-hidden">
      {/* Section header in entity color */}
      <div
        className="px-3 py-1.5 flex items-center gap-1.5"
        style={{ backgroundColor: `${color}10` }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color }}
        >
          {typeLabel} Details
        </span>
      </div>

      {/* Attribute rows — 2-column grid for clean alignment */}
      <div className="px-3 py-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 items-baseline">
        {rows.map(({ key, meta, value }) => (
          <Fragment key={key}>
            <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
              {meta.label}
            </span>
            <div className="min-w-0">
              <AttributeValue meta={meta} value={value} color={color} />
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function AttributeValue({
  meta,
  value,
  color,
}: {
  meta: AttributeMeta;
  value: unknown;
  color: string;
}) {
  switch (meta.kind) {
    case "badge":
      return (
        <span
          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${color}15`,
            color,
          }}
        >
          {formatAttributeValue(value)}
        </span>
      );
    case "boolean":
      return (
        <span
          className={cn(
            "inline-block text-[10px] font-medium px-2 py-0.5 rounded-full",
            value
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted/40 text-muted-foreground"
          )}
        >
          {value ? "Yes" : "No"}
        </span>
      );
    case "mono":
      return (
        <span className="text-[11px] font-mono text-foreground/80 break-all">
          {String(value)}
        </span>
      );
    case "text":
    default: {
      // Only title-case short enum-like values; leave longer text as-is
      const str = String(value);
      const display = str.length < 60 ? formatAttributeValue(value) : str;
      return (
        <span className="text-[11px] text-foreground/90 leading-snug">
          {display}
        </span>
      );
    }
  }
}

function CollapsibleSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Check if content overflows 4 lines (~64px at text-xs leading-relaxed)
      setClamped(ref.current.scrollHeight > ref.current.clientHeight + 2);
    }
  }, [text]);

  return (
    <div className="relative">
      <p
        ref={ref}
        className={cn(
          "text-xs text-muted-foreground leading-relaxed",
          !expanded && "line-clamp-4"
        )}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-medium text-primary hover:text-primary/80 mt-1 cursor-pointer transition-colors"
        >
          {expanded ? "Show less" : "Show more…"}
        </button>
      )}
    </div>
  );
}

/** Clickable entity name in edge detail — navigates to the node on click */
function ClickableEntityName({
  name,
  uuid,
  color,
  graphData,
  onSelectNode,
}: {
  name: string;
  uuid: string;
  color?: string;
  graphData: GraphData | null;
  onSelectNode: (node: GraphNode) => void;
}) {
  const node = graphData?.nodes.find((n) => n.uuid === uuid);
  if (!node) {
    // Node not in graph (filtered out) — show plain text
    return (
      <span className="font-semibold truncate min-w-0 text-muted-foreground/70">
        {name}
      </span>
    );
  }
  return (
    <button
      onClick={() => onSelectNode(node)}
      className="group/entity inline-flex items-center gap-1.5 min-w-0 cursor-pointer transition-colors"
      title={`Go to ${name}`}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="font-semibold truncate min-w-0 group-hover/entity:text-primary transition-colors underline decoration-primary/30 underline-offset-2 group-hover/entity:decoration-primary/60">
        {name}
      </span>
    </button>
  );
}

function DeleteConfirmDialog({
  title,
  description,
  isDeleting,
  onConfirm,
  buttonLabel,
}: {
  title: string;
  description: string;
  isDeleting: boolean;
  onConfirm: () => void;
  buttonLabel: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card rounded-2xl border-border/30 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-2" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
