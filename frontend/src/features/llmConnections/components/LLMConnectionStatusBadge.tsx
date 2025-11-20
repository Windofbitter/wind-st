import { useTranslation } from "react-i18next";
import type { LLMConnectionStatus } from "../../../api/llmConnections";

interface Props {
  status: LLMConnectionStatus;
  lastTestedAt: string | null;
  checking: boolean;
  modelsAvailable?: number | null;
  note?: string;
}

export function LLMConnectionStatusBadge({
  status,
  lastTestedAt,
  checking,
  modelsAvailable,
  note,
}: Props) {
  const { t } = useTranslation();

  const color =
    status === "ok"
      ? "#00c853"
      : status === "error"
        ? "#ff5252"
        : "#9e9e9e";

  const label = (() => {
    if (checking) return t("mcpServers.statusChecking");
    if (status === "ok") return t("llmConnections.statusOk");
    if (status === "error") return t("llmConnections.statusError");
    return t("llmConnections.statusUnknown");
  })();

  const meta: string[] = [];
  if (lastTestedAt) {
    meta.push(
      t("llmConnections.statusLastTested", {
        timestamp: new Date(lastTestedAt).toLocaleTimeString(),
      }),
    );
  } else {
    meta.push(t("llmConnections.statusNotTested"));
  }
  if (modelsAvailable !== undefined && modelsAvailable !== null) {
    meta.push(
      t("llmConnections.testResultOk", { count: modelsAvailable }),
    );
  }
  if (note) {
    meta.push(note);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <span
        className="badge"
        style={{
          backgroundColor: color,
          color: "#111",
          fontWeight: 600,
          border: "none",
          alignSelf: "flex-start",
        }}
      >
        {label}
      </span>
      {meta.length > 0 && (
        <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
          {meta.join(" • ")}
        </span>
      )}
    </div>
  );
}
