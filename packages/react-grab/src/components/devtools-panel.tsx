import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import type { EventLog } from "../core/event-log.js";
import type { ReactGrabAPI, ReactGrabLoggedEvent, ReactGrabSession } from "../types.js";

interface DevtoolsPanelProps {
  eventLog: EventLog;
  api: ReactGrabAPI;
}

const MAX_VISIBLE_EVENTS = 200;

const panelContainerStyle = `
  position: fixed;
  bottom: 12px;
  right: 12px;
  width: 360px;
  max-height: 70vh;
  z-index: 2147483646;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: #e6e6e6;
  background: rgba(20, 20, 24, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const headerStyle = `
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  user-select: none;
  cursor: pointer;
`;

const titleStyle = `
  font-weight: 600;
  letter-spacing: 0.02em;
  flex: 1;
`;

const badgeStyle = `
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
`;

const recordingDotStyle = (isRecording: boolean): string => `
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${isRecording ? "#ff4d4d" : "#888"};
  box-shadow: ${isRecording ? "0 0 6px rgba(255, 77, 77, 0.6)" : "none"};
`;

const toolbarStyle = `
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const buttonStyle = `
  appearance: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: inherit;
  padding: 3px 7px;
  border-radius: 4px;
  font: inherit;
  cursor: pointer;
`;

const eventListStyle = `
  overflow: auto;
  flex: 1;
  min-height: 80px;
`;

const eventRowStyle = `
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: baseline;
  gap: 6px;
  padding: 3px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
`;

const timestampStyle = `
  color: #888;
  font-variant-numeric: tabular-nums;
`;

const nameStyle = `
  color: #b9e3ff;
`;

const countStyle = `
  color: #888;
  font-variant-numeric: tabular-nums;
`;

const formatRelativeMs = (eventTimestamp: number, anchorTimestamp: number | null): string => {
  if (anchorTimestamp === null) return "0ms";
  const delta = eventTimestamp - anchorTimestamp;
  if (delta < 1000) return `${delta}ms`;
  return `${(delta / 1000).toFixed(2)}s`;
};

const summarizeArgs = (args: readonly unknown[]): string => {
  if (args.length === 0) return "";
  try {
    const truncated = args.map((arg) => {
      if (arg === null || arg === undefined) return String(arg);
      if (typeof arg === "object") {
        if ("__rgHandle" in (arg as Record<string, unknown>)) {
          return `<${(arg as { __rgHandle: string }).__rgHandle}>`;
        }
        return JSON.stringify(arg).slice(0, 60);
      }
      return JSON.stringify(arg);
    });
    return truncated.join(", ");
  } catch {
    return "";
  }
};

const DevtoolsPanel = (props: DevtoolsPanelProps): import("solid-js").JSX.Element => {
  const [events, setEvents] = createSignal<ReactGrabLoggedEvent[]>(props.eventLog.getEvents());
  const [isCollapsed, setIsCollapsed] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(props.eventLog.isRecording());

  onMount(() => {
    const unsubscribe = props.eventLog.subscribe(() => {
      setEvents(props.eventLog.getEvents());
    });
    onCleanup(unsubscribe);
  });

  const firstTimestamp = createMemo(() => {
    const allEvents = events();
    return allEvents.length > 0 ? allEvents[0].t : null;
  });

  const visibleEvents = createMemo(() => events().slice(-MAX_VISIBLE_EVENTS).reverse());

  const handleCopySession = async () => {
    const session = props.api.getSession();
    try {
      await navigator.clipboard.writeText(JSON.stringify(session, null, 2));
    } catch {}
  };

  const handleDownloadSession = () => {
    const session = props.api.getSession();
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `react-grab-session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleReplayFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const session = JSON.parse(text) as ReactGrabSession;
      await props.api.replaySession(session);
    } catch (error) {
      console.warn("[react-grab devtools] replay failed:", error);
    }
  };

  const handleToggleRecording = () => {
    const next = !isRecording();
    props.api.setEventLogRecording(next);
    setIsRecording(next);
  };

  const handleClear = () => {
    props.api.clearEventLog();
    setEvents([]);
  };

  return (
    <div style={panelContainerStyle}>
      <div style={headerStyle} onClick={() => setIsCollapsed((value) => !value)}>
        <span style={recordingDotStyle(isRecording())} />
        <span style={titleStyle}>react-grab event log</span>
        <span style={badgeStyle}>{events().length}</span>
        <span style={`${badgeStyle} margin-left: 4px;`}>{isCollapsed() ? "▾" : "▴"}</span>
      </div>
      <Show when={!isCollapsed()}>
        <div style={toolbarStyle}>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRecording();
            }}
          >
            {isRecording() ? "pause" : "record"}
          </button>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleCopySession();
            }}
          >
            copy
          </button>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadSession();
            }}
          >
            download
          </button>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleReplayFromClipboard();
            }}
          >
            replay
          </button>
          <button
            style={buttonStyle}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            clear
          </button>
        </div>
        <div style={eventListStyle}>
          <For each={visibleEvents()}>
            {(loggedEvent) => (
              <div style={eventRowStyle}>
                <span style={timestampStyle}>
                  {formatRelativeMs(loggedEvent.t, firstTimestamp())}
                </span>
                <span>
                  <span style={nameStyle}>{loggedEvent.name}</span>
                  <Show when={loggedEvent.args.length > 0}>
                    <span style="color: #888;"> ({summarizeArgs(loggedEvent.args)})</span>
                  </Show>
                </span>
                <Show when={loggedEvent.coalescedCount && loggedEvent.coalescedCount > 1}>
                  <span style={countStyle}>×{loggedEvent.coalescedCount}</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

const mountDevtoolsPanel = (eventLog: EventLog, api: ReactGrabAPI): (() => void) => {
  if (typeof document === "undefined") return () => {};

  const host = document.createElement("div");
  host.setAttribute("data-react-grab-devtools", "");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483646";

  const shadow = host.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  styleElement.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    button { pointer-events: auto; }
    [data-rg-panel] { pointer-events: auto; }
  `;
  shadow.appendChild(styleElement);

  const container = document.createElement("div");
  container.setAttribute("data-rg-panel", "");
  shadow.appendChild(container);

  document.body.appendChild(host);

  const disposeRender = render(() => <DevtoolsPanel eventLog={eventLog} api={api} />, container);

  return () => {
    disposeRender();
    host.remove();
  };
};

export { mountDevtoolsPanel, DevtoolsPanel };
