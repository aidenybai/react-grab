export function generateTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatMemberCount(count: number): string {
  if (count === 1) return "1 member";
  return `${count} members`;
}

export function sortMembers<T extends { role: string; name: string }>(
  members: T[],
): T[] {
  const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };
  return [...members].sort((a, b) => {
    const roleA = roleOrder[a.role] ?? 3;
    const roleB = roleOrder[b.role] ?? 3;
    if (roleA !== roleB) return roleA - roleB;
    return a.name.localeCompare(b.name);
  });
}
