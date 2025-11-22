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
import { Toggle } from "../../components/common/Toggle";
import { useScrollToBottom } from "../../hooks/useScrollToBottom";
import { UserPersonaEditForm } from "./components/UserPersonaEditForm";

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
  const { bottomRef, scrollToBottom } = useScrollToBottom();
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateFormState>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  async function handleCreate() {
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
      scrollToBottom();
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

  function startEdit(persona: UserPersona) {
    // Toggle editor if clicking the same persona again
    if (editingId === persona.id) {
      setEditingId(null);
      setEditForm(emptyForm);
      setEditError(null);
      return;
    }

    setEditingId(persona.id);
    setEditForm({
      name: persona.name,
      description: persona.description ?? "",
      prompt: persona.prompt ?? "",
      isDefault: persona.isDefault,
    });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateUserPersona(editingId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        prompt: editForm.prompt.trim() || null,
        isDefault: editForm.isDefault,
      });
      setEditingId(null);
      setEditForm(emptyForm);
      await loadPersonas();
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : "Failed to update persona",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <UserPersonaEditForm
          form={form}
          onChange={setForm}
          onSave={() => void handleCreate()}
          onCancel={() => { }}
          saving={creating}
          error={createError}
          isEditing={false}
        />
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
              <>
                <tr key={persona.id}>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      <span>{persona.name}</span>
                    </div>
                  </td>
                  <td>{persona.description ?? ""}</td>
                  <td>
                    <div style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>
                      {persona.prompt ?? ""}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <Toggle
                        checked={persona.isDefault}
                        onChange={() => {
                          if (!persona.isDefault) {
                            void handleSetDefault(persona.id);
                          }
                        }}
                        label={persona.isDefault ? t("userPersonas.defaultTag") : t("userPersonas.setDefaultButton")}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => startEdit(persona)}
                      >
                        {t("userPersonas.editButton")}
                      </button>
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
                {editingId === persona.id && (
                  <tr>
                    <td colSpan={4} style={{ padding: 0 }}>
                      <UserPersonaEditForm
                        form={editForm}
                        onChange={setEditForm}
                        onSave={() => void saveEdit()}
                        onCancel={() => {
                          setEditingId(null);
                          setEditForm(emptyForm);
                        }}
                        saving={savingEdit}
                        error={editError}
                        isEditing={true}
                      />
                    </td>
                  </tr>
                )}
              </>
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
      <div ref={bottomRef} />
    </div>
  );
}

