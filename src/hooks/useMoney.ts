import { useMemo } from 'react';
import { useAppStore } from '../store';
import type { AppSettings } from '../types';

/**
 * Currency helpers. Internally all money is stored as USD cents.
 * Display converts to the user's configured display currency.
 */

export function currencySymbol(settings: AppSettings): string {
  return settings.displayCurrency === 'PHP' ? '₱' : '$';
}

/** USD cents -> amount in display currency units (e.g. 1234 -> 12.34 USD). */
export function centsToDisplayAmount(cents: number, settings: AppSettings): number {
  const usd = cents / 100;
  return settings.displayCurrency === 'PHP' ? usd * settings.phpPerUsd : usd;
}

export function formatMoneyCents(cents: number, settings: AppSettings): string {
  const symbol = currencySymbol(settings);
  const amount = centsToDisplayAmount(cents, settings);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const compact = abs.toLocaleString('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return `${sign}${symbol}${compact}`;
  }
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol}${formatted}`;
}

/** Parse a user-entered display-currency string into USD cents. NaN -> null. */
export function displayToCents(raw: string, settings: AppSettings): number | null {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;
  const usd = settings.displayCurrency === 'PHP' ? value / settings.phpPerUsd : value;
  return Math.round(usd * 100);
}

/** USD cents -> plain (ungrouped) display-currency string for form inputs. */
export function centsToInputString(cents: number, settings: AppSettings): string {
  const amount = centsToDisplayAmount(cents, settings);
  return String(Math.round(amount * 100) / 100);
}

export interface MoneyHelpers {
  settings: AppSettings;
  symbol: string;
  format: (cents: number) => string;
  toCents: (raw: string) => number | null;
  toInput: (cents: number) => string;
}

export function useMoney(): MoneyHelpers {
  const settings = useAppStore((s) => s.settings);
  return useMemo(
    () => ({
      settings,
      symbol: currencySymbol(settings),
      format: (cents: number) => formatMoneyCents(cents, settings),
      toCents: (raw: string) => displayToCents(raw, settings),
      toInput: (cents: number) => centsToInputString(cents, settings),
    }),
    [settings],
  );
}
