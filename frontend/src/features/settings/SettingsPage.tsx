import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "../../i18n";

const THEME_KEY = "wind-st-theme";

type Theme = "dark" | "light";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<SupportedLanguage>(
    i18n.language === "zh" ? "zh" : "en",
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  }, [language, i18n]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t("settings.title")}</h3>
      <div className="input-group">
        <label htmlFor="theme-select">
          {t("settings.themeLabel")}
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) =>
            setTheme(e.target.value as Theme)
          }
        >
          <option value="dark">
            {t("settings.themeDark")}
          </option>
          <option value="light">
            {t("settings.themeLight")}
          </option>
        </select>
      </div>
      <div className="input-group">
        <label htmlFor="language-select">
          {t("settings.languageLabel")}
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) =>
            setLanguage(e.target.value as SupportedLanguage)
          }
        >
          <option value="en">
            {t("settings.languageEnglish")}
          </option>
          <option value="zh">
            {t("settings.languageChinese")}
          </option>
        </select>
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        {t("settings.themeHint")}
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        {t("settings.languageHint")}
      </div>
    </div>
  );
}

