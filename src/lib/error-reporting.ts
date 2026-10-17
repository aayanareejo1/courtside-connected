// Reports errors caught by the root error boundary. Console only; plug in your own
// error tracker here if you add one (and update the privacy note if it tracks users).
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[courtside] " + describeThrown(error), { route: window.location.pathname, ...context });
}

const MAX_SERIALIZED_LENGTH = 2000;

// Loaders and server fns throw raw Responses and plain objects (a Supabase
// `{ message, code, details }`), which String() reduces to "[object ...]".
function describeThrown(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const { message } = (error ?? {}) as { message?: unknown };
  if (typeof message === "string" && message.length > 0) return message;
  try {
    return JSON.stringify(error)?.slice(0, MAX_SERIALIZED_LENGTH) ?? String(error);
  } catch {
    return String(error);
  }
}
