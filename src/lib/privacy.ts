// Minors: beach pairs from MyTeam.click are shown as initials only ("E.Kent Elmido" -> "E.E.").
export function initials(published: string): string {
  const parts = published.replace(/\./g, ". ").split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0]![0]!.toUpperCase();
  const last = parts[parts.length - 1]![0]!.toUpperCase();
  return parts.length === 1 ? `${first}.` : `${first}.${last}.`;
}
export const pairInitials = (pair: string) => pair.split("/").map((p) => initials(p.trim())).join(" / ");
