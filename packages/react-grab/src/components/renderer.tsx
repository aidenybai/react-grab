import { Show, For, Index, createMemo } from "solid-js";
import type { Component } from "solid-js";
import type { ReactGrabRendererProps } from "../types.js";
import { buildOpenFileUrl } from "../utils/build-open-file-url.js";
import { SelectionBox } from "./selection-box.js";
import { Crosshair } from "./crosshair.js";
import { SelectionCursor } from "./selection-cursor.js";
import { SelectionLabel } from "./selection-label.js";
import { Dock } from "./dock.js";

// Declare globals which are injected by Vite's define config
declare const __PROJECT_ROOT__: string | undefined;
declare const __PREFERRED_EDITOR__: string | undefined;

// Editor URL schemes for common editors
const EDITOR_URL_SCHEMES: Record<string, string> = {
  vscode: "vscode://file{file}:{line}:{column}",
  cursor: "cursor://file{file}:{line}:{column}",
  windsurf: "windsurf://file{file}:{line}:{column}",
  trae: "trae://file{file}:{line}:{column}",
  webstorm: "webstorm://open?file={file}&line={line}&column={column}",
  rider: "rider://open?file={file}&line={line}&column={column}",
  zed: "zed://file{file}:{line}:{column}",
};

function getPreferredEditor(): string {
  // Read from Vite's define config (set via REACT_GRAB_EDITOR env var)
  if (typeof __PREFERRED_EDITOR__ !== "undefined" && __PREFERRED_EDITOR__ in EDITOR_URL_SCHEMES) {
    return __PREFERRED_EDITOR__;
  }
  return "vscode"; // Default
}

function buildEditorUrl(editor: string, filePath: string, line: number, column: number): string {
  const scheme = EDITOR_URL_SCHEMES[editor] || EDITOR_URL_SCHEMES.vscode;
  return scheme
    .replace("{file}", filePath)
    .replace("{line}", String(line))
    .replace("{column}", String(column));
}

