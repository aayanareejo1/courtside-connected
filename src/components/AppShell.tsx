import { Link } from "@tanstack/react-router";
import { Home, Search, Star, Info, Gift } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { ConnectionBanner } from "@/components/ConnectionBanner";
const items = [
 { to: "/", label: t.nav.home, Icon: Home }, { to: "/search", label: t.nav.search, Icon: Search },
 { to: "/following", label: t.nav.following, Icon: Star }, { to: "/info", label: t.nav.info, Icon: Info }, { to: "/sponsors", label: t.nav.sponsors, Icon: Gift },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
 return <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
  <a href="#main" className="sr-only focus:not-sr-only focus:p-3">Skip to content</a>
  <header className="relative z-20 flex items-center justify-between bg-ink px-4 py-3 text-ink-foreground">
   <Link to="/" className="tap inline-flex flex-wrap items-center font-display text-xl font-bold uppercase">Courtside <span className="text-accent">Connected</span></Link>
  </header>
  <ConnectionBanner />
  <main tabIndex={-1} id="main" className="flex-1 px-4 pb-40 pt-4">{children}</main>
  <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t bg-card">
   <ul className="mx-auto grid max-w-xl grid-cols-5">{items.map(({ to,label,Icon }) => <li key={to}>
    <Link to={to} activeOptions={{ exact: to === "/" }} className="tap flex flex-col items-center justify-center gap-0.5 break-words py-2 text-xs font-medium text-muted-foreground data-[status=active]:text-primary"><Icon className="h-6 w-6 shrink-0" aria-hidden /><span className="w-full min-w-0 break-words text-center">{label}</span></Link>
   </li>)}</ul>
  </nav>
 </div>;
}
export function ComingSoon({ title }: { title: string }) {
 return <section><h1 className="text-4xl font-bold uppercase">{title}</h1><p className="mt-2 text-muted-foreground">{t.comingSoon}</p></section>;
}
