import type { GeneralSettings } from "@/types/settings";

const ACCENT_TASK: Record<GeneralSettings["accentTask"], string> = {
  blue: "59 130 246",
  indigo: "99 102 241",
  purple: "168 85 247",
};

const ACCENT_PLAN: Record<GeneralSettings["accentPlan"], string> = {
  green: "34 197 94",
  emerald: "16 185 129",
  teal: "20 184 166",
};

const FONT_SIZE: Record<GeneralSettings["fontSize"], string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

function resolveTheme(theme: GeneralSettings["theme"]): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyGeneralSettings(settings: Partial<GeneralSettings>) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const resolved = resolveTheme(settings.theme || "system");

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = settings.theme || "system";
  root.dataset.fontSize = settings.fontSize || "medium";
  root.dataset.compact = settings.compactMode ? "true" : "false";
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.lang = settings.language || "vi";

  root.style.setProperty("--accent-task", ACCENT_TASK[settings.accentTask || "blue"]);
  root.style.setProperty("--accent-plan", ACCENT_PLAN[settings.accentPlan || "green"]);
  root.style.setProperty("--app-font-size", FONT_SIZE[settings.fontSize || "medium"]);
}

export function watchSystemTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
