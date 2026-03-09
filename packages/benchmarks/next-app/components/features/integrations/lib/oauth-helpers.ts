export function buildOAuthUrl(
  provider: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
): string {
  const baseUrls: Record<string, string> = {
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    github: "https://github.com/login/oauth/authorize",
    microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    zoom: "https://zoom.us/oauth/authorize",
  };

  const base = baseUrls[provider];
  if (!base) throw new Error(`Unknown provider: ${provider}`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state: generateState(),
  });

  return `${base}?${params.toString()}`;
}

export function generateState(): string {
  return Math.random().toString(36).slice(2, 15);
}

export function parseOAuthCallback(url: string): {
  code?: string;
  error?: string;
  state?: string;
} {
  const params = new URLSearchParams(new URL(url).search);
  return {
    code: params.get("code") ?? undefined,
    error: params.get("error") ?? undefined,
    state: params.get("state") ?? undefined,
  };
}
