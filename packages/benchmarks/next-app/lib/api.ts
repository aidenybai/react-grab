const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.example.com/v1";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, signal } = options;
  const token = getAuthToken();

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorBody,
    );
  }

  const data = await response.json();
  return { data, status: response.status, headers: response.headers };
}

export const api = {
  get: <T>(endpoint: string, signal?: AbortSignal) =>
    apiRequest<T>(endpoint, { method: "GET", signal }),

  post: <T>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body }),

  put: <T>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: "PUT", body }),

  patch: <T>(endpoint: string, body: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: "DELETE" }),
};

export { ApiError };
export default api;
