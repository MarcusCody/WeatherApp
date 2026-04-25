export function formatDateTime(d: Date): string {
  // Required format (Figma): DD-MM-YYYY hh:mma (e.g. 01-10-2026 08:45am)
  // NOTE: `WeatherResult.updatedAt` is computed by shifting unix time with the location's timezone.
  // We therefore format using UTC getters to avoid applying the browser's local timezone again.
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();

  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const h24 = d.getUTCHours();
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12).padStart(2, "0");

  return `${dd}-${mm}-${yyyy} ${hh}:${minutes}${ampm}`;
}

