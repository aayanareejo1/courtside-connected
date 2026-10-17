import { Link } from "@tanstack/react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Video, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { SponsorSlot } from "@/components/SponsorCard";

export type MapArea = { id: string; name: string; kind: string; x: number; y: number; w: number; h: number };
export type MapCourt = { id: string; label: string; map_x: number; map_y: number; stream_url: string | null; area_id: string | null };

// Coordinates are stored as percentages of the plan, so markers stay put on any screen.
export function VenueMap({ areas, courts, width, height, highlightId, sponsorPins = [] }: {
  areas: MapArea[]; courts: MapCourt[]; width: number; height: number; highlightId?: string; sponsorPins?: SponsorSlot[];
}) {
  const vh = (100 * height) / width;
  const y = (p: number) => (p * vh) / 100;
  return (
    <TransformWrapper minScale={1} maxScale={4} doubleClick={{ mode: "zoomIn" }}>
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          <TransformComponent wrapperStyle={{ width: "100%" }} contentStyle={{ width: "100%" }}>
            <svg viewBox={`0 0 100 ${vh}`} className="w-full touch-none" role="group" aria-label={t.map.title}>
              {areas.map((a) => (
                <g key={a.id}>
                  <rect x={a.x} y={y(a.y)} width={a.w} height={y(a.h)} rx={1.2}
                    className={a.kind === "hall" ? "fill-muted stroke-border" : "fill-secondary stroke-border"} strokeWidth={0.3} />
                  <text x={a.x + 1.2} y={y(a.y) + 3} className="fill-muted-foreground font-display uppercase" fontSize={2.4} fontWeight={700}>{a.name}</text>
                </g>
              ))}
              {courts.map((c) => {
                const hl = c.id === highlightId;
                return (
                  <Link key={c.id} to="/courts/$courtId" params={{ courtId: c.id }} aria-label={`${t.map.court} ${c.label}`}>
                    <g className="cursor-pointer">
                      <rect x={c.map_x - 5} y={y(c.map_y) - 4} width={10} height={8} rx={1}
                        className={hl ? "fill-accent stroke-accent-foreground" : "fill-primary stroke-primary-foreground"} strokeWidth={0.3} />
                      <text x={c.map_x} y={y(c.map_y) + 1.4} textAnchor="middle" fontSize={4} fontWeight={700}
                        className={`font-display ${hl ? "fill-accent-foreground" : "fill-primary-foreground"}`}>{c.label}</text>
                      {c.stream_url && <circle cx={c.map_x + 4} cy={y(c.map_y) - 3} r={1.1} className="fill-destructive" />}
                    </g>
                  </Link>
                );
              })}
              {sponsorPins.map((slot) => {
                const court = courts.find((c) => c.id === slot.court_id);
                if (!court || !slot.sponsors) return null;
                return <Link key={slot.id} to="/sponsors" hash={`slot-${slot.id}`} aria-label={`${t.sponsors.pin}: ${slot.sponsors.name} · ${t.map.court} ${court.label}`}><g className="cursor-pointer"><title>{slot.headline ?? slot.sponsors.name}</title><circle cx={court.map_x + 6} cy={y(court.map_y) + 3} r={2.5} className="fill-accent stroke-accent-foreground" strokeWidth={0.3} /><path d={`M ${court.map_x + 6} ${y(court.map_y) + 1.5} l .5 1 1.1 .2 -.8 .8 .2 1.1 -1 -.5 -1 .5 .2 -1.1 -.8 -.8 1.1 -.2 Z`} className="fill-accent-foreground" /></g></Link>;
              })}
            </svg>
          </TransformComponent>
          <div className="absolute bottom-2 right-2 flex gap-1">
            {[[ZoomIn, t.map.zoomIn, () => zoomIn()], [ZoomOut, t.map.zoomOut, () => zoomOut()], [RotateCcw, t.map.reset, () => resetTransform()]].map(([I, label, fn]) => {
              const Icon = I as typeof ZoomIn;
              return (
                <Button key={label as string} variant="secondary" size="icon" title={label as string} type="button" onClick={fn as () => void} aria-label={label as string}
                  className="tap flex h-11 w-11 items-center justify-center rounded-lg bg-card/90 shadow">
                  <Icon className="h-5 w-5" aria-hidden />
                </Button>
              );
            })}
          </div>
          <p className="border-t px-3 py-2 pr-40 text-sm text-muted-foreground">{t.map.placeholder}</p>
        </div>
      )}
    </TransformWrapper>
  );
}

// Screen-reader and low-vision equivalent of the map.
export function MapTextList({ areas, courts }: { areas: MapArea[]; courts: MapCourt[] }) {
  const sorted = [...courts].sort((a, b) => Number(a.label) - Number(b.label) || a.label.localeCompare(b.label));
  return (
    <section aria-labelledby="courts-list">
      <h2 id="courts-list" className="text-2xl font-bold uppercase">{t.map.listTitle}</h2>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {sorted.map((c) => (
          <li key={c.id}>
            <Link to="/courts/$courtId" params={{ courtId: c.id }} className="tap flex items-center justify-between rounded-xl bg-card p-3">
              <span className="font-display text-xl font-bold">{t.map.court} {c.label}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {areas.find((a) => a.id === c.area_id)?.name}
                {c.stream_url && <Video className="h-4 w-4 text-destructive" aria-label={t.map.stream} />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
