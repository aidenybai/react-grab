export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount / 100,
  );
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

export function calculateProratedAmount(
  currentPlanPrice: number,
  newPlanPrice: number,
  daysRemaining: number,
  totalDays: number,
): number {
  const dailyDifference = (newPlanPrice - currentPlanPrice) / totalDays;
  return Math.max(0, Math.round(dailyDifference * daysRemaining));
}

export function isCardExpired(month: number, year: number): boolean {
  const now = new Date();
  const expiryDate = new Date(year, month, 0);
  return expiryDate < now;
}

export function maskCardNumber(last4: string, brand?: string): string {
  const prefix = brand ?? "Card";
  return `${prefix} ending in ${last4}`;
}
