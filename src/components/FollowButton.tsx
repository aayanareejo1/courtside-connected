import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollows, type Follow } from "@/lib/follows";
import { t } from "@/lib/i18n";

export function FollowButton({ item, name }: { item: Follow; name: string }) {
  const { follows, toggle } = useFollows();
  const active = follows.some((v) => v.type === item.type && v.id === item.id);
  return <Button variant={active ? "secondary" : "outline"} className="tap shrink-0" aria-pressed={active}
    aria-label={`${active ? t.follow.unfollow : t.follow.follow} ${name}`} onClick={() => toggle(item)}>
    <Star className={active ? "fill-primary text-primary" : ""} aria-hidden />{active ? t.follow.following : t.follow.follow}
  </Button>;
}