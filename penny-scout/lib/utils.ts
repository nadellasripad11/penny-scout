/**
 * Utility functions for common operations
 *
 * Includes: formatting, calculations, data transforms, validations
 */

/**
 * Format number as currency (USD)
 */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M/B notation
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Calculate percentage change
 */
export function percentChange(initial: number, final: number): number {
  if (initial === 0) return 0;
  return ((final - initial) / Math.abs(initial)) * 100;
}

/**
 * Validate ticker symbol (must be 1-5 uppercase letters)
 */
export function isValidTicker(ticker: string): boolean {
  return /^[A-Z]{1,5}$/.test(ticker);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

/**
 * Sort array of numbers and return median
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average (mean) of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(average(squaredDiffs));
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Delay execution (for testing/retries)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      await delay(delayMs);
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Group array elements by key
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string | number
): Record<string | number, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string | number, T[]>
  );
}

/**
 * Get ISO date string (YYYY-MM-DD)
 */
export function toISODate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if market is open (US equity hours)
 * 9:30am - 4:00pm ET, Mon-Fri
 */
export function isMarketOpen(now: Date = new Date()): boolean {
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const et = new Date(utc - 5 * 60 * 60000); // EST
  const hour = et.getHours();
  const min = et.getMinutes();
  const day = et.getDay();

  // Mon-Fri (1-5)
  if (day === 0 || day === 6) return false;

  // 9:30am - 4:00pm
  const timeInMinutes = hour * 60 + min;
  return timeInMinutes >= 570 && timeInMinutes < 960; // 9:30 = 570, 4:00 = 960
}
