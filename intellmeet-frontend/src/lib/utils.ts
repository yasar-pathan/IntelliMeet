import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

/**
 * Merge Tailwind classes with clsx — the standard shadcn/ui helper.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string as relative time ("2 hours ago").
 */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

/**
 * Format a date for display — "Today", "Yesterday", or "Jan 15, 2026".
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

/**
 * Format a date as full datetime — "Jan 15, 2026 at 2:30 PM".
 */
export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
}

/**
 * Format duration in minutes to human-readable "1h 30m".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Get initials from a name (e.g., "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Generate a Cloudinary avatar transform URL.
 */
export function getAvatarUrl(url: string, size = 80): string {
  if (!url || !url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto,g_face/`);
}

/**
 * Priority color mapping for task badges.
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'bg-red-500/15 text-red-600 dark:text-red-400',
    high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    medium: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
    low: 'bg-green-500/15 text-green-600 dark:text-green-400',
  };
  return colors[priority] || colors.medium;
}

/**
 * Status color mapping for meeting/task status badges.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    live: 'bg-green-500/15 text-green-600 dark:text-green-400',
    active: 'bg-green-500/15 text-green-600 dark:text-green-400',
    ended: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
    cancelled: 'bg-red-500/15 text-red-600 dark:text-red-400',
    todo: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
    'in-progress': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    review: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    done: 'bg-green-500/15 text-green-600 dark:text-green-400',
  };
  return colors[status] || colors.scheduled;
}
