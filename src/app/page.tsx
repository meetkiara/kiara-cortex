"use client";

import { useEffect, useState } from "react";
import { useCortexStore } from "@/lib/store";
import { testConnection } from "@/lib/api";
import { loadPersistedState, clearPersistedState } from "@/lib/persist";
import { ConnectScreen } from "@/components/connect-screen";
import { Dashboard } from "@/components/dashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isConnected } = useCortexStore();
  const [isRestoring, setIsRestoring] = useState(true);

  // Attempt to auto-reconnect from persisted state on mount
  useEffect(() => {
    const restore = async () => {
      const persisted = loadPersistedState();
      if (!persisted) {
        setIsRestoring(false);
        return;
      }

      const store = useCortexStore.getState();
      // Already connected — skip
      if (store.isConnected) {
        setIsRestoring(false);
        return;
      }

      try {
        const result = await testConnection(persisted.connection);
        if (result.connected) {
          store.setConnection(persisted.connection);
          store.setConnected(true);
          store.setWorkspaces(result.graphs || []);
          if (result.workspaces) {
            store.setWorkspaceInfos(result.workspaces);
          }
          // Restore last workspace selection
          if (persisted.workspace && result.graphs?.includes(persisted.workspace)) {
            store.setSelectedWorkspace(persisted.workspace);
          }
        } else {
          // Connection no longer valid — clear persisted
          clearPersistedState();
        }
      } catch {
        clearPersistedState();
      } finally {
        setIsRestoring(false);
      }
    };

    restore();
  }, []);

  // Show a minimal loading state while restoring
  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 animate-fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Reconnecting...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <ConnectScreen />;
  }

  return <Dashboard />;
}
