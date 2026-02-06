import type { ToolbarState } from "react-grab";
import { Sinking, type DatabaseSchema } from "sinking/core";

interface ToolbarStateRecord extends ToolbarState {
  id: string;
}

const TOOLBAR_STATE_STORE = "toolbar-state";
const TOOLBAR_STATE_KEY = "default";

const schema: DatabaseSchema = {
  name: "react-grab",
  version: 1,
  stores: {
    [TOOLBAR_STATE_STORE]: { keyPath: "id" },
  },
};

let sinkingClient: Sinking | null = null;

const toToolbarState = (record: ToolbarStateRecord): ToolbarState => ({
  edge: record.edge,
  ratio: record.ratio,
  collapsed: record.collapsed,
  enabled: record.enabled,
});

const getToolbarStateQuery = () =>
  sinkingClient!.get<ToolbarStateRecord>(
    TOOLBAR_STATE_STORE,
    TOOLBAR_STATE_KEY,
  );

export const initSinkingClient = (workerUrl: string | URL): Sinking => {
  if (sinkingClient) return sinkingClient;
  sinkingClient = new Sinking({ workerUrl, schema });
  return sinkingClient;
};

export const loadToolbarStateFromSinking =
  async (): Promise<ToolbarState | null> => {
    if (!sinkingClient) return null;
    const record = await getToolbarStateQuery();
    if (!record) return null;
    return toToolbarState(record);
  };

export const saveToolbarStateToSinking = async (
  state: ToolbarState,
): Promise<void> => {
  if (!sinkingClient) return;
  const record: ToolbarStateRecord = { ...state, id: TOOLBAR_STATE_KEY };
  await sinkingClient.put(TOOLBAR_STATE_STORE, TOOLBAR_STATE_KEY, record);
};

export const subscribeToToolbarState = (listener: () => void): (() => void) => {
  if (!sinkingClient) return () => {};
  return sinkingClient.subscribe(getToolbarStateQuery().description, listener);
};

export const getCachedToolbarState = (): ToolbarState | null => {
  if (!sinkingClient) return null;
  const record = sinkingClient.getCached<ToolbarStateRecord>(
    getToolbarStateQuery().description,
  );
  if (!record) return null;
  return toToolbarState(record);
};
