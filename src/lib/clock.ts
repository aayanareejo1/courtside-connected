// One app clock. Real time by default; with ?demo=1 the clock starts at 12:30 PM Toronto on the first event day
// and then runs forward, so time based features (coming up, leave by, clashes) can be shown with the sample data.
export const DEMO_START = Date.parse("2026-04-19T16:30:00Z"); // 12:30 PM Toronto (EDT)
const KEY = "courtside-demo-clock";

// Pure: demo time from the real time at which the demo was started.
export const demoClock = (startedAt: number, realNow: number) => DEMO_START + Math.max(0, realNow - startedAt);

// Pure: ?demo=1 turns the demo on, ?demo=0 turns it off, anything else keeps the stored choice.
export function nextDemoState(search: string, stored: number | null, realNow: number): number | null {
  const flag = new URLSearchParams(search).get("demo");
  if (flag === "0") return null;
  if (flag === "1") return stored ?? realNow;
  return stored;
}

function readStored(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

function demoStartedAt(): number | null {
  if (typeof window === "undefined") return null;
  const next = nextDemoState(window.location.search, readStored(), Date.now());
  try { next === null ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, String(next)); } catch { /* the clock still works for this page */ }
  return next;
}

export const isDemoClock = () => demoStartedAt() !== null;

// Use this instead of Date.now() for anything the fan sees as "now".
export function appNow(): number {
  const startedAt = demoStartedAt();
  return startedAt === null ? Date.now() : demoClock(startedAt, Date.now());
}
