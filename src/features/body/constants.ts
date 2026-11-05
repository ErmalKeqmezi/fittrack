// Columns and ranges mirror supabase/migrations/*_body_measurements.sql.

export const METRIC_GROUPS = ["General", "Upper body", "Lower body"] as const;

export const METRICS = [
  { key: "height_cm", label: "Height", unit: "cm", min: 50, max: 272, group: "General" },
  { key: "weight_kg", label: "Weight", unit: "kg", min: 20, max: 500, group: "General" },
  { key: "body_fat_percent", label: "Body fat", unit: "%", min: 1, max: 75, group: "General" },
  { key: "neck_cm", label: "Neck", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "shoulders_cm", label: "Shoulders", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "chest_cm", label: "Chest", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "biceps_cm", label: "Biceps", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "forearms_cm", label: "Forearms", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "waist_cm", label: "Waist", unit: "cm", min: 5, max: 300, group: "Upper body" },
  { key: "hips_cm", label: "Hips", unit: "cm", min: 5, max: 300, group: "Lower body" },
  { key: "quads_cm", label: "Quads", unit: "cm", min: 5, max: 300, group: "Lower body" },
  { key: "calves_cm", label: "Calves", unit: "cm", min: 5, max: 300, group: "Lower body" },
] as const;

export type Metric = (typeof METRICS)[number];
export type MetricKey = Metric["key"];

export type MeasurementValues = Record<MetricKey, number | null>;
export type Measurement = MeasurementValues & { id: string; measured_on: string };

export function formatMetric(value: number, unit: Metric["unit"]) {
  const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
  return unit === "%" ? `${number}%` : `${number} ${unit}`;
}
