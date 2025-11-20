import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CreatePresetRequest,
  Preset,
  PresetKind,
  UpdatePresetRequest,
} from "../../api/presets";
import {
  createPreset,
  deletePreset,
  listPresets,
  updatePreset,
} from "../../api/presets";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyCreateForm: CreatePresetRequest = {
  title: "",
  description: "",
  kind: "static_text",
  content: "",
  builtIn: false,
};

export function PresetsPage() {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [createForm, setCreateForm] =
    useState<CreatePresetRequest>(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<UpdatePresetRequest>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [filterKind, setFilterKind] =
    useState<PresetKind | "all">("all");
  const [filterBuiltIn, setFilterBuiltIn] =
    useState<"all" | "true" | "false">("all");
  const [titleSearch, setTitleSearch] = useState("");

  useEffect(() => {
    void loadPresets();
  }, [filterKind, filterBuiltIn, titleSearch]);

  async function loadPresets() {
    setState({ loading: true, error: null });
    try {
      const params: Record<string, unknown> = {};
      if (filterKind !== "all") params.kind = filterKind;
      if (filterBuiltIn === "true") params.builtIn = true;
      if (filterBuiltIn === "false") params.builtIn = false;
      if (titleSearch.trim() !== "") {
        params.titleContains = titleSearch.trim();
      }
      const data = await listPresets(
        params as unknown as {
          kind?: PresetKind;
          builtIn?: boolean;
          titleContains?: string;
        },
      );
      setPresets(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load presets",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreatePreset(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createPreset(createForm);
      setCreateForm(emptyCreateForm);
      await loadPresets();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create preset",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePreset(id: string) {
    const confirmed = window.confirm(
      t("presets.deleteConfirm"),
    );
    if (!confirmed) return;
    try {
      await deletePreset(id);
      await loadPresets();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete preset",
      }));
    }
  }

  function startEdit(preset: Preset) {
    setEditingId(preset.id);
    setEditForm({
      title: preset.title,
      description: preset.description,
      content: preset.content,
      builtIn: preset.builtIn,
    });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updatePreset(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      await loadPresets();
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : "Failed to update preset",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  const filteredPresets = presets;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("presets.filtersTitle")}
        </h3>
        <div className="flex-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="preset-kind">
              {t("presets.filtersKindLabel")}
            </label>
            <select
              id="preset-kind"
              value={filterKind}
              onChange={(e) =>
                setFilterKind(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as PresetKind),
                )
              }
            >
              <option value="all">
                {t("presets.filtersKindAll")}
              </option>
              <option value="static_text">
                {t("presets.filtersKindStaticText")}
              </option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="preset-built-in">
              {t("presets.filtersBuiltInLabel")}
            </label>
            <select
              id="preset-built-in"
              value={filterBuiltIn}
              onChange={(e) =>
                setFilterBuiltIn(
                  e.target.value as "all" | "true" | "false",
                )
              }
            >
              <option value="all">
                {t("presets.filtersBuiltInAll")}
              </option>
              <option value="true">
                {t("presets.filtersBuiltInTrue")}
              </option>
              <option value="false">
                {t("presets.filtersBuiltInFalse")}
              </option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 2 }}>
            <label htmlFor="preset-search">
              {t("presets.filtersTitleContainsLabel")}
            </label>
            <input
              id="preset-search"
              type="text"
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("presets.newTitle")}
        </h3>
        <form onSubmit={handleCreatePreset}>
          <div className="flex-row">
            <div className="input-group" style={{ flex: 1 }}>
              <label htmlFor="preset-title">
                {t("presets.newFormTitleLabel")}
              </label>
              <input
                id="preset-title"
                type="text"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    title: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="input-group" style={{ width: 220 }}>
              <label htmlFor="preset-kind-new">
                {t("presets.newFormKindLabel")}
              </label>
              <select
                id="preset-kind-new"
                value={createForm.kind}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    kind: e.target.value as PresetKind,
                  })
                }
              >
                <option value="static_text">
                  {t("presets.filtersKindStaticText")}
                </option>
              </select>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="preset-description">
              {t("presets.newFormDescriptionLabel")}
            </label>
            <textarea
              id="preset-description"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  description: e.target.value,
                })
              }
            />
          </div>
          {createForm.kind === "static_text" && (
            <div className="input-group">
              <label htmlFor="preset-content">
                {t("presets.newFormContentLabel")}
              </label>
              <textarea
                id="preset-content"
                value={createForm.content ?? ""}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    content: e.target.value,
                  })
                }
              />
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating
              ? t("presets.newCreateButtonCreating")
              : t("presets.newCreateButton")}
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
        <h3 style={{ marginTop: 0 }}>
          {t("presets.listTitle")}
        </h3>
        {state.loading && (
          <div>{t("presets.listLoading")}</div>
        )}
        {state.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("presets.listTableTitle")}</th>
              <th>{t("presets.listTableKind")}</th>
              <th>{t("presets.listTableDescription")}</th>
              <th>{t("presets.listTableBuiltIn")}</th>
              <th>{t("presets.listTableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredPresets.map((preset) => (
              <tr key={preset.id}>
                <td>{preset.title}</td>
                <td>{preset.kind}</td>
                <td>{preset.description}</td>
                <td>
                  {preset.builtIn
                    ? t("presets.listBuiltInYes")
                    : t("presets.listBuiltInNo")}
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
                      onClick={() => startEdit(preset)}
                    >
                      {t("presets.listEditButton")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDeletePreset(preset.id)
                      }
                    >
                      {t("presets.listDeleteButton")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPresets.length === 0 && !state.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    {t("presets.listEmpty")}
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
              {t("presets.editTitle")}
            </h4>
            <div className="input-group">
              <label htmlFor="edit-title">
                {t("presets.editFormTitleLabel")}
              </label>
              <input
                id="edit-title"
                type="text"
                value={editForm.title ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    title: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-description">
                {t("presets.editFormDescriptionLabel")}
              </label>
              <textarea
                id="edit-description"
                value={editForm.description ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-content">
                {t("presets.editFormContentLabel")}
              </label>
              <textarea
                id="edit-content"
                value={editForm.content ?? ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    content: e.target.value,
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
                ? t("presets.editSaveButtonSaving")
                : t("presets.editSaveButton")}
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
              {t("presets.editCancelButton")}
            </button>
            {editError && (
              <div
                className="badge badge-error"
                style={{ marginTop: "0.5rem" }}
              >
                {t("common.errorPrefix")} {editError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
