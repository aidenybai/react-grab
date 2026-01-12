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
