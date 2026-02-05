"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { ReactGrabAPI } from "react-grab";

interface RelayClient {
  onMessage: (callback: (message: RelayMessage) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
  onHandlersChange: (callback: (handlers: string[]) => void) => () => void;
  getAvailableHandlers: () => string[];
  isConnected: () => boolean;
}

interface RelayMessage {
  type: string;
  agentId?: string;
  sessionId?: string;
  content?: string;
  handlers?: string[];
}

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
    __REACT_GRAB_RELAY__?: RelayClient;
  }
}

interface LogEntry {
  type: string;
  message: string;
  time: Date;
}

const LOG_TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  info: { icon: "◆", color: "text-muted-foreground" },
  connect: { icon: "●", color: "text-green-500" },
  disconnect: { icon: "○", color: "text-red-500" },
  handlers: { icon: "↔", color: "text-blue-500" },
  status: { icon: "◉", color: "text-purple-500" },
  done: { icon: "✓", color: "text-green-500" },
  error: { icon: "✕", color: "text-red-500" },
};

const MAX_LOG_ENTRIES = 50;
const STATUS_TRUNCATE_LENGTH = 60;
const RELAY_CHECK_INTERVAL_MS = 100;

const PROVIDER_SCRIPTS: Record<string, string> = {
  claude: "/@provider-claude-code/client.global.js",
  cursor: "/@provider-cursor/client.global.js",
  opencode: "/@provider-opencode/client.global.js",
  ami: "/@provider-ami/client.global.js",
  amp: "/@provider-amp/client.global.js",
  codex: "/@provider-codex/client.global.js",
  gemini: "/@provider-gemini/client.global.js",
  droid: "/@provider-droid/client.global.js",
};

interface ProviderBadgeProps {
  provider: string;
  isActive: boolean;
  onClick?: () => void;
}

const ProviderBadge = ({ provider, isActive, onClick }: ProviderBadgeProps) => {
  return (
    <Badge
      variant={isActive ? "default" : "outline"}
      className="cursor-pointer"
      onClick={onClick}
    >
      {provider}
    </Badge>
  );
};

interface AgentPlaygroundProps {
  loadedProviders: string[];
  failedProviders: string[];
  availableProviders: string[];
}

