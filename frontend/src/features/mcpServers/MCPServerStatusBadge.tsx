import { useTranslation } from "react-i18next";

export type MCPServerStatus = {
  state: "unknown" | "ok" | "error";
  toolCount?: number;
  error?: string;
  checkedAt?: string;
};

interface MCPServerStatusBadgeProps {
  status: MCPServerStatus | undefined;
  checking: boolean;
}

export function MCPServerStatusBadge({ status, checking }: MCPServerStatusBadgeProps) {
  const { t } = useTranslation();
  const resolved = status ?? { state: "unknown" };

  const color =
    resolved.state === "ok"
      ? "#00c853"
      : resolved.state === "error"
        ? "#ff5252"
        : "#9e9e9e";

  const label = (() => {
    if (checking) return t("mcpServers.statusChecking");
    if (resolved.state === "ok") return t("mcpServers.statusOk");
    if (resolved.state === "error") return t("mcpServers.statusError");
    return t("mcpServers.statusUnknown");
  })();

  const meta: string[] = [];
  if (resolved.toolCount !== undefined) {
    meta.push(
      t("mcpServers.statusToolCount", { count: resolved.toolCount }),
    );
  }
  if (resolved.checkedAt) {
    meta.push(
      t("mcpServers.statusLastChecked", {
        timestamp: new Date(resolved.checkedAt).toLocaleTimeString(),
      }),
    );
  }
  if (resolved.state === "error" && resolved.error) {
    meta.push(resolved.error);
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
