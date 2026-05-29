/**
 * Shared error-handling helpers for converting unknown caught errors into
 * user-facing messages without leaking implementation details (DB schema,
 * Supabase/PostgREST jargon, constraint names, stack traces, etc).
 *
 * Always log the raw error to console.warn yourself for debugging.
 */

/**
 * Maps a raw caught error into a short, friendly hint suitable for inline
 * UI messaging. Returns lowercase phrases meant to be concatenated into a
 * larger sentence (e.g. "Couldn't save — <reason>. Try again.")
 *
 * Buckets:
 *   - network / fetch / timeout   → "check your connection and try again"
 *   - auth / jwt / session        → "your session expired, please sign in again"
 *   - not found                   → "the item may have been removed"
 *   - permission / unauthorized   → "you don't have access to that"
 *   - default                     → "please try again"
 */
export function friendlyReason(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : '';

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('econnrefused')
  ) {
    return 'check your connection and try again';
  }

  if (
    message.includes('jwt') ||
    message.includes('session') ||
    message.includes('sign in') ||
    message.includes('unauthenticated') ||
    message.includes('not authenticated')
  ) {
    return 'your session expired, please sign in again';
  }

  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('not allowed') ||
    message.includes('forbidden')
  ) {
    return "you don't have access to that";
  }

  if (
    message.includes('not found') ||
    message.includes("doesn't exist") ||
    message.includes('does not exist')
  ) {
    return 'the item may have been removed';
  }

  return 'please try again';
}

/**
 * One-shot helper for the common case of setting a UI error message after a
 * caught exception. Logs the real error to the console and returns a
 * friendly user-facing string.
 *
 * Usage:
 *   try { ... } catch (err) { setError(userMessage(err, "Couldn't save trade")); }
 */
export function userMessage(err: unknown, fallback: string): string {
  if (err) {
    // eslint-disable-next-line no-console
    console.warn(fallback + ':', err);
  }
  return `${fallback} — ${friendlyReason(err)}.`;
}
