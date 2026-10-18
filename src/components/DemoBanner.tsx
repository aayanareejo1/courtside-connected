import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { isDemoClock } from "@/lib/clock";

export const DEMO_BANNER_TEXT = "Demo mode: showing the event as of 12:30 PM, April 19";

// Same page and other query values, with demo=0 so the clock goes back to real time.
export function exitDemoHref(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  params.set("demo", "0");
  return `${pathname}?${params.toString()}`;
}

// Read after hydration: the demo flag lives in the address and session storage, which the server cannot see.
export function DemoBanner() {
  const location = useLocation();
  const [demo, setDemo] = useState(false);
  useEffect(() => { setDemo(isDemoClock()); }, [location.href]);
  if (!demo) return null;
  const search = typeof window === "undefined" ? "" : window.location.search;
  return <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-3 py-1.5 text-center text-sm font-semibold text-accent-foreground">
    <span>{DEMO_BANNER_TEXT}</span>
    {/* Plain link so the page reloads and the clock re-reads the address. */}
    <a href={exitDemoHref(location.pathname, search)} className="inline-flex min-h-11 items-center underline underline-offset-4">Exit demo</a>
  </div>;
}
