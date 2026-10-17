export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchesSearch(query: string, ...values: (string | number | null | undefined)[]) {
  const haystack = normalizeSearch(values.filter((v) => v != null).join(" "));
  return normalizeSearch(query).split(" ").filter(Boolean).every((word) => haystack.includes(word));
}

export function playerName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first ?? ""} ${rest.at(-1)?.[0] ?? ""}.` : (first ?? "");
}