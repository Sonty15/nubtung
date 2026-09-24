/**
 * Utilities for formatting and handling dates in Thailand / Bangkok timezone (UTC+7).
 * Ensures consistency across server and client, regardless of server's native system timezone.
 */

const TIMEZONE = 'Asia/Bangkok';

/**
 * Returns the current date formatted as YYYY-MM-DD in Asia/Bangkok (UTC+7).
 */
export function getBangkokDateString(date: Date = new Date()): string {
  // 'en-CA' outputs ISO-like format: YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns the time formatted as HH:mm:ss in Asia/Bangkok (UTC+7, 24-hour).
 */
export function getBangkokTimeString(date: Date = new Date()): string {
  // 'en-GB' outputs 24-hour format: HH:mm:ss
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns the time formatted as HH:mm in Asia/Bangkok (UTC+7, 24-hour).
 */
export function getBangkokTimeShortString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Returns both date (YYYY-MM-DD) and time (HH:mm:ss) in Asia/Bangkok (UTC+7).
 */
export function getBangkokDateTime(date: Date = new Date()): { date: string; time: string } {
  return {
    date: getBangkokDateString(date),
    time: getBangkokTimeString(date),
  };
}

export function normalizeDateString(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    let year = parseInt(y, 10);
    if (year > 2400) year -= 543;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean;
}

export function normalizeTimeString(timeStr?: string): string {
  if (!timeStr) return '00:00:00';
  const clean = timeStr.trim();
  if (!clean) return '00:00:00';

  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const numOnly = clean.replace(/[^\d:]/g, '');
  const parts = numOnly.split(':');

  let h = parseInt(parts[0] || '0', 10);
  let m = parseInt(parts[1] || '0', 10);
  let s = parseInt(parts[2] || '0', 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