export const AgentPlaygroundContent = ({
  loadedProviders,
  failedProviders,
  availableProviders,
}: AgentPlaygroundProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [relayConnected, setRelayConnected] = useState(false);
  const [relayHandlers, setRelayHandlers] = useState<string[]>([]);
  const didInit = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: string, message: string) => {
    setLogs((previousLogs) => {
      const newLogs = [...previousLogs, { type, message, time: new Date() }];
      if (newLogs.length > MAX_LOG_ENTRIES) {
        return newLogs.slice(-MAX_LOG_ENTRIES);
      }
      return newLogs;
    });
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const api = window.__REACT_GRAB__;
    if (!api) {
      queueMicrotask(() => {
        addLog("error", "React Grab not initialized");
      });
      return;
    }

    queueMicrotask(() => {
      for (const provider of failedProviders) {
        addLog("error", `Failed to load: ${provider}`);
      }

      if (loadedProviders.length === 0 && failedProviders.length === 0) {
        addLog("info", "No providers loaded. Add ?provider=cursor,claude to URL");
      } else {
        for (const provider of loadedProviders) {
          addLog("info", `Loaded: ${provider}`);
        }
      }
    });
  }, [loadedProviders, failedProviders, addLog]);

  useEffect(() => {
    let relayCleanup: (() => void) | false = false;

    const checkForRelay = () => {
      const relayClient = window.__REACT_GRAB_RELAY__;
      if (!relayClient) return false;

      const isConnected = relayClient.isConnected();
      setRelayConnected(isConnected);
      setRelayHandlers(relayClient.getAvailableHandlers());

      const unsubscribeConnection = relayClient.onConnectionChange(
        (connected) => {
          setRelayConnected(connected);
          addLog(
            connected ? "connect" : "disconnect",
            connected ? "Relay connected" : "Relay disconnected",
          );
        },
      );

      const unsubscribeHandlers = relayClient.onHandlersChange((handlers) => {
        setRelayHandlers(handlers);
        if (handlers.length > 0) {
          addLog("handlers", `Available: ${handlers.join(", ")}`);
        }
      });

      const unsubscribeMessage = relayClient.onMessage((message) => {
        if (
          message.type === "agent-status" &&
          message.content &&
          message.agentId
        ) {
          const truncatedContent =
            message.content.length > STATUS_TRUNCATE_LENGTH
              ? `${message.content.slice(0, STATUS_TRUNCATE_LENGTH)}…`
              : message.content;
          addLog("status", `[${message.agentId}] ${truncatedContent}`);
        } else if (message.type === "agent-done" && message.agentId) {
          addLog("done", `[${message.agentId}] Completed`);
        } else if (message.type === "agent-error" && message.agentId) {
          const errorContent = message.content || "Unknown error";
          addLog("error", `[${message.agentId}] ${errorContent}`);
        }
      });

      return () => {
        unsubscribeConnection();
        unsubscribeHandlers();
        unsubscribeMessage();
      };
    };

    const cleanup = checkForRelay();
    if (cleanup) return cleanup;

    const intervalId = setInterval(() => {
      const result = checkForRelay();
      if (result) {
        relayCleanup = result;
        clearInterval(intervalId);
      }
    }, RELAY_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (relayCleanup) {
        relayCleanup();
      }
    };
  }, [addLog]);

  const handleAddProvider = (provider: string) => {
    const currentProviders =
      new URLSearchParams(window.location.search).get("provider") ?? "";
    const providerList = currentProviders ? currentProviders.split(",") : [];

    if (providerList.includes(provider)) {
      return;
    }

    providerList.push(provider);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("provider", providerList.join(","));
    window.location.assign(newUrl.toString());
  };

  const handleRemoveProvider = (provider: string) => {
    const currentProviders =
      new URLSearchParams(window.location.search).get("provider") ?? "";
    const providerList = currentProviders
      .split(",")
      .filter((providerInList) => providerInList !== provider);

    const newUrl = new URL(window.location.href);
    if (providerList.length === 0) {
      newUrl.searchParams.delete("provider");
    } else {
      newUrl.searchParams.set("provider", providerList.join(","));
    }
    window.location.assign(newUrl.toString());
  };

  const inactiveProviders = availableProviders.filter(
    (provider) =>
      !loadedProviders.includes(provider) &&
      !failedProviders.includes(provider),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agent Playground
          </h1>
          <p className="text-muted-foreground text-sm">
            Select any element and choose an agent from the context menu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                relayConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {relayConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <Button onClick={() => window.__REACT_GRAB__?.activate()}>
            Grab Element
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Test Elements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button variant="default">Submit</Button>
            <Button variant="outline">Cancel</Button>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium">User Card</div>
              <div className="text-muted-foreground text-xs mt-1">
                john@example.com
              </div>
            </CardContent>
          </Card>
          <Input type="text" placeholder="Search…" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            {relayHandlers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({relayHandlers.length} handler
                {relayHandlers.length !== 1 ? "s" : ""} ready)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {loadedProviders.length === 0 &&
            failedProviders.length === 0 &&
            inactiveProviders.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                None available
              </span>
            ) : (
              <>
                {loadedProviders.map((provider) => (
                  <ProviderBadge
                    key={provider}
                    provider={provider}
                    isActive={true}
                    onClick={() => handleRemoveProvider(provider)}
                  />
                ))}
                {failedProviders.map((provider) => (
                  <Badge
                    key={provider}
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => handleRemoveProvider(provider)}
                  >
                    {provider} ✕
                  </Badge>
                ))}
                {inactiveProviders.map((provider) => (
                  <ProviderBadge
                    key={provider}
                    provider={provider}
                    isActive={false}
                    onClick={() => handleAddProvider(provider)}
                  />
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-1 min-h-[180px] max-h-[300px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                Waiting…
              </div>
            ) : (
              <div className="flex flex-col">
                {logs.map((log, logIndex) => {
                  const style =
                    LOG_TYPE_STYLES[log.type] ?? LOG_TYPE_STYLES.info;
                  return (
                    <div
                      key={logIndex}
                      className="flex items-start gap-3 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className={`${style.color} text-xs w-3 mt-0.5 shrink-0`}
                      >
                        {style.icon}
                      </span>
                      <span className="text-foreground/70 text-sm flex-1 break-all font-mono">
                        {log.message}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums shrink-0">
                        {log.time.toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const loadProviderScript = (provider: string): Promise<string> => {
  const scriptSrc = PROVIDER_SCRIPTS[provider];

  if (!scriptSrc) {
    return Promise.reject(new Error(`Unknown provider: ${provider}`));
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.onload = () => resolve(provider);
    script.onerror = () =>
      reject(new Error(`Failed to load provider: ${provider}`));
    document.head.appendChild(script);
  });
};

export const AgentPlayground = () => {
  const [state, setState] = useState<{
    loaded: string[];
    failed: string[];
    isLoading: boolean;
  }>({ loaded: [], failed: [], isLoading: true });

  useEffect(() => {
    const loadAllProviders = async () => {
      const urlProviders = new URLSearchParams(window.location.search).get(
        "provider",
      );
      const envProviders = process.env.NEXT_PUBLIC_PROVIDER;

      const providerString = urlProviders ?? envProviders;
      if (!providerString) {
        setState({ loaded: [], failed: [], isLoading: false });
        return;
      }

      const providers = providerString
        .split(",")
        .map((provider) => provider.trim())
        .filter(Boolean);

      if (providers.length === 0) {
        setState({ loaded: [], failed: [], isLoading: false });
        return;
      }

      const results = await Promise.allSettled(
        providers.map((provider) => loadProviderScript(provider)),
      );

      const loaded: string[] = [];
      const failed: string[] = [];

      providers.forEach((provider, index) => {
        const result = results[index];
        if (result.status === "fulfilled") {
          loaded.push(result.value);
        } else {
          console.error(
            `Failed to load provider "${provider}":`,
            result.reason,
          );
          failed.push(provider);
        }
      });

      setState({ loaded, failed, isLoading: false });
    };

    loadAllProviders();
  }, []);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading providers...</div>
      </div>
    );
  }

  return (
    <AgentPlaygroundContent
      loadedProviders={state.loaded}
      failedProviders={state.failed}
      availableProviders={Object.keys(PROVIDER_SCRIPTS)}
    />
  );
};
