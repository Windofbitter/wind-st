import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MCPServer, UpdateMCPServerRequest } from "../../api/mcpServers";
import { updateMCPServer } from "../../api/mcpServers";
import { ApiError } from "../../api/httpClient";

interface MCPServerEditPanelProps {
  server: MCPServer;
  onSaved(): Promise<void> | void;
  onClose(): void;
}

export function MCPServerEditPanel({
  server,
  onSaved,
  onClose,
}: MCPServerEditPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<UpdateMCPServerRequest>(() => ({
    name: server.name,
    command: server.command,
    args: server.args,
    env: server.env,
    isEnabled: server.isEnabled,
  }));
  const [argsText, setArgsText] = useState(() =>
    (server.args ?? []).join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env,
      isEnabled: server.isEnabled,
    });
    setArgsText((server.args ?? []).join("\n"));
  }, [server]);

  function parseArgs(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((a) => a.trim())
      .filter(Boolean);
  }

  function parseEnv(value: string): Record<string, string> {
    const env: Record<string, string> = {};
    value
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split("=").map((s) => s.trim());
        if (k && v !== undefined) env[k] = v;
      });
    return env;
  }

  function stringifyEnv(env: Record<string, string>): string {
    return Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateMCPServer(server.id, form);
      await onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update MCP server",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: "1rem", backgroundColor: "#1a1a1a" }}>
      <h4 style={{ marginTop: 0 }}>{t("mcpServers.editTitle")}</h4>
      <div className="input-group">
        <label htmlFor="edit-name">{t("mcpServers.editNameLabel")}</label>
        <input
          id="edit-name"
          type="text"
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="input-group">
        <label htmlFor="edit-command">{t("mcpServers.editCommandLabel")}</label>
        <input
          id="edit-command"
          type="text"
          placeholder={t("mcpServers.commandExample")}
          value={form.command ?? ""}
          onChange={(e) => setForm({ ...form, command: e.target.value })}
        />
        <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
          {t("mcpServers.commandExample")}
        </div>
      </div>
      <div className="input-group">
        <label htmlFor="edit-args">{t("mcpServers.editArgsLabel")}</label>
        <textarea
          id="edit-args"
          rows={4}
          value={argsText}
          onChange={(e) => {
            const value = e.target.value;
            setArgsText(value);
            setForm({
              ...form,
              args: parseArgs(value),
            });
          }}
          placeholder={t("mcpServers.argsExample")}
        />
      </div>
      <div className="input-group">
        <label htmlFor="edit-env">{t("mcpServers.editEnvLabel")}</label>
        <input
          id="edit-env"
          type="text"
          value={stringifyEnv(form.env ?? {})}
          onChange={(e) =>
            setForm({
              ...form,
              env: parseEnv(e.target.value),
            })
          }
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving
          ? t("mcpServers.editSaveButtonSaving")
          : t("mcpServers.editSaveButton")}
      </button>
      <button
        type="button"
        className="btn"
        style={{ marginLeft: "0.5rem" }}
        onClick={onClose}
      >
        {t("mcpServers.editCancelButton")}
      </button>
      {error && (
        <div
          className="badge badge-error"
          style={{ marginTop: "0.5rem" }}
        >
          {t("common.errorPrefix")} {error}
        </div>
      )}
    </div>
  );
}
