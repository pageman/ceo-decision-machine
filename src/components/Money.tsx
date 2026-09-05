import { useAppStore } from '../store';
import type { AppSettings } from '../types';

/** Formats cents as USD or PHP per user settings, compact above 1M. */
export function formatCents(cents: number, settings: AppSettings): string {
  const { displayCurrency, phpPerUsd } = settings;
  const value = displayCurrency === 'PHP' ? (cents / 100) * phpPerUsd : cents / 100;
  const symbol = displayCurrency === 'PHP' ? '₱' : '$';
  const abs = Math.abs(value);
  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(1) + 'M';
  } else if (abs >= 10_000) {
    formatted = Math.round(value).toLocaleString('en-US');
  } else {
    formatted = value.toLocaleString('en-US', {
      maximumFractionDigits: abs >= 100 ? 0 : 2,
    });
  }
  return `${symbol}${formatted}`;
}

/** Converts a display-currency amount back to cents (inverse of formatCents). */
export function toCents(amount: number, settings: AppSettings): number {
  const usd = settings.displayCurrency === 'PHP' ? amount / settings.phpPerUsd : amount;
  return Math.round(usd * 100);
}

/** Converts cents to a plain number in the display currency (for form inputs). */
export function fromCents(cents: number, settings: AppSettings): number {
  const value = settings.displayCurrency === 'PHP' ? (cents / 100) * settings.phpPerUsd : cents / 100;
  return Number(value.toFixed(2));
}

export function Money({
  cents,
  className,
}: {
  cents: number;
  className?: string;
}) {
  const settings = useAppStore((s) => s.settings);
  return <span className={className ? `mono ${className}` : 'mono'}>{formatCents(cents, settings)}</span>;
}

export function useFormatCents(): (cents: number) => string {
  const settings = useAppStore((s) => s.settings);
  return (cents) => formatCents(cents, settings);
}
