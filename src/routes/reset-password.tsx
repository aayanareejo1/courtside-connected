import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set staff password · Courtside Connected" },
    { name: "description", content: "Set a staff password from your invitation or reset email." },
    { property: "og:title", content: "Set staff password · Courtside Connected" },
    { property: "og:description", content: "Set a staff password from your invitation or reset email." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const type = new URLSearchParams(window.location.hash.slice(1)).get("type");
    if (type === "recovery" || type === "invite") supabase.auth.getUser().then(({ data }) => setAllowed(!!data.user));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage(t.admin.passwordMismatch); return; }
    setBusy(true);
    try { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setMessage(t.admin.passwordSaved); }
    catch { setMessage(t.admin.error); } finally { setBusy(false); }
  }
  return <div className="space-y-4 py-6">
    <h1 className="text-4xl font-bold uppercase">{t.admin.resetTitle}</h1>
    {allowed ? <form onSubmit={save} className="space-y-4">
      <label className="block space-y-2"><span className="font-medium">{t.admin.newPassword}</span><Input className="h-11" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className="block space-y-2"><span className="font-medium">{t.admin.confirmPassword}</span><Input className="h-11" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
      <Button disabled={busy} className="tap h-11">{t.admin.resetTitle}</Button>
    </form> : <p>{t.admin.invalidLink}</p>}
    {message && <p role="status" aria-live="polite">{message}</p>}
    <Button asChild variant="link" className="tap"><Link to="/staff">{t.admin.title}</Link></Button>
  </div>;
}
