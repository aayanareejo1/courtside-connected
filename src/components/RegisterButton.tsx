import { ExternalLink, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeExternalUrl } from "@/lib/content-rules";
import { t } from "@/lib/i18n";
export function RegisterButton({ url, live }: { url: string | null; live: boolean }) {
 const href = safeExternalUrl(url);
 if (!href) return null;
 return <div className="py-2"><Button asChild variant="secondary" className="h-auto min-h-12 w-full whitespace-normal"><a href={href} target="_blank" rel="noopener noreferrer"><UserPlus aria-hidden />{t.register.cta}<ExternalLink aria-hidden /></a></Button><p className="mt-2 text-center text-sm text-muted-foreground">{live ? t.register.live : t.register.soon}</p></div>;
}
