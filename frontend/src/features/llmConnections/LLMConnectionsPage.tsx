import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      t("llmConnections.deleteConfirm"),
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

  // Inline toggle for enabled state in the list
  async function toggleConnectionEnabled(id: string, enabled: boolean) {
    // optimistic UI update
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isEnabled: enabled } : c,
      ),
    );
    try {
      await updateLLMConnection(id, { isEnabled: enabled });
    } catch (err) {
      // revert on error
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isEnabled: !enabled } : c,
        ),
      );
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update connection",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("llmConnections.newTitle")}
        </h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="conn-name">
              {t("llmConnections.newNameLabel")}
            </label>
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
            <label htmlFor="conn-base-url">
              {t("llmConnections.newBaseUrlLabel")}
            </label>
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
            <label htmlFor="conn-model">
              {t("llmConnections.newDefaultModelLabel")}
            </label>
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
            <label htmlFor="conn-api-key">
              {t("llmConnections.newApiKeyLabel")}
            </label>
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating
              ? t("llmConnections.newCreateButtonCreating")
              : t("llmConnections.newCreateButton")}
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
          {t("llmConnections.listTitle")}
        </h3>
        {state.loading && (
          <div>{t("llmConnections.listLoading")}</div>
        )}
        {state.error && (
          <div className="badge">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("llmConnections.listTableName")}</th>
              <th>{t("llmConnections.listTableProvider")}</th>
              <th>{t("llmConnections.listTableBaseUrl")}</th>
              <th>
                {t("llmConnections.listTableDefaultModel")}
              </th>
              <th>{t("llmConnections.listTableEnabled")}</th>
              <th>{t("llmConnections.listTableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((conn) => (
              <tr key={conn.id}>
                <td>{conn.name}</td>
                <td>{conn.provider}</td>
                <td>{conn.baseUrl}</td>
                <td>{conn.defaultModel}</td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={conn.isEnabled}
                      onChange={(e) =>
                        void toggleConnectionEnabled(
                          conn.id,
                          e.target.checked,
                        )
                      }
                    />{" "}
                    {conn.isEnabled
                      ? t("llmConnections.listYes")
                      : t("llmConnections.listNo")}
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
                      onClick={() => startEdit(conn)}
                    >
                      {t("llmConnections.listEditButton")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDelete(conn.id)
                      }
                    >
                      {t("llmConnections.listDeleteButton")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {connections.length === 0 && !state.loading && (
              <tr>
                <td colSpan={6}>
                  <span style={{ opacity: 0.8 }}>
                    {t("llmConnections.listEmpty")}
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
              {t("llmConnections.editTitle")}
            </h4>
            <div className="input-group">
              <label htmlFor="edit-name">
                {t("llmConnections.editNameLabel")}
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
              <label htmlFor="edit-base-url">
                {t("llmConnections.editBaseUrlLabel")}
              </label>
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
              <label htmlFor="edit-model">
                {t("llmConnections.editDefaultModelLabel")}
              </label>
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
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit
                ? t("llmConnections.editSaveButtonSaving")
                : t("llmConnections.editSaveButton")}
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
              {t("llmConnections.editCancelButton")}
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

