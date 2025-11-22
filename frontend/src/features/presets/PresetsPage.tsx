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
import { useScrollToBottom } from "../../hooks/useScrollToBottom";
import { PresetEditForm } from "./components/PresetEditForm";

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
  const { bottomRef, scrollToBottom } = useScrollToBottom();
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

  async function handleCreatePreset() {
    if (!createForm.title.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createPreset(createForm);
      setCreateForm(emptyCreateForm);
      await loadPresets();
      scrollToBottom();
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
    // Toggle editor if clicking the same preset again
    if (editingId === preset.id) {
      setEditingId(null);
      setEditForm({});
      setEditError(null);
      return;
    }

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
        <PresetEditForm
          form={createForm}
          onChange={setCreateForm}
          onSave={() => void handleCreatePreset()}
          onCancel={() => { }}
          saving={creating}
          error={createError}
          isEditing={false}
        />
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
              <>
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
                {editingId === preset.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0 }}>
                      <PresetEditForm
                        form={editForm}
                        onChange={setEditForm}
                        onSave={() => void saveEdit()}
                        onCancel={() => {
                          setEditingId(null);
                          setEditForm({});
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
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

