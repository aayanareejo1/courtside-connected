import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Staff sign-in · OVAchamps" },
    { name: "description", content: "OVA event staff sign in to post announcements." },
    { property: "og:title", content: "Staff sign-in · OVAchamps" },
    { property: "og:description", content: "OVA event staff sign in to post announcements." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await navigate({ to: "/staff" });
    } catch { setMessage(t.admin.loginError); } finally { setBusy(false); }
  }
  async function reset() {
    if (!email) { setMessage(t.admin.required); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      setMessage(t.admin.resetSent);
    } catch { setMessage(t.admin.error); } finally { setBusy(false); }
  }
  return <div className="space-y-6 py-6">
    <header><h1 className="text-4xl font-bold uppercase">{t.admin.login}</h1><p className="mt-2 text-muted-foreground">{t.admin.invitationOnly}</p></header>
    <form onSubmit={signIn} className="space-y-4">
      <label className="block space-y-2"><span className="font-medium">{t.admin.email}</span><Input className="h-11" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="block space-y-2"><span className="font-medium">{t.admin.password}</span><Input className="h-11" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <Button disabled={busy} className="tap h-11 w-full">{t.admin.signIn}</Button>
      <Button type="button" disabled={busy} variant="link" className="tap" onClick={reset}>{t.admin.forgot}</Button>
    </form>
    {message && <p role="status" aria-live="polite">{message}</p>}
    <Button asChild variant="outline" className="tap"><Link to="/">{t.court.back}</Link></Button>
  </div>;
}
