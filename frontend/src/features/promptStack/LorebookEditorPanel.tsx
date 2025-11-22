import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getLorebook,
  updateLorebook,
  listLorebookEntries,
  createLorebookEntry,
  updateLorebookEntry,
  deleteLorebookEntry,
  type Lorebook,
  type LorebookEntry,
  type CreateLorebookEntryRequest,
} from "../../api/lorebooks";
import { ApiError } from "../../api/httpClient";
import { Toggle } from "../../components/common/Toggle";

interface LorebookEditorPanelProps {
  lorebookId: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

type ViewMode = "list" | "edit" | "create";

export function LorebookEditorPanel({
  lorebookId,
  onSaved,
  onCancel,
}: LorebookEditorPanelProps) {
  const { t } = useTranslation();
  const [lorebook, setLorebook] = useState<Lorebook | null>(
    null,
  );
  const [entries, setEntries] = useState<LorebookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>("list");
  const [editingEntryId, setEditingEntryId] = useState<
    string | null
  >(null);

  const [metaForm, setMetaForm] = useState<{
    name: string;
    description: string;
  }>({ name: "", description: "" });
  const [entryForm, setEntryForm] =
    useState<CreateLorebookEntryRequest>({
      keywords: [],
      content: "",
      insertionOrder: 0,
      isEnabled: true,
    });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lorebookId) {
      void loadData(lorebookId);
      setView("list");
    }
  }, [lorebookId]);

  async function loadData(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [lb, ents] = await Promise.all([
        getLorebook(id),
        listLorebookEntries(id),
      ]);
      setLorebook(lb);
      setEntries(ents);
      setMetaForm({
        name: lb.name,
        description: lb.description,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load lorebook",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMeta() {
    if (!lorebookId) return;
    setSaving(true);
    try {
      const updated = await updateLorebook(
        lorebookId,
        metaForm,
      );
      setLorebook(updated);
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update lorebook",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEntry() {
    if (!lorebookId) return;
    setSaving(true);
    try {
      if (view === "create") {
        const nextOrder =
          entries.length > 0
            ? Math.max(
              ...entries.map((e) => e.insertionOrder),
            ) + 1
            : 0;
        await createLorebookEntry(lorebookId, {
          ...entryForm,
          insertionOrder: nextOrder,
        });
      } else if (view === "edit" && editingEntryId) {
        await updateLorebookEntry(editingEntryId, entryForm);
      }
      await loadData(lorebookId);
      setView("list");
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to save entry",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    if (
      !confirm(
        t("lorebooks.entriesDeleteConfirm") ||
        "Delete this entry?",
      )
    )
      return;
    try {
      await deleteLorebookEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
      if (onSaved) onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete entry",
      );
    }
  }

  function startEdit(entry: LorebookEntry) {
    setEditingEntryId(entry.id);
    setEntryForm({
      keywords: entry.keywords,
      content: entry.content,
      insertionOrder: entry.insertionOrder,
      isEnabled: entry.isEnabled,
    });
    setView("edit");
  }

  function startCreate() {
    setEntryForm({
      keywords: [],
      content: "",
      insertionOrder: 0,
      isEnabled: true,
    });
    setView("create");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>
          {view === "list"
            ? t("lorebooks.editTitle") ||
            "Edit Lorebook"
            : view === "create"
              ? t("lorebooks.newEntryTitle") ||
              "New Entry"
              : t("lorebooks.editEntryTitle") ||
              "Edit Entry"}
        </h4>
        {onCancel && (
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
          >
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div>
          {t("common.loading") || "Loading..."}
        </div>
      )}
      {error && (
        <div
          className="badge badge-error"
          style={{ marginBottom: "0.5rem" }}
        >
          {t("common.errorPrefix")} {error}
        </div>
      )}

      {!loading && lorebook && (
        <>
          {view === "list" ? (
            <>
              <div
                className="card"
                style={{ padding: "1rem", margin: 0 }}
              >
                <div className="input-group">
                  <label>
                    {t(
                      "lorebooks.detailNameLabel",
                    ) || "Name"}
                  </label>
                  <input
                    type="text"
                    value={metaForm.name}
                    onChange={(e) =>
                      setMetaForm({
                        ...metaForm,
                        name: e.target.value,
                      })
                    }
                    onBlur={() =>
                      void handleSaveMeta()
                    }
                  />
                </div>
                <div
                  className="input-group"
                  style={{ marginBottom: 0 }}
                >
                  <label>
                    {t(
                      "lorebooks.detailDescriptionLabel",
                    ) || "Description"}
                  </label>
                  <textarea
                    value={metaForm.description}
                    onChange={(e) =>
                      setMetaForm({
                        ...metaForm,
                        description:
                          e.target.value,
                      })
                    }
                    onBlur={() =>
                      void handleSaveMeta()
                    }
                    rows={2}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>
                  {t("lorebooks.entriesTitle") ||
                    "Entries"}{" "}
                  ({entries.length})
                </strong>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startCreate}
                  style={{
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.85rem",
                  }}
                >
                  + {t("common.add") || "Add"}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="card"
                    style={{
                      padding: "0.75rem",
                      margin: 0,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        startEdit(entry)
                      }
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          marginBottom:
                            "0.25rem",
                        }}
                      >
                        {entry.keywords.join(
                          ", ",
                        ) || (
                            <span
                              style={{
                                opacity: 0.5,
                              }}
                            >
                              (No keywords)
                            </span>
                          )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          opacity: 0.7,
                          whiteSpace:
                            "nowrap",
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                      >
                        {entry.content}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      style={{
                        width: "24px",
                        height: "24px",
                        color:
                          "var(--error-text)",
                      }}
                      onClick={() =>
                        void handleDeleteEntry(
                          entry.id,
                        )
                      }
                    >
                      🗑
                    </button>
                  </div>
                ))}
                {entries.length === 0 && (
                  <div
                    style={{
                      opacity: 0.5,
                      textAlign: "center",
                      padding: "1rem",
                    }}
                  >
                    {t("lorebooks.noEntries") ||
                      "No entries"}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div className="input-group">
                <label>
                  {t(
                    "lorebooks.newEntryKeywordsLabel",
                  ) ||
                    "Keywords (comma separated)"}
                </label>
                <input
                  type="text"
                  value={entryForm.keywords.join(
                    ", ",
                  )}
                  onChange={(e) =>
                    setEntryForm({
                      ...entryForm,
                      keywords: e.target.value
                        .split(",")
                        .map((k) =>
                          k.trim(),
                        )
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. hero, sword, magic"
                />
              </div>
              <div className="input-group">
                <label>
                  {t(
                    "lorebooks.newEntryContentLabel",
                  ) || "Content"}
                </label>
                <textarea
                  value={entryForm.content}
                  onChange={(e) =>
                    setEntryForm({
                      ...entryForm,
                      content: e.target.value,
                    })
                  }
                  rows={6}
                />
              </div>
              <div className="input-group">
                <Toggle
                  checked={entryForm.isEnabled ?? false}
                  onChange={(checked) =>
                    setEntryForm({
                      ...entryForm,
                      isEnabled: checked,
                    })
                  }
                  label={
                    t("lorebooks.editEntryEnabledLabel") || "Enabled"
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() => setView("list")}
                >
                  {t("common.cancel") ||
                    "Cancel"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() =>
                    void handleSaveEntry()
                  }
                  disabled={saving}
                >
                  {saving
                    ? t("common.saving") ||
                    "Saving..."
                    : t("common.save") ||
                    "Save"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

