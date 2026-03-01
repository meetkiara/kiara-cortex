/**
 * LocalStorage persistence helpers for Kiara Cortex.
 * Persists connection config + last workspace so users don't
 * have to reconnect after every page refresh.
 */

import type { ConnectionConfig } from "./types";

const STORAGE_KEY = "kiara-cortex";

interface PersistedState {
  connection: ConnectionConfig;
  workspace: string | null;
}

export function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Basic validation
    if (parsed.connection && typeof parsed.connection.host === "string" && typeof parsed.connection.port === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
