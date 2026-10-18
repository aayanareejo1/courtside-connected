// Share a page with the phone's share sheet, or copy the link where sharing is not available.
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function ShareButton({ title, text, path }: { title: string; text: string; path: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (typeof navigator.share === "function") { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch { /* the person closed the share sheet, or copying is blocked: nothing to report */ }
  }
  return <span className="inline-flex items-center gap-2">
    <Button type="button" variant="outline" className="tap" onClick={() => void share()}>{copied ? <Check aria-hidden /> : <Share2 aria-hidden />}{t.share.button}</Button>
    <span role="status" className="text-sm text-muted-foreground">{copied ? t.share.copied : ""}</span>
  </span>;
}
