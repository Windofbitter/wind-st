import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createUserPersona,
  deleteUserPersona,
  listUserPersonas,
  updateUserPersona,
  type UserPersona,
} from "../../api/userPersonas";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface CreateFormState {
  name: string;
  description: string;
  prompt: string;
  isDefault: boolean;
}

const emptyForm: CreateFormState = {
  name: "",
  description: "",
  prompt: "",
  isDefault: false,
};

export function UserPersonasPage() {
  const { t } = useTranslation();
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void loadPersonas();
  }, []);

  async function loadPersonas() {
    setState({ loading: true, error: null });
    try {
      const data = await listUserPersonas();
      setPersonas(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load personas",
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
      await createUserPersona({
        name: form.name.trim(),
        description: form.description.trim() || null,
        prompt: form.prompt.trim() || null,
        isDefault: form.isDefault,
      });
      setForm(emptyForm);
      await loadPersonas();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create persona",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(t("userPersonas.deleteConfirm"));
    if (!confirmed) return;
    try {
      await deleteUserPersona(id);
      await loadPersonas();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete persona",
      }));
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await updateUserPersona(id, { isDefault: true });
      await loadPersonas();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update persona",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("userPersonas.newTitle")}</h3>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="persona-name">
              {t("userPersonas.nameLabel")}
            </label>
            <input
              id="persona-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="persona-description">
              {t("userPersonas.descriptionLabel")}
            </label>
            <textarea
              id="persona-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="persona-prompt">
              {t("userPersonas.promptLabel")}
            </label>
            <textarea
              id="persona-prompt"
              value={form.prompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, prompt: e.target.value }))
              }
            />
          </div>
          <div className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
            <input
              id="persona-default"
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDefault: e.target.checked }))
              }
            />
            <label htmlFor="persona-default">
              {t("userPersonas.isDefaultLabel")}
            </label>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating
              ? t("userPersonas.createButtonCreating")
              : t("userPersonas.createButton")}
          </button>
          {createError && (
            <div
              className="badge badge-error"
              style={{ marginTop: "0.5rem" }}
            >
              {t("common.errorPrefix")} {createError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("userPersonas.listTitle")}</h3>
        {state.loading && <div>{t("common.loadingConfig")}</div>}
        {state.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("userPersonas.nameLabel")}</th>
              <th>{t("userPersonas.descriptionLabel")}</th>
              <th>{t("userPersonas.promptLabel")}</th>
              <th>{t("userPersonas.listActions")}</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((persona) => (
              <tr key={persona.id}>
                <td>
                  <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                    <span>{persona.name}</span>
                    {persona.isDefault && (
                      <span className="badge">{t("userPersonas.defaultTag")}</span>
                    )}
                  </div>
                </td>
                <td>{persona.description ?? ""}</td>
                <td>
                  <div style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                    {persona.prompt ?? ""}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {!persona.isDefault && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void handleSetDefault(persona.id)}
                      >
                        {t("userPersonas.setDefaultButton")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void handleDelete(persona.id)}
                    >
                      {t("userPersonas.deleteButton")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {personas.length === 0 && !state.loading && (
              <tr>
                <td colSpan={4}>
                  <span style={{ opacity: 0.8 }}>
                    {t("userPersonas.listEmpty")}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
