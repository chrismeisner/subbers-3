// File: src/utils/dateUtils.ts

/**
 * Convert a local datetime string (e.g. "YYYY-MM-DDTHH:mm" or any ISO without Z)
 * into a UTC ISO string. Throws if the input cannot be parsed. Always returns
 * a string ending in 'Z'.
 */
export function toUtcIso(localIso: string): string {
  const date = new Date(localIso);
  if (isNaN(date.getTime())) {
	throw new Error(`Invalid date string: ${localIso}`);
  }
  return date.toISOString();
}

/**
 * Format a UTC ISO string in the given IANA time zone.
 * @param utcIso - ISO string with Z suffix (e.g. "2025-06-23T14:00:00Z").
 * @param timeZone - IANA TZ name (e.g. "America/New_York").
 * @param options - Intl.DateTimeFormat options for customizing output.
 */
export function formatInTZ(
  utcIso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(utcIso).toLocaleString(undefined, { timeZone, ...options });
}
