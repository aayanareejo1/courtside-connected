// Talk to OVAchamps: a real two-way voice call. Shown only when the server reports voice is switched on.
// Captions stay in component state for this call; device follows are not sent.
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mic, MicOff, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { appNow } from "@/lib/clock";
import { readVoiceLinks, type EventLookup } from "@/lib/voice-facts";
import { t } from "@/lib/i18n";
import type { AskTurn } from "@/lib/ask-courtside";

type Line = { role: "user" | "assistant"; text: string };

export function useVoiceAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/public/voice-status").then((r) => (r.ok ? r.json() : null)).then((b: { available?: boolean } | null) => { if (live) setAvailable(b?.available === true); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return available;
}

export function VoiceCall({ onEnd, history = [] }: { onEnd: () => void; history?: AskTurn[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [links, setLinks] = useState<EventLookup["links"]>([]);
  const onEvent = (event: LiveEvent) => {
    if (event.type === "app.delegation.pending") setLinks([]);
    if (event.type === "app.event.links") setLinks(readVoiceLinks(event["links"]));
    const role: Line["role"] | null = event.type === "session.input_transcript.delta" ? "user" : event.type === "session.output_transcript.delta" ? "assistant" : null;
    const delta = typeof event["delta"] === "string" ? (event["delta"] as string) : "";
    if (!role || !delta) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role) return [...prev.slice(0, -1), { role, text: last.text + delta }];
      return [...prev, { role, text: delta }].slice(-12);
    });
  };
  // The app clock (demo aware) is fixed when voice mode opens.
  const [url] = useState(() => `/api/live?now=${Math.round(appNow())}`);
  const voice = useLiveVoice({ url, onEvent, history });
  // Start on mount and stop on unmount, so a remount (React dev double-mount) starts a fresh call
  // instead of leaving the screen stuck on "Connecting...".
  const { start, stop } = voice;
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);
  const end = () => { voice.stop(); onEnd(); };
  const live = voice.status === "connected";
  const label = voice.error ? "Call ended" : voice.status === "connecting" ? "Connecting..." : live ? (voice.muted ? "Muted" : "Listening") : voice.status === "stopping" ? "Ending..." : "Call ended";
  const last = lines[lines.length - 1];

  return <section aria-label="Voice mode with OVAchamps" className="flex min-h-0 flex-1 flex-col items-center justify-between gap-6 px-5 py-8 text-center">
    <audio ref={voice.audioRef} className="sr-only" />
    <p role="status" className="text-sm font-medium text-muted-foreground">{label}</p>
    <div aria-hidden className={`voice-orb ${live && !voice.muted ? "is-live" : ""}`} />
    <div className="min-h-24 w-full min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
      {voice.error ? <p role="alert" className="text-sm text-destructive">{voice.error}</p>
        : last ? <p aria-live="polite" className="text-base"><span className="sr-only">{last.role === "user" ? "You said: " : "OVAchamps said: "}</span>{last.text}</p>
        : <p className="text-sm text-muted-foreground">Just start talking. Your microphone is used only during voice mode.</p>}
      {links.length > 0 && <nav aria-label={t.voice.links} className="space-y-2 text-left">{links.map((link) =>
        <Button key={link.url} asChild variant="secondary" className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal px-3 py-3">
          <a href={link.url} target="_blank" rel="noopener noreferrer"><span className="min-w-0 break-words">{link.title}</span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden /><span className="sr-only">{t.voice.newTab}</span></a>
        </Button>)}</nav>}
    </div>
    <div className="flex items-center gap-6">
      {voice.playbackBlocked && <Button type="button" variant="outline" size="icon" onClick={voice.resumePlayback} aria-label="Play sound" className="h-14 w-14 rounded-full"><Volume2 className="h-6 w-6" aria-hidden /></Button>}
      <Button type="button" variant="outline" size="icon" disabled={!live} onClick={() => voice.setMuted(!voice.muted)} aria-pressed={voice.muted} aria-label={voice.muted ? "Unmute" : "Mute"} className="h-14 w-14 rounded-full">
        {voice.muted ? <MicOff className="h-6 w-6" aria-hidden /> : <Mic className="h-6 w-6" aria-hidden />}
      </Button>
      <Button type="button" variant="destructive" size="icon" onClick={end} aria-label="End voice mode" className="h-14 w-14 rounded-full"><X className="h-6 w-6" aria-hidden /></Button>
    </div>
  </section>;
}
