export function formatRp(n: number) {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

export function formatRpCompact(n: number) {
  const v = Math.round(Number(n) || 0);
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  if (abs >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return formatRp(v);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const mi = Number(m) - 1;
  if (!y || mi < 0) return d;
  return `${Number(day)} ${months[mi]} ${y}`;
}

export function parsePlatforms(raw: string | string[] | null) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function num(v: unknown) {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}
