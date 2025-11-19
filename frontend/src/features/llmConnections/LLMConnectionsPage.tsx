import { useEffect, useState } from "react";
import type {
  CreateLLMConnectionRequest,
  LLMConnection,
  LLMProvider,
  UpdateLLMConnectionRequest,
} from "../../api/llmConnections";
import {
  createLLMConnection,
  deleteLLMConnection,
  listLLMConnections,
  updateLLMConnection,
} from "../../api/llmConnections";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyForm: CreateLLMConnectionRequest = {
  name: "",
  provider: "openai_compatible",
  baseUrl: "",
  defaultModel: "",
  apiKey: "",
  isEnabled: true,
};

export function LLMConnectionsPage() {
  const [connections, setConnections] = useState<LLMConnection[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [form, setForm] =
    useState<CreateLLMConnectionRequest>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<UpdateLLMConnectionRequest>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    void loadConnections();
  }, []);

  async function loadConnections() {
    setState({ loading: true, error: null });
    try {
      const data = await listLLMConnections();
      setConnections(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load LLM connections",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createLLMConnection(form);
      setForm(emptyForm);
      await loadConnections();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create connection",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this LLM connection? Chats using it may fail.",
    );
    if (!confirmed) return;
    try {
      await deleteLLMConnection(id);
      await loadConnections();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete connection",
      }));
    }
  }

  function startEdit(conn: LLMConnection) {
    setEditingId(conn.id);
    const patch: UpdateLLMConnectionRequest = {
      name: conn.name,
      provider: conn.provider as LLMProvider,
      baseUrl: conn.baseUrl,
      defaultModel: conn.defaultModel,
      isEnabled: conn.isEnabled,
    };
    setEditForm(patch);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateLLMConnection(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      await loadConnections();
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : "Failed to update connection",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>New Connection</h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="conn-name">Name</label>
            <input
              id="conn-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="conn-base-url">Base URL</label>
            <input
              id="conn-base-url"
              type="text"
              value={form.baseUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  baseUrl: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="conn-model">Default model</label>
            <input
              id="conn-model"
              type="text"
              value={form.defaultModel}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultModel: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="conn-api-key">API key</label>
            <input
              id="conn-api-key"
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm({
                  ...form,
                  apiKey: e.target.value,
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
            {creating ? "Creating…" : "Create Connection"}
          </button>
          {createError && (
            <div className="badge" style={{ marginTop: "0.5rem" }}>
              Error: {createError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Connections</h3>
        {state.loading && <div>Loading connections…</div>}
        {state.error && (
          <div className="badge">Error: {state.error}</div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Base URL</th>
              <th>Default model</th>
              <th>Enabled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn) => (
              <tr key={conn.id}>
                <td>{conn.name}</td>
                <td>{conn.provider}</td>
                <td>{conn.baseUrl}</td>
                <td>{conn.defaultModel}</td>
                <td>{conn.isEnabled ? "Yes" : "No"}</td>
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
                      onClick={() => startEdit(conn)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDelete(conn.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {connections.length === 0 && !state.loading && (
              <tr>
                <td colSpan={6}>
                  <span style={{ opacity: 0.8 }}>
                    No LLM connections configured.
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
            <h4 style={{ marginTop: 0 }}>Edit connection</h4>
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
              <label htmlFor="edit-base-url">Base URL</label>
              <input
                id="edit-base-url"
                type="text"
                value={editForm.baseUrl ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    baseUrl: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-model">Default model</label>
              <input
                id="edit-model"
                type="text"
                value={editForm.defaultModel ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    defaultModel: e.target.value,
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