export const ReactGrabRenderer: Component<ReactGrabRendererProps> = (props) => {
  const agentSessionsList = createMemo(() =>
    props.agentSessions ? Array.from(props.agentSessions.values()) : [],
  );

  const selectionBoundsList = createMemo(() => {
    if (
      props.selectionBoundsMultiple &&
      props.selectionBoundsMultiple.length > 0
    ) {
      return props.selectionBoundsMultiple;
    }
    return props.selectionBounds ? [props.selectionBounds] : [];
  });

  return (
    <>
      <Show when={props.selectionVisible}>
        <For each={selectionBoundsList()}>
          {(bounds) => (
            <SelectionBox
              variant="selection"
              bounds={bounds}
              visible={props.selectionVisible}
              isFading={props.selectionLabelStatus === "fading"}
            />
          )}
        </For>
      </Show>

      <Show
        when={
          props.crosshairVisible === true &&
          props.mouseX !== undefined &&
          props.mouseY !== undefined
        }
      >
        <Crosshair
          mouseX={props.mouseX!}
          mouseY={props.mouseY!}
          visible={true}
        />
      </Show>

      <Show when={props.dragVisible && props.dragBounds}>
        <SelectionBox
          variant="drag"
          bounds={props.dragBounds!}
          visible={props.dragVisible}
        />
      </Show>

      <For each={props.grabbedBoxes ?? []}>
        {(box) => (
          <SelectionBox
            variant="grabbed"
            bounds={box.bounds}
            createdAt={box.createdAt}
          />
        )}
      </For>

      <Index each={agentSessionsList()}>
        {(session) => (
          <>
            <For each={session().selectionBounds}>
              {(bounds) => (
                <SelectionBox
                  variant="processing"
                  bounds={bounds}
                  visible={true}
                  isCompleted={!session().isStreaming}
                />
              )}
            </For>
            <Show when={session().selectionBounds.length > 0}>
              <SelectionLabel
                tagName={session().tagName}
                componentName={session().componentName}
                selectionBounds={session().selectionBounds[0]}
                mouseX={session().position.x}
                visible={true}
                hasAgent={true}
                isAgentConnected={true}
                status={session().isStreaming ? "copying" : "copied"}
                statusText={session().lastStatus || "Thinking…"}
                inputValue={session().context.prompt}
                previousPrompt={session().context.prompt}
                supportsUndo={props.supportsUndo}
                supportsFollowUp={props.supportsFollowUp}
                dismissButtonText={props.dismissButtonText}
                onAbort={() => props.onAbortSession?.(session().id)}
                onDismiss={
                  session().isStreaming
                    ? undefined
                    : () => props.onDismissSession?.(session().id)
                }
                onUndo={
                  session().isStreaming
                    ? undefined
                    : () => props.onUndoSession?.(session().id)
                }
                onFollowUpSubmit={
                  session().isStreaming
                    ? undefined
                    : (prompt) =>
                        props.onFollowUpSubmitSession?.(session().id, prompt)
                }
                error={session().error}
                onAcknowledgeError={() =>
                  props.onAcknowledgeSessionError?.(session().id)
                }
                onRetry={() => props.onRetrySession?.(session().id)}
                isPendingAbort={
                  session().isStreaming ? props.isPendingAgentAbort : false
                }
                onConfirmAbort={props.onConfirmAgentAbort}
                onCancelAbort={props.onCancelAgentAbort}
              />
            </Show>
          </>
        )}
      </Index>

      <Show when={props.selectionLabelVisible && props.selectionBounds}>
        <SelectionLabel
          tagName={props.selectionTagName}
          componentName={props.selectionComponentName}
          elementsCount={props.selectionElementsCount}
          selectionBounds={props.selectionBounds}
          mouseX={props.mouseX}
          visible={props.selectionLabelVisible}
          isInputMode={props.isInputMode}
          inputValue={props.inputValue}
          replyToPrompt={props.replyToPrompt}
          hasAgent={props.hasAgent}
          isAgentConnected={props.isAgentConnected}
          status={props.selectionLabelStatus}
          filePath={props.selectionFilePath}
          lineNumber={props.selectionLineNumber}
          onInputChange={props.onInputChange}
          onSubmit={props.onInputSubmit}
          onCancel={props.onInputCancel}
          onToggleExpand={props.onToggleExpand}
          isPendingDismiss={props.isPendingDismiss}
          onConfirmDismiss={props.onConfirmDismiss}
          onCancelDismiss={props.onCancelDismiss}
          onOpen={() => {
            if (props.selectionFilePath) {
              // Clean up the file path - remove localhost URL prefix if present
              let cleanPath = props.selectionFilePath;
              try {
                if (cleanPath.includes("localhost")) {
                  const url = new URL(cleanPath, window.location.origin);
                  cleanPath = url.pathname;
                }
              } catch {
                const match = cleanPath.match(/localhost:\d+(.+)/);
                if (match) {
                  cleanPath = match[1];
                }
              }

              const projectRoot = typeof __PROJECT_ROOT__ !== "undefined" ? __PROJECT_ROOT__ : "";

              if (projectRoot) {
                // Ensure proper path joining
                const normalizedRoot = projectRoot.endsWith("/") ? projectRoot : projectRoot + "/";
                const normalizedPath = cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath;
                const absolutePath = normalizedRoot + normalizedPath;
                const line = props.selectionLineNumber || 1;
                const editor = getPreferredEditor();
                const editorUrl = buildEditorUrl(editor, absolutePath, line, 1);

                const link = document.createElement("a");
                link.href = editorUrl;
                link.click();
              } else {
                // Fallback to react-grab.com/open-file
                const openFileUrl = buildOpenFileUrl(
                  props.selectionFilePath,
                  props.selectionLineNumber,
                );
                window.open(openFileUrl, "_blank");
              }
            }
          }}
        />
      </Show>

      <For each={props.labelInstances ?? []}>
        {(instance) => (
          <SelectionLabel
            tagName={instance.tagName}
            componentName={instance.componentName}
            selectionBounds={instance.bounds}
            mouseX={instance.mouseX}
            visible={true}
            status={instance.status}
          />
        )}
      </For>

      <Show
        when={
          props.nativeSelectionCursorVisible &&
          props.nativeSelectionCursorX !== undefined &&
          props.nativeSelectionCursorY !== undefined
        }
      >
        <SelectionCursor
          x={props.nativeSelectionCursorX!}
          y={props.nativeSelectionCursorY!}
          tagName={props.nativeSelectionTagName}
          componentName={props.nativeSelectionComponentName}
          elementBounds={props.nativeSelectionBounds}
          visible={props.nativeSelectionCursorVisible}
          onClick={props.onNativeSelectionCopy}
          onEnter={props.onNativeSelectionEnter}
        />
      </Show>

      <Show when={props.dockVisible !== false}>
        <Dock isActive={props.isActive} onToggle={props.onToggleActive} />
      </Show>
    </>
  );
};
