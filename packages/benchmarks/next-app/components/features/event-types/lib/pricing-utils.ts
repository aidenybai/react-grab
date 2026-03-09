export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * taxRate);
}

export function calculateTotal(amount: number, taxRate: number): number {
  return amount + calculateTax(amount, taxRate);
}

export function isValidPrice(amount: number): boolean {
  return amount >= 0 && Number.isFinite(amount);
}

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "INR",
  "BRL",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
