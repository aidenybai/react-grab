export interface ViewportSize {
  width: number;
  height: number;
}

export interface GetPageRequest {
  name: string;
  viewport?: ViewportSize;
}

export interface GetPageResponse {
  wsEndpoint: string;
  name: string;
  targetId: string;
  url?: string;
}

export interface ListPagesResponse {
  pages: Array<{ name: string; targetId: string; url: string }>;
}

export interface ServerInfoResponse {
  wsEndpoint: string;
  port: number;
  cdpPort: number;
  mode?: "launch" | "extension";
  extensionConnected?: boolean;
}

export interface WaitForPageLoadOptions {
  timeout?: number;
  pollInterval?: number;
  minimumWait?: number;
  waitForNetworkIdle?: boolean;
}

export interface WaitForPageLoadResult {
  success: boolean;
  readyState: string;
  pendingRequests: number;
  waitTimeMs: number;
  timedOut: boolean;
}
