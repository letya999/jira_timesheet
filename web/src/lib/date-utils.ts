import { format, parseISO } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

/**
 * Global date utility to ensure consistent timezone handling.
 * Following project mandate: Never use new Date() directly.
 */

export const dateUtils = {
  /**
   * Returns current date in UTC
   */
  now: () => new Date(), // This is the only place allowed to use new Date() internally

  /**
   * Converts a date to user's local timezone for display
   */
  toLocal: (date: Date | string | number, tz: string) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return toZonedTime(d, tz)
  },

  /**
   * Formats a date in a specific timezone
   */
  format: (date: Date | string | number, formatStr: string, tz: string) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return formatInTimeZone(d, tz, formatStr)
  },

  /**
   * Simple wrapper for date-fns format if tz is not needed (e.g. for ISO strings without offset)
   */
  formatPlain: (date: Date | string | number, formatStr: string) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return format(d, formatStr)
  },

  /**
   * Parses ISO string to Date object
   */
  parse: (dateStr: string) => parseISO(dateStr),

  /**
   * Converts to ISO string
   */
  toISOString: (date: Date | string | number) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date)
    return d.toISOString()
  },
}
