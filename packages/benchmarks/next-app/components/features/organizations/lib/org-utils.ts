export function generateOrgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getOrgInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function formatMemberCount(count: number): string {
  if (count === 1) return "1 member";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k members`;
  return `${count} members`;
}

export function formatTeamCount(count: number): string {
  if (count === 1) return "1 team";
  return `${count} teams`;
}

export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain);
}

export function canUpgradePlan(
  currentPlan: string,
  targetPlan: string,
): boolean {
  const planOrder = ["free", "starter", "pro", "enterprise"];
  return planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan);
}
