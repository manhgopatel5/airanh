import type { GeneralSettings } from "@/types/settings";

type FormatPrefs = Pick<GeneralSettings, "dateFormat" | "currency" | "language" | "timezone">;

const DEFAULT_PREFS: FormatPrefs = {
  dateFormat: "DD/MM/YYYY",
  currency: "VND",
  language: "vi",
  timezone: "Asia/Ho_Chi_Minh",
};

export function getFormatPrefs(raw?: Partial<GeneralSettings> | null): FormatPrefs {
  return { ...DEFAULT_PREFS, ...raw };
}

export function formatDateByPref(
  date: Date | string | number,
  prefs: Partial<FormatPrefs> = {}
): string {
  const p = getFormatPrefs(prefs);
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: p.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const { year, month, day } = parts;
  switch (p.dateFormat) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatCurrencyByPref(
  amount: number,
  prefs: Partial<FormatPrefs> = {}
): string {
  const p = getFormatPrefs(prefs);
  const locale = p.language === "en" ? "en-US" : "vi-VN";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: p.currency,
    maximumFractionDigits: p.currency === "VND" ? 0 : 2,
  }).format(amount);
}

export function getLanguageLabel(language: GeneralSettings["language"]): string {
  return language === "en" ? "English" : "Tiếng Việt";
}

export function getTimezoneLabel(timezone: string): string {
  const found = [
    { label: "Việt Nam (GMT+7)", value: "Asia/Ho_Chi_Minh" },
    { label: "Bangkok (GMT+7)", value: "Asia/Bangkok" },
    { label: "Singapore (GMT+8)", value: "Asia/Singapore" },
    { label: "Tokyo (GMT+9)", value: "Asia/Tokyo" },
    { label: "New York (GMT-5)", value: "America/New_York" },
    { label: "London (GMT+0)", value: "Europe/London" },
  ].find((tz) => tz.value === timezone);
  return found?.label || timezone;
}
