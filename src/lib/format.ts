const kgFormatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const intFormatter = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function formatKg(value: number) {
  return `${kgFormatter.format(value)} kg`;
}

/** Large volumes read better in tonnes. */
export function formatVolume(kg: number) {
  if (Math.abs(kg) >= 10_000) return `${kgFormatter.format(Math.round(kg / 100) / 10)} t`;
  return `${intFormatter.format(kg)} kg`;
}

export function formatSignedKg(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${kgFormatter.format(Math.abs(value))} kg`;
}

export function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${m.toString().padStart(2, "0")} min` : `${m} min`;
}

export function formatInteger(value: number) {
  return intFormatter.format(value);
}
