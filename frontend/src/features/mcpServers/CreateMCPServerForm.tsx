import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { CreateMCPServerRequest } from "../../api/mcpServers";
import { createMCPServer } from "../../api/mcpServers";
import { ApiError } from "../../api/httpClient";

const emptyForm: CreateMCPServerRequest = {
  name: "",
  command: "",
  args: [],
  env: {},
  isEnabled: true,
};

interface CreateMCPServerFormProps {
  onCreated(): Promise<void> | void;
}

export function CreateMCPServerForm({ onCreated }: CreateMCPServerFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateMCPServerRequest>(emptyForm);
  const [argsText, setArgsText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.command.trim()) return;

    setCreating(true);
    setError(null);

    try {
      await createMCPServer({ ...form, args: form.args, env: form.env });
      setForm(emptyForm);
      setArgsText("");
      await onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to create MCP server",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{t("mcpServers.newTitle")}</h3>
      <form onSubmit={handleCreate}>
        <div className="input-group">
          <label htmlFor="mcp-name">{t("mcpServers.newNameLabel")}</label>
          <input
            id="mcp-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="mcp-command">{t("mcpServers.newCommandLabel")}</label>
          <input
            id="mcp-command"
            type="text"
            value={form.command}
            onChange={(e) =>
              setForm({
                ...form,
                command: e.target.value,
              })
            }
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="mcp-args">{t("mcpServers.newArgsLabel")}</label>
          <textarea
            id="mcp-args"
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
            placeholder="One argument per line"
          />
        </div>
        <div className="input-group">
          <label htmlFor="mcp-env">{t("mcpServers.newEnvLabel")}</label>
          <input
            id="mcp-env"
            type="text"
            value={stringifyEnv(form.env)}
            onChange={(e) =>
              setForm({
                ...form,
                env: parseEnv(e.target.value),
              })
            }
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating}
        >
          {creating
            ? t("mcpServers.newCreateButtonCreating")
            : t("mcpServers.newCreateButton")}
        </button>
        {error && (
          <div className="badge" style={{ marginTop: "0.5rem" }}>
            {t("common.errorPrefix")} {error}
          </div>
        )}
      </form>
    </div>
  );
}
