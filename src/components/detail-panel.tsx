"use client";

import { useState } from "react";
import { useCortexStore } from "@/lib/store";
import { apiDeleteNode, apiDeleteEdge } from "@/lib/api";
import { getEntityType, ENTITY_COLORS, ENTITY_COLORS_DARK } from "@/lib/types";
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
        <p className="text-xs text-foreground break-all">{value}</p>
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
    setSelectedEdge,
  } = useCortexStore();

  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? ENTITY_COLORS_DARK : ENTITY_COLORS;

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

  return (
    <div className="w-80 shrink-0 border-l border-border/50 bg-card/50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Details
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

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* NODE DETAIL */}
          {selectedNode && <NodeDetail
            node={selectedNode}
            color={colors[getEntityType(selectedNode.labels)]}
            connectedEdges={connectedEdges}
            isDeleting={isDeleting}
            onDelete={handleDeleteNode}
            onSelectEdge={setSelectedEdge}
          />}

          {/* EDGE DETAIL */}
          {selectedEdge && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{selectedEdge.source_name}</span>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold">{selectedEdge.target_name}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  <GitBranch className="w-3 h-3 mr-1" />
                  {selectedEdge.name}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
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
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
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
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold">
                    {selectedEpisode.name}
                  </h2>
                </div>
                <Badge variant="outline" className="text-[10px]">
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
                <div className="p-3 rounded-lg bg-muted/30 border border-border/20 max-h-64 overflow-auto">
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
  color,
  connectedEdges,
  isDeleting,
  onDelete,
  onSelectEdge,
}: {
  node: import("@/lib/types").GraphNode;
  color: string;
  connectedEdges: import("@/lib/types").GraphEdge[];
  isDeleting: boolean;
  onDelete: () => void;
  onSelectEdge: (edge: import("@/lib/types").GraphEdge) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span
            className="w-3 h-3 rounded-full mt-1 shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {node.name}
            </h2>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.labels.map((l) => (
                <Badge
                  key={l}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4"
                  style={{ color, borderColor: `${color}40` }}
                >
                  {l}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        {node.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {node.summary}
          </p>
        )}
      </div>

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
              {connectedEdges.map((e) => (
                <button
                  key={e.uuid}
                  className="w-full text-left p-2 rounded-lg bg-muted/30 border border-border/20 text-[10px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelectEdge(e)}
                >
                  <div className="flex items-center gap-1 text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">
                      {e.source_name}
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-primary" />
                    <span className="font-medium text-foreground">
                      {e.target_name}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{e.fact}</p>
                </button>
              ))}
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
      <AlertDialogContent>
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
