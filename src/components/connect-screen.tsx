"use client";

import { useState } from "react";
import Image from "next/image";
import { useCortexStore } from "@/lib/store";
import { testConnection } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Database,
  Server,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export function ConnectScreen() {
  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState("6380");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const {
    isConnecting,
    connectionError,
    workspaces,
    selectedWorkspace,
    setConnection,
    setConnected,
    setConnecting,
    setConnectionError,
    setWorkspaces,
    setSelectedWorkspace,
  } = useCortexStore();

  const handleConnect = async () => {
    setConnecting(true);
    setConnectionError(null);

    try {
      const config = {
        host,
        port: Number(port),
        username: username || undefined,
        password: password || undefined,
      };

      const result = await testConnection(config);

      if (result.connected) {
        setConnection(config);
        setConnected(true);
        setWorkspaces(result.graphs || []);
      } else {
        setConnectionError(result.error || "Connection failed");
      }
    } catch (err) {
      setConnectionError(
        err instanceof Error ? err.message : "Connection failed"
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectWorkspace = (ws: string) => {
    setSelectedWorkspace(ws);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isConnecting && host && port) {
      handleConnect();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-background" />

      {/* Subtle warm gradient washes */}
      <div className="fixed inset-0 opacity-40 dark:opacity-15 pointer-events-none connect-ambient" />

      {/* Subtle dot pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Theme toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Logo area — Kiara Brandmark + Text Wordmark */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5 relative">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg ring-1 ring-border/10">
              <Image
                src="/logo-brandmark.png"
                alt="Kiara"
                width={56}
                height={56}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            {/* Glow behind logo */}
            <div className="absolute inset-0 -z-10 blur-2xl opacity-40 dark:opacity-25 scale-150 brand-glow" />
          </div>

          {/* Kiara wordmark */}
          <h1 className="text-[13px] font-semibold tracking-[0.12em] uppercase mb-1 text-primary">
            KIARA
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-px w-6 bg-border/60" />
            <span className="text-[11px] text-muted-foreground tracking-wide font-medium">
              CORTEX
            </span>
            <div className="h-px w-6 bg-border/60" />
          </div>
          <p className="text-[13px] text-muted-foreground mt-3">
            Knowledge graph explorer
          </p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-2xl p-7 shadow-xl" onKeyDown={handleKeyDown}>
          <div className="space-y-4">
            {/* Host + Port row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="host"
                  className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Server className="w-3 h-3" />
                  Host
                </Label>
                <Input
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  className="bg-background/60 border-border/40 dark:bg-background/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="port"
                  className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Port
                </Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="6380"
                  className="bg-background/60 border-border/40 dark:bg-background/40"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Database className="w-3 h-3" />
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="optional"
                className="bg-background/60 border-border/40 dark:bg-background/40"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Lock className="w-3 h-3" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="optional"
                className="bg-background/60 border-border/40 dark:bg-background/40"
              />
            </div>

            {/* Error */}
            {connectionError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-[13px] leading-snug">{connectionError}</span>
              </div>
            )}

            {/* Connect button — pill shape, gradient energy */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !host || !port}
              className="w-full h-11 gradient-energy text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect to FalkorDB
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Workspace selector (appears after successful connection) */}
            {workspaces.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border/30 animate-slide-up">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3 h-3" />
                  Select Workspace Graph
                </Label>
                <Select
                  value={selectedWorkspace || ""}
                  onValueChange={handleSelectWorkspace}
                >
                  <SelectTrigger className="bg-background/60 border-border/40 rounded-lg h-10 dark:bg-background/40">
                    <SelectValue placeholder="Choose a graph..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {workspaces.map((ws) => (
                      <SelectItem key={ws} value={ws} className="rounded-lg">
                        {ws}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-6 tracking-wide">
          Direct connection &middot; Cypher queries &middot; FalkorDB
        </p>
      </div>
    </div>
  );
}
