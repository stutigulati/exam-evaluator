import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function pctColor(pct) {
  if (pct >= 75) return 'text-green-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function pctBg(pct) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function gradeColor(g) {
  const map = {
    'A+': 'text-emerald-400', 'A': 'text-green-400',
    'B': 'text-blue-400', 'C': 'text-amber-400',
    'D': 'text-orange-400', 'F': 'text-red-400',
  };
  return map[g] || 'text-text-secondary';
}

export function leniencyLabel(v) {
  if (v <= 2) return 'Strictest';
  if (v <= 4) return 'Strict';
  if (v <= 6) return 'Balanced';
  if (v <= 8) return 'Lenient';
  return 'Most Lenient';
}
