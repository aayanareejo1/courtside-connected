import { Link } from "@tanstack/react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Video, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { hasMapPosition, courtsByNumber } from "@/lib/court-schedule";
import { areaFeature, floorPlanUrl, type AreaFeature } from "@/lib/venue";
import type { SponsorSlot } from "@/components/SponsorCard";

export type MapArea = { id: string; name: string; kind: string; x: number; y: number; w: number; h: number };
export type MapCourt = { id: string; label: string; map_x: number | null; map_y: number | null; stream_url: string | null; area_id: string | null };

const FEATURE_STYLE: Record<AreaFeature, string> = {
  hall: "fill-muted stroke-border", warmup: "fill-success/15 stroke-success", meeting: "fill-secondary stroke-border",
  washroom: "fill-follow-5/15 stroke-follow-5", entrance: "fill-follow-1/15 stroke-follow-1", food: "fill-follow-3/15 stroke-follow-3",
  registration: "fill-accent/15 stroke-accent", other: "fill-secondary stroke-border",
};
const FEATURE_DOT: Record<AreaFeature, string> = {
  hall: "bg-muted border-border", warmup: "bg-success/15 border-success", meeting: "bg-secondary border-border",
  washroom: "bg-follow-5/15 border-follow-5", entrance: "bg-follow-1/15 border-follow-1", food: "bg-follow-3/15 border-follow-3",
  registration: "bg-accent/15 border-accent", other: "bg-secondary border-border",
};

