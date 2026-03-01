"use client";

import { useCortexStore } from "@/lib/store";
import { ConnectScreen } from "@/components/connect-screen";
import { Dashboard } from "@/components/dashboard";

export default function Home() {
  const { isConnected, selectedWorkspace } = useCortexStore();

  if (!isConnected || !selectedWorkspace) {
    return <ConnectScreen />;
  }

  return <Dashboard />;
}
