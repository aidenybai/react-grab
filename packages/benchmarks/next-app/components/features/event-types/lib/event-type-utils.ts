export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function parseDuration(formatted: string): number {
  const hourMatch = formatted.match(/(\d+)h/);
  const minMatch = formatted.match(/(\d+)\s*m/);
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  return hours * 60 + mins;
}

export function getBookingUrl(
  baseUrl: string,
  username: string,
  slug: string,
): string {
  return `${baseUrl}/${username}/${slug}`;
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}
