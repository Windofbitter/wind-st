import { useEffect, useState } from "react";
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
      "Delete this MCP server configuration?",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>New MCP Server</h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="mcp-name">Name</label>
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
            <label htmlFor="mcp-command">Command</label>
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
            <label htmlFor="mcp-args">Args (space-separated)</label>
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
              Env (KEY=VALUE, comma-separated)
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
          <div className="input-group">
            <label>
              <input
                type="checkbox"
                checked={form.isEnabled ?? true}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isEnabled: e.target.checked,
                  })
                }
              />{" "}
              Enabled
            </label>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating ? "Creating…" : "Create MCP Server"}
          </button>
          {createError && (
            <div className="badge" style={{ marginTop: "0.5rem" }}>
              Error: {createError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>MCP Servers</h3>
        {state.loading && <div>Loading MCP servers…</div>}
        {state.error && (
          <div className="badge">Error: {state.error}</div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Command</th>
              <th>Args</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <tr key={server.id}>
                <td>{server.name}</td>
                <td>{server.command}</td>
                <td>{server.args.join(" ")}</td>
                <td>{server.isEnabled ? "Yes" : "No"}</td>
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
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDelete(server.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {servers.length === 0 && !state.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    No MCP servers configured.
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
            <h4 style={{ marginTop: 0 }}>Edit MCP server</h4>
            <div className="input-group">
              <label htmlFor="edit-name">Name</label>
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
              <label htmlFor="edit-command">Command</label>
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
              <label htmlFor="edit-args">Args</label>
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
              <label htmlFor="edit-env">Env</label>
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
            <div className="input-group">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.isEnabled ?? true}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      isEnabled: e.target.checked,
                    })
                  }
                />{" "}
                Enabled
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit ? "Saving…" : "Save Changes"}
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
              Cancel
            </button>
            {editError && (
              <div className="badge" style={{ marginTop: "0.5rem" }}>
                Error: {editError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