export function VenueMap({ areas, courts, width, height, highlightId, sponsorPins = [], floorPlan }: {
  areas: MapArea[]; courts: MapCourt[]; width: number; height: number; highlightId?: string; sponsorPins?: SponsorSlot[]; floorPlan?: string | null | undefined;
}) {
  const vh = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? 100 * height / width : 70;
  const y = (p: number) => p * vh / 100;
  const selected = courts.find(c => c.id === highlightId);
  const plan = floorPlanUrl(floorPlan);
  const used = [...new Set(areas.map(a => areaFeature(a.kind, a.name)))];
  return (
    <section aria-label={t.map.guide} className="overflow-hidden rounded-2xl border bg-card">
      <h2 className="border-b px-3 py-2 font-display text-lg font-bold uppercase">{t.map.guide}</h2>
      <TransformWrapper minScale={1} maxScale={5} doubleClick={{ mode: "zoomIn" }} pinch={{ step: 5 }} wheel={{ step: 0.15 }}>
        {({ zoomIn, zoomOut, resetTransform }) => (<>
          <TransformComponent wrapperStyle={{ width: "100%", touchAction: "none" }} contentStyle={{ width: "100%" }}>
            <svg viewBox={`0 0 100 ${vh}`} className="w-full touch-none" role="group" aria-label={t.map.guide}>
              <rect x={0} y={0} width={100} height={vh} className="fill-background" />
              {plan && <image href={plan} x={0} y={0} width={100} height={vh} preserveAspectRatio="xMidYMid meet" />}
              {areas.map(a => {
                const f = areaFeature(a.kind, a.name);
                const on = a.id === selected?.area_id;
                return <g key={a.id}>
                  <rect x={a.x} y={y(a.y)} width={a.w} height={y(a.h)} rx={0.8}
                    className={on ? "fill-secondary stroke-primary" : FEATURE_STYLE[f]} fillOpacity={plan ? 0.35 : 1}
                    strokeWidth={on ? 0.6 : 0.25} strokeDasharray={f === "hall" ? undefined : "1 0.6"} />
                  <text x={a.x + 0.8} y={y(a.y) + 2.4} className="fill-foreground font-display uppercase" fontSize={f === "hall" ? 2.4 : 1.8} fontWeight={700}>{a.name}</text>
                </g>;
              })}
              {courts.filter(hasMapPosition).map(c => {
                if (c.map_x === null || c.map_y === null) return null;
                const hl = c.id === highlightId;
                const cx = c.map_x, cy = y(c.map_y);
                return <Link key={c.id} to="/courts/$courtId" params={{ courtId: c.id }} aria-label={`${t.map.court} ${c.label}${hl ? `, ${t.map.selected}` : ""}`} aria-current={hl ? "page" : undefined}>
                  <g className="cursor-pointer">
                    <rect x={cx - 6} y={cy - 6} width={12} height={12} opacity={0} pointerEvents="all" />
                    {hl && <circle cx={cx} cy={cy} r={6} className="fill-accent/25 stroke-accent" strokeWidth={0.5}><animate attributeName="r" values="5;6.5;5" dur="2s" repeatCount="indefinite" /></circle>}
                    <rect x={cx - 4} y={cy - 3} width={8} height={6} rx={0.8}
                      className={hl ? "fill-accent stroke-accent-foreground" : "fill-primary stroke-primary-foreground"} strokeWidth={hl ? 0.6 : 0.25} />
                    <text x={cx} y={cy + 1.2} textAnchor="middle" fontSize={3.2} fontWeight={700}
                      className={`font-display ${hl ? "fill-accent-foreground" : "fill-primary-foreground"}`}>{c.label}</text>
                    {c.stream_url && <circle cx={cx + 3.6} cy={cy - 2.6} r={0.9} className="fill-destructive" />}
                  </g>
                </Link>;
              })}
              {sponsorPins.map(slot => {
                const court = courts.find(c => c.id === slot.court_id);
                if (!court || !hasMapPosition(court) || court.map_x === null || court.map_y === null || !slot.sponsors) return null;
                return <Link key={slot.id} to="/sponsors" hash={`slot-${slot.id}`} aria-label={`${t.sponsors.pin}: ${slot.sponsors.name} · ${t.map.court} ${court.label}`}><g className="cursor-pointer"><title>{slot.headline ?? slot.sponsors.name}</title><circle cx={court.map_x + 5} cy={y(court.map_y) + 3} r={2} className="fill-accent stroke-accent-foreground" strokeWidth={0.3} /></g></Link>;
              })}
            </svg>
          </TransformComponent>
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <p className="text-xs text-muted-foreground">{t.map.hint}</p>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="icon" title={t.map.zoomIn} onClick={() => zoomIn(0.5, 150)} aria-label={t.map.zoomIn} className="tap h-11 w-11"><ZoomIn className="h-5 w-5" aria-hidden /></Button>
              <Button variant="secondary" size="icon" title={t.map.zoomOut} onClick={() => zoomOut(0.5, 150)} aria-label={t.map.zoomOut} className="tap h-11 w-11"><ZoomOut className="h-5 w-5" aria-hidden /></Button>
              <Button variant="secondary" size="icon" title={t.map.reset} onClick={() => resetTransform(150)} aria-label={t.map.reset} className="tap h-11 w-11"><RotateCcw className="h-5 w-5" aria-hidden /></Button>
            </div>
          </div>
        </>)}
      </TransformWrapper>
      {used.length > 0 && <ul aria-label={t.map.key} className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs">
        {used.map(f => <li key={f} className="flex items-center gap-1.5"><span aria-hidden className={`h-3 w-3 rounded-sm border ${FEATURE_DOT[f]}`} />{t.map.features[f]}</li>)}
        <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />{t.map.selected}</li>
      </ul>}
      <p className="border-t px-3 py-2 text-sm text-muted-foreground">{t.map.placeholder}</p>
    </section>
  );
}

export function MapTextList({ areas, courts }: { areas: MapArea[]; courts: MapCourt[] }) {
  return <section aria-labelledby="courts-list">
    <h2 id="courts-list" className="text-2xl font-bold uppercase">{t.map.listTitle}</h2>
    <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {courtsByNumber(courts).map(c => <li key={c.id}>
        <Link to="/courts/$courtId" params={{ courtId: c.id }} className="tap grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-card p-3">
          <span className="min-w-0 break-words font-display text-xl font-bold">{t.map.court} {c.label}</span>
          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">{areas.find(a => a.id === c.area_id)?.name}{c.stream_url && <Video className="h-4 w-4 shrink-0 text-destructive" aria-label={t.map.stream} />}</span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
