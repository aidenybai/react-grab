interface TraceUi {
  setRecording: (isRecording: boolean) => void;
  setStatus: (text: string) => void;
  flashCopied: () => void;
  onToggleRecording: (handler: () => void) => void;
  onGrabClip: (handler: () => void) => void;
  destroy: () => void;
}

const STYLES = `
:host { all: initial; }
.panel {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(18, 18, 20, 0.92);
  color: #f5f5f5;
  font: 12px/1.4 ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  z-index: 2147483647;
  user-select: none;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
  flex: none;
}
.dot.live {
  background: #ff3b30;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.status { opacity: 0.8; white-space: nowrap; }
button {
  all: unset;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 600;
}
button:hover { background: rgba(255, 255, 255, 0.2); }
button.grab { background: #2f6fff; }
button.grab:hover { background: #4b83ff; }
.panel.copied .grab { background: #28a745; }
.kbd { opacity: 0.5; font-size: 11px; }
`;

export const createTraceUi = (): TraceUi => {
  const host = document.createElement("div");
  host.setAttribute("data-react-grab-trace-ui", "");
  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  root.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "panel";

  const dot = document.createElement("span");
  dot.className = "dot";

  const status = document.createElement("span");
  status.className = "status";
  status.textContent = "trace mode";

  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Stop";

  const grabButton = document.createElement("button");
  grabButton.className = "grab";
  grabButton.textContent = "Grab clip";

  const kbd = document.createElement("span");
  kbd.className = "kbd";
  kbd.textContent = "⌘⇧C";

  panel.append(dot, status, grabButton, kbd, toggleButton);
  root.appendChild(panel);
  document.body.appendChild(host);

  let copiedTimer = 0;

  return {
    setRecording: (isRecording) => {
      dot.classList.toggle("live", isRecording);
      toggleButton.textContent = isRecording ? "Stop" : "Record";
      grabButton.style.display = isRecording ? "" : "none";
    },
    setStatus: (text) => {
      status.textContent = text;
    },
    flashCopied: () => {
      panel.classList.add("copied");
      window.clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => panel.classList.remove("copied"), 1200);
    },
    onToggleRecording: (handler) => {
      toggleButton.addEventListener("click", handler);
    },
    onGrabClip: (handler) => {
      grabButton.addEventListener("click", handler);
    },
    destroy: () => {
      window.clearTimeout(copiedTimer);
      host.remove();
    },
  };
};
