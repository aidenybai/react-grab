import { useEffect, useState, useRef, useCallback } from "react";

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
    __REACT_GRAB__?: {
      activate: () => void;
    };
    __REACT_GRAB_RELAY__?: RelayClient;
  }
}

interface AppProps {
  loadedProviders: string[];
  failedProviders: string[];
  availableProviders: string[];
}

const ReactGrabLogo = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 294 294"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="logo-shimmer cursor-pointer"
  >
    <g clipPath="url(#clip0_0_3)">
      <mask
        id="mask0_0_3"
        style={{ maskType: "luminance" }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="294"
        height="294"
      >
        <path d="M294 0H0V294H294V0Z" fill="white" />
      </mask>
      <g mask="url(#mask0_0_3)">
        <path
          d="M144.599 47.4924C169.712 27.3959 194.548 20.0265 212.132 30.1797C227.847 39.2555 234.881 60.3243 231.926 89.516C231.677 92.0069 231.328 94.5423 230.94 97.1058L228.526 110.14C228.517 110.136 228.505 110.132 228.495 110.127C228.486 110.165 228.479 110.203 228.468 110.24L216.255 105.741C216.256 105.736 216.248 105.728 216.248 105.723C207.915 103.125 199.421 101.075 190.82 99.5888L190.696 99.5588L173.526 97.2648L173.511 97.2631C173.492 97.236 173.467 97.2176 173.447 97.1905C163.862 96.2064 154.233 95.7166 144.599 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8624 138.391 86.939 147.193C90.8624 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245C115.749 197.245 115.758 197.246 115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.507 229.974L144.609 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.472 238.38C154.485 238.392 154.499 238.402 154.513 238.412L143.846 247.482L143.827 247.497C126.56 261.128 109.472 268.745 94.8019 268.745C88.5916 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3164 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3363 185.327 9.52301 167.51 9.52301 147.193C9.52301 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3164 60.3243 61.3496 39.2555 77.0657 30.1797C94.6494 20.0265 119.486 27.3959 144.599 47.4924ZM70.6423 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5176 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8516 207.742 83.0977 205.066 70.6423 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1787 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.9311 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.759 110.203C59.234 110.839 57.7378 111.475 56.27 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9104 147.193C67.822 135.23 63.7566 122.855 60.759 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.854 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.6291 47.6015 67.6975 64.5954 70.0424 87.9446L70.0416 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8263 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.773 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.29 38.512C183.321 38.512 169.34 44.4991 154.444 56.0153C163.93 64.9374 172.634 74.6557 180.462 85.064C193.375 86.6345 206.128 89.3102 218.584 93.0624C218.812 91.4325 219.003 89.8118 219.165 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.552 64.3097C138.104 70.2614 132.054 76.6306 126.443 83.3765C132.39 82.995 138.426 82.8046 144.552 82.8046C150.727 82.8046 156.778 83.0143 162.707 83.3765C157.08 76.6293 151.015 70.2596 144.552 64.3097Z"
          fill="white"
        />
        <path
          d="M144.598 47.4924C169.712 27.3959 194.547 20.0265 212.131 30.1797C227.847 39.2555 234.88 60.3243 231.926 89.516C231.677 92.0069 231.327 94.5423 230.941 97.1058L228.526 110.14L228.496 110.127C228.487 110.165 228.478 110.203 228.469 110.24L216.255 105.741L216.249 105.723C207.916 103.125 199.42 101.075 190.82 99.5888L190.696 99.5588L173.525 97.2648L173.511 97.263C173.492 97.236 173.468 97.2176 173.447 97.1905C163.863 96.2064 154.234 95.7166 144.598 95.7223C134.943 95.7162 125.295 96.219 115.693 97.2286C110.075 105.033 104.859 113.118 100.063 121.453C95.2426 129.798 90.8622 138.391 86.939 147.193C90.8622 155.996 95.2426 164.588 100.063 172.933C104.866 181.302 110.099 189.417 115.741 197.245L115.766 197.247L115.752 197.27L115.745 197.283L115.754 197.296L126.501 211.013L126.574 211.089C132.136 217.767 138.126 224.075 144.506 229.974L144.61 230.082L154.572 238.287C154.539 238.319 154.506 238.35 154.473 238.38L154.512 238.412L143.847 247.482L143.827 247.497C126.56 261.13 109.472 268.745 94.8018 268.745C88.5915 268.837 82.4687 267.272 77.0657 264.208C61.3496 255.132 54.3162 234.062 57.2707 204.871C57.528 202.307 57.8806 199.694 58.2904 197.054C28.3362 185.327 9.52298 167.51 9.52298 147.193C9.52298 129.042 24.2476 112.396 50.9901 100.375C53.3443 99.3163 55.7938 98.3058 58.2904 97.3526C57.8806 94.7023 57.528 92.0803 57.2707 89.516C54.3162 60.3243 61.3496 39.2555 77.0657 30.1797C94.6493 20.0265 119.486 27.3959 144.598 47.4924ZM70.6422 201.315C70.423 202.955 70.2229 204.566 70.0704 206.168C67.6686 229.567 72.5478 246.628 83.3615 252.988L83.5175 253.062C95.0399 259.717 114.015 254.426 134.782 238.38C125.298 229.45 116.594 219.725 108.764 209.314C95.8515 207.742 83.0977 205.066 70.6422 201.315ZM80.3534 163.438C77.34 171.677 74.8666 180.104 72.9484 188.664C81.1786 191.224 89.5657 193.247 98.0572 194.724L98.4618 194.813C95.2115 189.865 92.0191 184.66 88.931 179.378C85.8433 174.097 83.003 168.768 80.3534 163.438ZM60.7589 110.203C59.234 110.839 57.7378 111.475 56.2699 112.11C34.7788 121.806 22.3891 134.591 22.3891 147.193C22.3891 160.493 36.4657 174.297 60.7494 184.26C63.7439 171.581 67.8124 159.182 72.9103 147.193C67.822 135.23 63.7566 122.855 60.7589 110.203ZM98.4137 99.6404C89.8078 101.145 81.3075 103.206 72.9676 105.809C74.8539 114.203 77.2741 122.468 80.2132 130.554L80.3059 130.939C82.9938 125.6 85.8049 120.338 88.8834 115.008C91.9618 109.679 95.1544 104.569 98.4137 99.6404ZM94.9258 38.5215C90.9331 38.4284 86.9866 39.3955 83.4891 41.3243C72.629 47.6015 67.6975 64.5954 70.0424 87.9446L70.0415 88.2194C70.194 89.8208 70.3941 91.4325 70.6134 93.0624C83.0737 89.3364 95.8262 86.6703 108.736 85.0924C116.57 74.6779 125.28 64.9532 134.772 56.0249C119.877 44.5087 105.895 38.5215 94.9258 38.5215ZM205.737 41.3148C202.268 39.398 198.355 38.4308 194.394 38.5099L194.291 38.512C183.321 38.512 169.34 44.4991 154.443 56.0153C163.929 64.9374 172.634 74.6557 180.462 85.064C193.374 86.6345 206.129 89.3102 218.584 93.0624C218.813 91.4325 219.003 89.8118 219.166 88.2098C221.548 64.7099 216.65 47.6164 205.737 41.3148ZM144.551 64.3097C138.103 70.2614 132.055 76.6306 126.443 83.3765C132.389 82.995 138.427 82.8046 144.551 82.8046C150.727 82.8046 156.779 83.0143 162.707 83.3765C157.079 76.6293 151.015 70.2596 144.551 64.3097Z"
          fill="#fc4efd"
        />
      </g>
      <mask
        id="mask1_0_3"
        style={{ maskType: "luminance" }}
        maskUnits="userSpaceOnUse"
        x="102"
        y="84"
        width="161"
        height="162"
      >
        <path
          d="M235.282 84.827L102.261 112.259L129.693 245.28L262.714 217.848L235.282 84.827Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask1_0_3)">
        <path
          d="M136.863 129.916L213.258 141.224C220.669 142.322 222.495 152.179 215.967 155.856L187.592 171.843L184.135 204.227C183.339 211.678 173.564 213.901 169.624 207.526L129.021 141.831C125.503 136.14 130.245 128.936 136.863 129.916Z"
          fill="#fc4efd"
          stroke="#fc4efd"
          strokeWidth="0.817337"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_0_3">
        <rect width="294" height="294" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

interface ProviderBadgeProps {
  provider: string;
  isActive: boolean;
  onClick?: () => void;
}

const ProviderBadge = ({ provider, isActive, onClick }: ProviderBadgeProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1 text-sm rounded-md border transition-colors
        ${
          isActive
            ? "bg-white/10 text-white border-white/20 hover:bg-white/15"
            : "bg-transparent text-white/40 border-white/10 hover:bg-white/5 hover:text-white/60"
        }
      `}
    >
      {provider}
    </button>
  );
};

interface LogEntry {
  type: string;
  message: string;
  time: Date;
}

const LOG_TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  info: { icon: "◆", color: "text-white/60" },
  connect: { icon: "●", color: "text-green-400" },
  disconnect: { icon: "○", color: "text-red-400" },
  handlers: { icon: "↔", color: "text-blue-400" },
  status: { icon: "◉", color: "text-[#fc4efd]" },
  done: { icon: "✓", color: "text-green-400" },
  error: { icon: "✕", color: "text-red-400" },
};

const MAX_LOG_ENTRIES = 50;

export const App = ({
  loadedProviders,
  failedProviders,
  availableProviders,
}: AppProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [relayConnected, setRelayConnected] = useState(false);
  const [relayHandlers, setRelayHandlers] = useState<string[]>([]);
  const didInit = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: string, message: string) => {
    setLogs((previousLogs) => {
      const newLogs = [
        ...previousLogs,
        { type, message, time: new Date() },
      ];
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
      addLog("error", "React Grab not initialized");
      return;
    }

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
  }, [loadedProviders, failedProviders, addLog]);

  useEffect(() => {
    let relayCleanup: (() => void) | false = false;

    const checkForRelay = () => {
      const relayClient = window.__REACT_GRAB_RELAY__;
      if (!relayClient) return false;

      const isConnected = relayClient.isConnected();
      setRelayConnected(isConnected);
      setRelayHandlers(relayClient.getAvailableHandlers());

      if (isConnected) {
        addLog("connect", "Relay connected");
      }

      const unsubscribeConnection = relayClient.onConnectionChange((connected) => {
        setRelayConnected(connected);
        addLog(connected ? "connect" : "disconnect", connected ? "Relay connected" : "Relay disconnected");
      });

      const unsubscribeHandlers = relayClient.onHandlersChange((handlers) => {
        setRelayHandlers(handlers);
        if (handlers.length > 0) {
          addLog("handlers", `Available: ${handlers.join(", ")}`);
        }
      });

      const unsubscribeMessage = relayClient.onMessage((message) => {
        if (message.type === "agent-status" && message.content && message.agentId) {
          const truncatedContent = message.content.length > 60
            ? `${message.content.slice(0, 60)}…`
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
    }, 100);

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
    window.location.href = newUrl.toString();
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
    window.location.href = newUrl.toString();
  };

  const inactiveProviders = availableProviders.filter(
    (provider) =>
      !loadedProviders.includes(provider) &&
      !failedProviders.includes(provider),
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 sm:px-8">
      <div className="max-w-lg mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <ReactGrabLogo size={32} />
            <h1 className="text-xl font-semibold tracking-tight">
              Agent Playground
            </h1>
            <div className="flex items-center gap-1.5 ml-auto">
              <span
                className={`w-2 h-2 rounded-full ${
                  relayConnected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-xs text-white/50">
                {relayConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <p className="text-white/50 text-sm">
            Select any element and choose an agent from the context menu
          </p>
          <button
            onClick={() => window.__REACT_GRAB__?.activate()}
            className="
              self-start px-4 py-2 text-sm font-medium
              bg-white text-black rounded-md
              hover:bg-white/90 transition-colors
            "
          >
            Grab Element
          </button>
        </header>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 uppercase tracking-wider">
              Providers
            </span>
            {relayHandlers.length > 0 && (
              <span className="text-xs text-white/20">
                ({relayHandlers.length} handler{relayHandlers.length !== 1 ? "s" : ""} ready)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {loadedProviders.length === 0 &&
            failedProviders.length === 0 &&
            inactiveProviders.length === 0 ? (
              <span className="text-white/30 text-sm">None available</span>
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
                  <button
                    key={provider}
                    onClick={() => handleRemoveProvider(provider)}
                    className="px-2.5 py-1 text-sm rounded-md border transition-colors bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/30 hover:bg-[#ff6b6b]/20"
                    title={`Failed to load: ${provider}`}
                  >
                    {provider} ✕
                  </button>
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
        </section>

        <section className="flex flex-col gap-3">
          <div className="text-xs text-white/30 uppercase tracking-wider">
            Test Elements
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm bg-[#330039] text-[#fc4efd] rounded-md border border-[#fc4efd]/30 hover:bg-[#4a0052] transition-colors">
              Submit
            </button>
            <button className="px-3 py-1.5 text-sm bg-white/5 text-white/70 rounded-md border border-white/10 hover:bg-white/10 transition-colors">
              Cancel
            </button>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm font-medium text-white">User Card</div>
            <div className="text-white/40 text-xs mt-1">john@example.com</div>
          </div>
          <input
            type="text"
            placeholder="Search…"
            className="
              px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md
              placeholder:text-white/30
              focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10
              transition-colors
            "
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30 uppercase tracking-wider">
              Activity
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="bg-white/5 rounded-lg border border-white/10 p-1 min-h-[180px] max-h-[300px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-3 py-2 text-white/30 text-sm">Waiting…</div>
            ) : (
              <div className="flex flex-col">
                {logs.map((log, logIndex) => {
                  const style = LOG_TYPE_STYLES[log.type] ?? LOG_TYPE_STYLES.info;
                  return (
                    <div
                      key={logIndex}
                      className="flex items-start gap-3 px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <span className={`${style.color} text-xs w-3 mt-0.5 shrink-0`}>
                        {style.icon}
                      </span>
                      <span
                        className="text-white/70 text-sm flex-1 break-all"
                        style={{ fontFamily: "var(--font-geist-mono)" }}
                      >
                        {log.message}
                      </span>
                      <span className="text-white/20 text-xs tabular-nums shrink-0">
                        {log.time.toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
