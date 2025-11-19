import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type {
  Character,
  CreateCharacterRequest,
} from "../../api/characters";
import {
  createCharacter,
  deleteCharacter,
  listCharacters,
} from "../../api/characters";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyForm: CreateCharacterRequest = {
  name: "",
  description: "",
  persona: "",
  avatarPath: "",
  creatorNotes: null,
};

export function CharactersListPage() {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [form, setForm] =
    useState<CreateCharacterRequest>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadCharacters();
  }, []);

  async function loadCharacters() {
    setState({ loading: true, error: null });
    try {
      const data = await listCharacters();
      setCharacters(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load characters",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreateCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createCharacter(form);
      setForm(emptyForm);
      await loadCharacters();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create character",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCharacter(id: string) {
    const confirmed = window.confirm(
      t("characters.listDeleteConfirm"),
    );
    if (!confirmed) return;

    try {
      await deleteCharacter(id);
      await loadCharacters();
    } catch (err) {
      // We keep the list stale on failure but surface the error.
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete character",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("characters.listNewTitle")}
        </h3>
        <form onSubmit={handleCreateCharacter}>
          <div className="input-group">
            <label htmlFor="char-name">
              {t("characters.listNameLabel")}
            </label>
            <input
              id="char-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-description">
              {t("characters.listDescriptionLabel")}
            </label>
            <textarea
              id="char-description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-avatar">
              {t("characters.listAvatarPathLabel")}
            </label>
            <input
              id="char-avatar"
              type="text"
              value={form.avatarPath}
              onChange={(e) =>
                setForm({
                  ...form,
                  avatarPath: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-persona">
              {t("characters.listPersonaLabel")}
            </label>
            <textarea
              id="char-persona"
              value={form.persona}
              onChange={(e) =>
                setForm({
                  ...form,
                  persona: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="char-notes">
              {t("characters.listCreatorNotesLabel")}
            </label>
            <textarea
              id="char-notes"
              value={form.creatorNotes ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  creatorNotes: e.target.value || null,
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
              ? t("characters.listCreateButtonCreating")
              : t("characters.listCreateButton")}
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
          {t("characters.listTitle")}
        </h3>
        {state.loading && (
          <div>{t("characters.listLoading")}</div>
        )}
        {state.error && (
          <div className="badge">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("characters.listNameLabel")}</th>
              <th>{t("characters.listDescriptionLabel")}</th>
              <th>{t("characters.listTableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.description}</td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <Link
                      to={`/characters/${c.id}`}
                      className="btn btn-primary"
                    >
                      {t("characters.listEditButton")}
                    </Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDeleteCharacter(c.id)
                      }
                    >
                      {t("characters.listDeleteButton")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {characters.length === 0 && !state.loading && (
              <tr>
                <td colSpan={3}>
                  <span style={{ opacity: 0.8 }}>
                    {t("characters.listEmpty")}
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

