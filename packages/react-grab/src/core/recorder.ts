import { getElementContext } from "./context.js";
import { getTagName } from "../utils/get-tag-name.js";
import { isEventFromOverlay } from "../utils/is-event-from-overlay.js";
import { copyContent } from "../utils/copy-content.js";
import { RECORDER_MAX_INPUT_VALUE_LENGTH } from "../constants.js";

interface RecordedAction {
  actionType: string;
  element: Element;
  timestamp: number;
  inputValue?: string;
  key?: string;
}

interface FormattedAction {
  actionType: string;
  detail: string;
  snippet: string;
}

const resolveActionType = (event: Event): string | null => {
  if (event.type === "click") return "click";
  if (event.type === "dblclick") return "double-click";
  if (event.type === "change") return "change";
  if (event.type === "submit") return "submit";
  if (event.type === "keydown") {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Enter") return "press-enter";
    if (keyboardEvent.key === "Escape") return "press-escape";
    if (keyboardEvent.key === "Tab") return "press-tab";
    return null;
  }
  return null;
};

const getInputValue = (element: Element): string | undefined => {
  if (element instanceof HTMLInputElement) return element.value;
  if (element instanceof HTMLTextAreaElement) return element.value;
  if (element instanceof HTMLSelectElement) return element.value;
  return undefined;
};

const truncateInputValue = (value: string): string => {
  if (value.length <= RECORDER_MAX_INPUT_VALUE_LENGTH) return value;
  return `${value.slice(0, RECORDER_MAX_INPUT_VALUE_LENGTH)}…`;
};

const formatActionDetail = (action: RecordedAction): string => {
  const { actionType, inputValue, key } = action;
  if (key) return `${actionType} (${key})`;
  if (inputValue !== undefined && inputValue.length > 0) {
    return `${actionType} → "${truncateInputValue(inputValue)}"`;
  }
  return actionType;
};

const formatRecordingOutput = (formattedActions: FormattedAction[], pageUrl: string): string => {
  const header = `Page: ${pageUrl}`;
  const actionSnippets = formattedActions.map((action, index) => {
    const numberedPrefix = `[${index + 1}] ${action.detail}`;
    return `${numberedPrefix}\n${action.snippet}`;
  });
  return `${header}\n\n${actionSnippets.join("\n\n")}`;
};

const isDuplicateAction = (
  existingActions: RecordedAction[],
  newAction: RecordedAction,
): boolean => {
  if (existingActions.length === 0) return false;
  const lastAction = existingActions[existingActions.length - 1];
  if (lastAction.element !== newAction.element) return false;
  if (lastAction.actionType !== newAction.actionType) return false;
  if (newAction.timestamp - lastAction.timestamp < 100) return true;
  return false;
};

interface Recorder {
  isRecording: () => boolean;
  actions: () => RecordedAction[];
  start: () => void;
  stop: () => Promise<boolean>;
  actionCount: () => number;
}

const createRecorder = (
  onRecordingChange: (isRecording: boolean) => void,
  onActionRecorded: (count: number) => void,
): Recorder => {
  let recording = false;
  let recordedActions: RecordedAction[] = [];
  let abortController: AbortController | null = null;

  const handleEvent = (event: Event) => {
    if (isEventFromOverlay(event, "data-react-grab-ignore-events")) return;

    const actionType = resolveActionType(event);
    if (!actionType) return;

    const targetElement = event.target;
    if (!(targetElement instanceof Element)) return;

    const newAction: RecordedAction = {
      actionType,
      element: targetElement,
      timestamp: Date.now(),
      inputValue: getInputValue(targetElement),
      key: event instanceof KeyboardEvent ? event.key : undefined,
    };

    if (isDuplicateAction(recordedActions, newAction)) return;

    recordedActions.push(newAction);
    onActionRecorded(recordedActions.length);
  };

  const start = () => {
    if (recording) return;
    recording = true;
    recordedActions = [];
    abortController = new AbortController();
    const { signal } = abortController;

    document.addEventListener("click", handleEvent, { capture: true, signal });
    document.addEventListener("dblclick", handleEvent, { capture: true, signal });
    document.addEventListener("change", handleEvent, { capture: true, signal });
    document.addEventListener("submit", handleEvent, { capture: true, signal });
    document.addEventListener("keydown", handleEvent, { capture: true, signal });

    onRecordingChange(true);
  };

  const stop = async (): Promise<boolean> => {
    if (!recording) return false;
    recording = false;

    abortController?.abort();
    abortController = null;

    onRecordingChange(false);

    if (recordedActions.length === 0) return false;

    const pageUrl = window.location.href;

    const snippetResults = await Promise.allSettled(
      recordedActions.map((action) => getElementContext(action.element)),
    );

    const formattedActions: FormattedAction[] = recordedActions.map((action, index) => {
      const snippetResult = snippetResults[index];
      const snippet =
        snippetResult.status === "fulfilled"
          ? snippetResult.value
          : `<${getTagName(action.element)} />`;

      return {
        actionType: action.actionType,
        detail: formatActionDetail(action),
        snippet,
      };
    });

    const output = formatRecordingOutput(formattedActions, pageUrl);
    const didCopy = copyContent(output);

    recordedActions = [];

    return didCopy;
  };

  return {
    isRecording: () => recording,
    actions: () => recordedActions,
    start,
    stop,
    actionCount: () => recordedActions.length,
  };
};

export { createRecorder };
export type { Recorder, RecordedAction };
