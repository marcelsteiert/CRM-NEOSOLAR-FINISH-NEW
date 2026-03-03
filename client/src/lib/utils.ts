import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format CHF currency values
export function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format percentage values
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Format date in Swiss German format
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Format time in HH:MM format
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
