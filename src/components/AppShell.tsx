import logo from "@/assets/ontario-volleyball-logo.png.asset.json";
import { DemoBanner } from "@/components/DemoBanner";
import { Link } from "@tanstack/react-router";
import { Home, Search, CalendarDays, Info, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { AskWidget } from "@/components/AskWidget";
const items = [
 { to: "/", label: t.nav.home, Icon: Home }, { to: "/search", label: t.nav.search, Icon: Search },
 { to: "/following", label: t.nav.following, Icon: CalendarDays }, { to: "/info", label: t.nav.info, Icon: Info }, { to: "/venue", label: t.nav.venue, Icon: MapPin },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
 return <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
  <DemoBanner />
  <a href="#main" className="sr-only focus:not-sr-only focus:p-3">Skip to content</a>
  <header className="app-header relative z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-4 text-foreground sm:px-8">
   <Link to="/" aria-label="OVAchamps home" className="tap inline-flex min-w-0 flex-col justify-center font-display font-bold uppercase leading-none"><span className="text-3xl normal-case sm:text-4xl">{t.appName}</span></Link>
   <div className="flex shrink-0 items-center gap-3"><AskWidget /><img src={`https://id-preview--173c3263-2310-4ef2-b73e-a59f372c8b00.lovable.app${logo.url}`} alt="Ontario Volleyball" className="h-16 w-12 shrink-0 object-contain sm:h-20 sm:w-16" /></div>
  </header>
  <ConnectionBanner />
  <main tabIndex={-1} id="main" className="app-main flex-1 px-5 pb-8 pt-6 sm:px-8 sm:pt-8">{children}</main>
  <footer className="space-y-2 border-t px-5 pt-5 pb-40 sm:px-8 text-sm text-muted-foreground"><p>{t.privacy.note}</p><p><Link to="/staff" className="tap inline-flex items-center underline">{t.admin.brandLink}</Link></p></footer>
  <nav aria-label="Main" className="main-nav fixed inset-x-0 bottom-0 z-20 border-t bg-card">
   <ul className="mx-auto grid max-w-5xl grid-cols-5">{items.map(({ to,label,Icon }) => <li key={to}>
    <Link to={to} activeOptions={{ exact: to === "/" }} className="tap flex flex-col items-center justify-center gap-1 break-words px-1 py-2 text-xs font-medium text-muted-foreground data-[status=active]:text-primary"><Icon className="h-6 w-6 shrink-0" aria-hidden /><span className="w-full min-w-0 break-words text-center">{label}</span></Link>
   </li>)}</ul>
  </nav>
 </div>;
}
export function ComingSoon({ title }: { title: string }) {
 return <section><h1 className="text-4xl font-bold uppercase">{title}</h1><p className="mt-2 text-muted-foreground">{t.comingSoon}</p></section>;
}
