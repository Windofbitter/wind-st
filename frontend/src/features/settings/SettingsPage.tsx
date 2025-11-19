import { useEffect, useState } from "react";

const THEME_KEY = "wind-st-theme";

type Theme = "dark" | "light";

export function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Settings</h3>
      <div className="input-group">
        <label htmlFor="theme-select">Theme (UI only)</label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) =>
            setTheme(e.target.value as Theme)
          }
        >
          <option value="dark">Dark</option>
          <option value="light">Light (experimental)</option>
        </select>
      </div>
      <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
        Theme is stored in local storage only. The current CSS is
        optimized for dark mode.
      </div>
    </div>
  );
}

