// Talk to OVAchamps: a real two-way voice call. Shown only when the server reports voice is switched on.
// Captions stay in component state for this call; device follows are not sent.
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { appNow } from "@/lib/clock";

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

export function VoiceCall() {
  const [lines, setLines] = useState<Line[]>([]);
  const [url, setUrl] = useState("/api/live");
  const onEvent = (event: LiveEvent) => {
    const role: Line["role"] | null = event.type === "session.input_transcript.delta" ? "user" : event.type === "session.output_transcript.delta" ? "assistant" : null;
    const delta = typeof event["delta"] === "string" ? (event["delta"] as string) : "";
    if (!role || !delta) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role) return [...prev.slice(0, -1), { role, text: last.text + delta }];
      return [...prev, { role, text: delta }].slice(-12);
    });
  };
  const voice = useLiveVoice({ url, onEvent });
  const pendingStart = useRef(false);
  useEffect(() => { if (pendingStart.current) { pendingStart.current = false; voice.start(); } }, [url, voice]);
  const idle = voice.status === "idle" || voice.status === "closed";
  const begin = () => { setLines([]); pendingStart.current = true; setUrl(`/api/live?now=${Math.round(appNow())}`); };

  return <section aria-label="Voice call with OVAchamps" className="shrink-0 border-b px-4 py-3">
    <audio ref={voice.audioRef} className="sr-only" />
    <div className="flex flex-wrap items-center gap-2">
      {idle
        ? <Button type="button" onClick={begin} className="h-11 gap-2"><Phone className="h-5 w-5" aria-hidden />Talk to OVAchamps</Button>
        : <>
          <Button type="button" variant="destructive" onClick={voice.stop} className="h-11 gap-2"><PhoneOff className="h-5 w-5" aria-hidden />End call</Button>
          <Button type="button" variant="outline" disabled={voice.status !== "connected"} onClick={() => voice.setMuted(!voice.muted)} aria-pressed={voice.muted} className="h-11 gap-2">
            {voice.muted ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}{voice.muted ? "Unmute" : "Mute"}
          </Button>
        </>}
      {voice.playbackBlocked && <Button type="button" variant="outline" onClick={voice.resumePlayback} className="h-11 gap-2"><Volume2 className="h-5 w-5" aria-hidden />Play sound</Button>}
      <p role="status" className="text-sm text-muted-foreground">
        {voice.status === "connecting" ? "Connecting..." : voice.status === "connected" ? (voice.muted ? "Muted" : "Listening") : voice.status === "stopping" ? "Ending call..." : ""}
      </p>
    </div>
    {voice.error && <p role="alert" className="mt-2 text-sm text-destructive">{voice.status === "closed" && /not switched on|503/i.test(voice.error) ? "Voice calls are not available right now." : voice.error}</p>}
    {idle && !voice.error && <p className="mt-2 text-xs text-muted-foreground">Uses your microphone only during the call. Your voice goes to the voice service to answer you.</p>}
    {lines.length > 0 && <ol aria-label="Call captions" aria-live="polite" className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
      {lines.map((l, i) => <li key={i}><span className="font-semibold">{l.role === "user" ? "You: " : "OVAchamps: "}</span>{l.text}</li>)}
    </ol>}
  </section>;
}
