"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { applyGeneralSettings, watchSystemTheme } from "@/lib/settingsApply";

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { general, loading } = useUserSettings();

  useEffect(() => {
    if (loading) return;
    applyGeneralSettings(general);

    if (general.theme !== "system") return;
    return watchSystemTheme(() => applyGeneralSettings(general));
  }, [general, loading]);

  return <>{children}</>;
}
