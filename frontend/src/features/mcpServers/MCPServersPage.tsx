import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CreateMCPServerRequest,
  MCPServer,
  UpdateMCPServerRequest,
} from "../../api/mcpServers";
import {
  createMCPServer,
  deleteMCPServer,
  listMCPServers,
  updateMCPServer,
} from "../../api/mcpServers";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyForm: CreateMCPServerRequest = {
  name: "",
  command: "",
  args: [],
  env: {},
  isEnabled: true,
};

export function MCPServersPage() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [form, setForm] =
    useState<CreateMCPServerRequest>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<UpdateMCPServerRequest>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    void loadServers();
  }, []);

  async function loadServers() {
    setState({ loading: true, error: null });
    try {
      const data = await listMCPServers();
      setServers(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load MCP servers",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.command.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const payload: CreateMCPServerRequest = {
        ...form,
        args: form.args,
        env: form.env,
      };
      await createMCPServer(payload);
      setForm(emptyForm);
      await loadServers();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create MCP server",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      t("mcpServers.deleteConfirm"),
    );
    if (!confirmed) return;
    try {
      await deleteMCPServer(id);
      await loadServers();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete MCP server",
      }));
    }
  }

  function startEdit(server: MCPServer) {
    setEditingId(server.id);
    const patch: UpdateMCPServerRequest = {
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env,
      isEnabled: server.isEnabled,
    };
    setEditForm(patch);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateMCPServer(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      await loadServers();
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : "Failed to update MCP server",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function parseArgs(value: string): string[] {
    return value
      .split(" ")
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

  // Inline toggle for enabled state in the list
  async function toggleServerEnabled(id: string, enabled: boolean) {
    // optimistic UI update
    setServers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isEnabled: enabled } : s,
      ),
    );
    try {
      await updateMCPServer(id, { isEnabled: enabled });
    } catch (err) {
      // revert on error
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isEnabled: !enabled } : s,
        ),
      );
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update MCP server",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("mcpServers.newTitle")}
        </h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="mcp-name">
              {t("mcpServers.newNameLabel")}
            </label>
            <input
              id="mcp-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="mcp-command">
              {t("mcpServers.newCommandLabel")}
            </label>
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
            <label htmlFor="mcp-args">
              {t("mcpServers.newArgsLabel")}
            </label>
            <input
              id="mcp-args"
              type="text"
              value={form.args.join(" ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  args: parseArgs(e.target.value),
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="mcp-env">
              {t("mcpServers.newEnvLabel")}
            </label>
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
          {createError && (
            <div className="badge" style={{ marginTop: "0.5rem" }}>
              {t("common.errorPrefix")} {createError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("mcpServers.listTitle")}
        </h3>
        {state.loading && (
          <div>{t("mcpServers.listLoading")}</div>
        )}
        {state.error && (
          <div className="badge">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("mcpServers.listTableName")}</th>
              <th>{t("mcpServers.listTableCommand")}</th>
              <th>{t("mcpServers.listTableArgs")}</th>
              <th>{t("mcpServers.listTableEnabled")}</th>
              <th>{t("mcpServers.listTableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <tr key={server.id}>
                <td>{server.name}</td>
                <td>{server.command}</td>
                <td>{server.args.join(" ")}</td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={server.isEnabled}
                      onChange={(e) =>
                        void toggleServerEnabled(
                          server.id,
                          e.target.checked,
                        )
                      }
                    />{" "}
                    {server.isEnabled
                      ? t("mcpServers.listYes")
                      : t("mcpServers.listNo")}
                  </label>
                </td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => startEdit(server)}
                    >
                      {t("mcpServers.listEditButton")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDelete(server.id)
                      }
                    >
                      {t("mcpServers.listDeleteButton")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {servers.length === 0 && !state.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    {t("mcpServers.listEmpty")}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {editingId && (
          <div
            className="card"
            style={{ marginTop: "1rem", backgroundColor: "#1a1a1a" }}
          >
            <h4 style={{ marginTop: 0 }}>
              {t("mcpServers.editTitle")}
            </h4>
            <div className="input-group">
              <label htmlFor="edit-name">
                {t("mcpServers.editNameLabel")}
              </label>
              <input
                id="edit-name"
                type="text"
                value={editForm.name ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-command">
                {t("mcpServers.editCommandLabel")}
              </label>
              <input
                id="edit-command"
                type="text"
                value={editForm.command ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    command: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-args">
                {t("mcpServers.editArgsLabel")}
              </label>
              <input
                id="edit-args"
                type="text"
                value={(editForm.args ?? []).join(" ")}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    args: parseArgs(e.target.value),
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-env">
                {t("mcpServers.editEnvLabel")}
              </label>
              <input
                id="edit-env"
                type="text"
                value={stringifyEnv(editForm.env ?? {})}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    env: parseEnv(e.target.value),
                  })
                }
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit
                ? t("mcpServers.editSaveButtonSaving")
                : t("mcpServers.editSaveButton")}
            </button>
            <button
              type="button"
              className="btn"
              style={{ marginLeft: "0.5rem" }}
              onClick={() => {
                setEditingId(null);
                setEditForm({});
              }}
            >
              {t("mcpServers.editCancelButton")}
            </button>
            {editError && (
              <div className="badge" style={{ marginTop: "0.5rem" }}>
                {t("common.errorPrefix")} {editError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

