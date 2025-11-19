import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getHealth } from "../../api/health";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export function HealthPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    void loadHealth();
  }, []);

  async function loadHealth() {
    setState({ loading: true, error: null });
    try {
      const data = await getHealth();
      setStatus(data.status);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to check health",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  const ok = status === "ok";

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t("health.title")}</h3>
      {state.loading && <div>{t("health.checking")}</div>}
      {state.error && (
        <div className="badge">
          {t("common.errorPrefix")} {state.error}
        </div>
      )}
      {status && !state.loading && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "1rem",
            fontWeight: 500,
          }}
        >
          {t("health.statusLabel")}{" "}
          <span
            style={{
              color: ok ? "#00c853" : "#ff5252",
            }}
          >
            {ok ? t("health.statusOk") : status}
          </span>
        </div>
      )}
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: "1rem" }}
        onClick={() => void loadHealth()}
      >
        {t("health.refreshButton")}
      </button>
    </div>
  );
}

