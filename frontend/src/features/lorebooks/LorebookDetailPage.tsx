import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type {
  CreateLorebookEntryRequest,
  Lorebook,
  LorebookEntry,
  UpdateLorebookEntryRequest,
  UpdateLorebookRequest,
} from "../../api/lorebooks";
import {
  getLorebook,
  listLorebookEntries,
  updateLorebook,
  createLorebookEntry,
  updateLorebookEntry,
  deleteLorebookEntry,
} from "../../api/lorebooks";
import { ApiError } from "../../api/httpClient";
import { LorebookEntriesTable } from "./LorebookEntriesTable";
import { useScrollToBottom } from "../../hooks/useScrollToBottom";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyEntryForm: CreateLorebookEntryRequest = {
  keywords: [],
  content: "",
  insertionOrder: 0,
  isEnabled: true,
};

export function LorebookDetailPage() {
  const { lorebookId } = useParams<{ lorebookId: string }>();
  const { t } = useTranslation();
  const { bottomRef, scrollToBottom } = useScrollToBottom();

  const [lorebook, setLorebook] = useState<Lorebook | null>(null);
  const [lorebookState, setLorebookState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [entries, setEntries] = useState<LorebookEntry[]>([]);
  const [entriesState, setEntriesState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [metaDraft, setMetaDraft] =
    useState<UpdateLorebookRequest>({});
  const [savingMeta, setSavingMeta] = useState(false);

  const [entryForm, setEntryForm] =
    useState<CreateLorebookEntryRequest>(emptyEntryForm);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(
    null,
  );
  const [editEntryForm, setEditEntryForm] =
    useState<UpdateLorebookEntryRequest>({});
  const [savingEntry, setSavingEntry] = useState(false);

  useEffect(() => {
    if (!lorebookId) return;
    void loadLorebook(lorebookId);
    void loadEntries(lorebookId);
  }, [lorebookId]);

  useEffect(() => {
    if (editingEntryId) {
      scrollToBottom();
    }
  }, [editingEntryId]);

  async function loadLorebook(id: string) {
    setLorebookState({ loading: true, error: null });
    try {
      const data = await getLorebook(id);
      setLorebook(data);
      setMetaDraft({
        name: data.name,
        description: data.description,
      });
    } catch (err) {
      setLorebookState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load lorebook",
      });
      return;
    }
    setLorebookState({ loading: false, error: null });
  }

  async function loadEntries(id: string) {
    setEntriesState({ loading: true, error: null });
    try {
      const data = await listLorebookEntries(id);
      setEntries(data);
    } catch (err) {
      setEntriesState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load lorebook entries",
      });
      return;
    }
    setEntriesState({ loading: false, error: null });
  }

  async function saveMeta() {
    if (!lorebookId) return;
    setSavingMeta(true);
    try {
      const updated = await updateLorebook(lorebookId, metaDraft);
      setLorebook(updated);
    } catch (err) {
      setLorebookState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update lorebook",
      }));
    } finally {
      setSavingMeta(false);
    }
  }

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!lorebookId) return;
    if (!entryForm.content.trim()) return;
    setCreatingEntry(true);
    setEntryError(null);
    try {
      const nextOrder =
        entries.length > 0
          ? Math.max(
            ...entries.map((e) => e.insertionOrder),
          ) + 1
          : 0;
      const payload: CreateLorebookEntryRequest = {
        ...entryForm,
        insertionOrder: nextOrder,
        keywords:
          entryForm.keywords.length === 0 &&
            entryForm.content.trim() !== ""
            ? []
            : entryForm.keywords,
      };
      await createLorebookEntry(lorebookId, payload);
      setEntryForm(emptyEntryForm);
      await loadEntries(lorebookId);
      scrollToBottom();
    } catch (err) {
      setEntryError(
        err instanceof ApiError
          ? err.message
          : "Failed to create entry",
      );
    } finally {
      setCreatingEntry(false);
    }
  }

  function startEdit(entry: LorebookEntry) {
    setEditingEntryId(entry.id);
    setEditEntryForm({
      keywords: entry.keywords,
      content: entry.content,
      insertionOrder: entry.insertionOrder,
      isEnabled: entry.isEnabled,
    });
    setEntryError(null);
  }

  async function saveEntryEdit() {
    if (!editingEntryId) return;
    setSavingEntry(true);
    setEntryError(null);
    try {
      await updateLorebookEntry(editingEntryId, editEntryForm);
      setEditingEntryId(null);
      setEditEntryForm({});
      if (lorebookId) {
        await loadEntries(lorebookId);
      }
    } catch (err) {
      setEntryError(
        err instanceof ApiError
          ? err.message
          : "Failed to update entry",
      );
    } finally {
      setSavingEntry(false);
    }
  }

  async function deleteEntry(id: string) {
    const confirmed = window.confirm(
      t("lorebooks.entriesDeleteConfirm"),
    );
    if (!confirmed) return;
    try {
      await deleteLorebookEntry(id);
      if (lorebookId) {
        await loadEntries(lorebookId);
      }
    } catch (err) {
      setEntriesState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete entry",
      }));
    }
  }

  // Toggle entry active state inline
  async function toggleEntryEnabled(entryId: string, enabled: boolean) {
    try {
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, isEnabled: enabled } : e)),
      );
      await updateLorebookEntry(entryId, { isEnabled: enabled });
    } catch (err) {
      setEntriesState((s) => ({
        ...s,
        error:
          err instanceof ApiError ? err.message : "Failed to update entry state",
      }));
      if (lorebookId) {
        await loadEntries(lorebookId);
      }
    }
  }

  async function reorderEntriesByIds(ids: string[]) {
    if (ids.length !== entries.length) return;

    const byId = new Map(entries.map((e) => [e.id, e]));
    const reordered: LorebookEntry[] = [];

    for (const id of ids) {
      const entry = byId.get(id);
      if (!entry) {
        return;
      }
      reordered.push(entry);
    }

    const withOrder = reordered.map((e, index) => ({
      ...e,
      insertionOrder: index,
    }));

    setEntries(withOrder);
    try {
      await Promise.all(
        withOrder.map((e) =>
          updateLorebookEntry(e.id, { insertionOrder: e.insertionOrder }),
        ),
      );
    } catch (err) {
      setEntriesState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to reorder entries",
      }));
      if (lorebookId) {
        await loadEntries(lorebookId);
      }
    }
  }

  if (!lorebookId) {
    return <div>{t("lorebooks.detailMissingId")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("lorebooks.detailTitle")}
        </h3>
        {lorebookState.loading && (
          <div>{t("lorebooks.detailLoadingLorebook")}</div>
        )}
        {lorebookState.error && (
          <div className="badge badge-error">
            {t("common.errorPrefix")} {lorebookState.error}
          </div>
        )}
        {lorebook && (
          <>
            <div className="input-group">
              <label htmlFor="lb-name">
                {t("lorebooks.detailNameLabel")}
              </label>
              <input
                id="lb-name"
                type="text"
                value={metaDraft.name ?? ""}
                onChange={(e) =>
                  setMetaDraft({
                    ...metaDraft,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="input-group">
              <label htmlFor="lb-description">
                {t("lorebooks.detailDescriptionLabel")}
              </label>
              <textarea
                id="lb-description"
                value={metaDraft.description ?? ""}
                onChange={(e) =>
                  setMetaDraft({
                    ...metaDraft,
                    description: e.target.value,
                  })
                }
              />
            </div>
            {/* Scope removed; lorebooks are attached via prompt stack */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingMeta}
              onClick={() => void saveMeta()}
            >
              {savingMeta
                ? t("lorebooks.detailSaveButtonSaving")
                : t("lorebooks.detailSaveButton")}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("lorebooks.newEntryTitle")}
        </h3>
        <form onSubmit={createEntry}>
          <div className="input-group">
            <label htmlFor="entry-keywords">
              {t("lorebooks.newEntryKeywordsLabel")}
            </label>
            <input
              id="entry-keywords"
              type="text"
              placeholder={t(
                "lorebooks.newEntryKeywordsPlaceholder",
              )}
              value={entryForm.keywords.join(", ")}
              onChange={(e) =>
                setEntryForm({
                  ...entryForm,
                  keywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
            />
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
              {t("lorebooks.newEntryKeywordsHint")}
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="entry-content">
              {t("lorebooks.newEntryContentLabel")}
            </label>
            <textarea
              id="entry-content"
              value={entryForm.content}
              onChange={(e) =>
                setEntryForm({
                  ...entryForm,
                  content: e.target.value,
                })
              }
              rows={4}
            />
          </div>
          <div className="input-group">
            <label>
              <input
                type="checkbox"
                checked={entryForm.isEnabled}
                onChange={(e) =>
                  setEntryForm({
                    ...entryForm,
                    isEnabled: e.target.checked,
                  })
                }
              />{" "}
              {t("lorebooks.newEntryActiveLabel")}
            </label>
            <div
              style={{
                fontSize: "0.85rem",
                opacity: 0.8,
                marginTop: "0.25rem",
              }}
            >
              {t("lorebooks.newEntryActiveHint")}
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creatingEntry}
          >
            {creatingEntry
              ? t("lorebooks.newEntryCreateButtonCreating")
              : t("lorebooks.newEntryCreateButton")}
          </button>
          {entryError && (
            <div
              className="badge badge-error"
              style={{ marginTop: "0.5rem" }}
            >
              {t("common.errorPrefix")} {entryError}
            </div>
          )}
        </form>
      </div>

      <LorebookEntriesTable
        entries={entries}
        loading={entriesState.loading}
        error={entriesState.error}
        onReorder={(ids) => void reorderEntriesByIds(ids)}
        onToggleEnabled={(id, enabled) =>
          void toggleEntryEnabled(id, enabled)
        }
        onEdit={startEdit}
        onDelete={(id) => void deleteEntry(id)}
      />

      {editingEntryId && (
        <div
          className="card"
          style={{ marginTop: "1rem", backgroundColor: "#1a1a1a" }}
        >
          <h4 style={{ marginTop: 0 }}>
            {t("lorebooks.editEntryTitle")}
          </h4>
          <div className="input-group">
            <label htmlFor="edit-keywords">
              {t("lorebooks.editEntryKeywordsLabel")}
            </label>
            <input
              id="edit-keywords"
              type="text"
              value={(editEntryForm.keywords ?? []).join(", ")}
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  keywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="input-group">
            <label htmlFor="edit-content">
              {t("lorebooks.editEntryContentLabel")}
            </label>
            <textarea
              id="edit-content"
              rows={4}
              value={editEntryForm.content ?? ""}
              onChange={(e) =>
                setEditEntryForm({
                  ...editEntryForm,
                  content: e.target.value,
                })
              }
            />
          </div>
          <div className="input-group">
            <label>
              <input
                type="checkbox"
                checked={editEntryForm.isEnabled ?? true}
                onChange={(e) =>
                  setEditEntryForm({
                    ...editEntryForm,
                    isEnabled: e.target.checked,
                  })
                }
              />{" "}
              {t("lorebooks.editEntryEnabledLabel")}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={savingEntry}
            onClick={() => void saveEntryEdit()}
          >
            {savingEntry
              ? t("lorebooks.editEntrySaveButtonSaving")
              : t("lorebooks.editEntrySaveButton")}
          </button>
          <button
            type="button"
            className="btn"
            style={{ marginLeft: "0.5rem" }}
            onClick={() => {
              setEditingEntryId(null);
              setEditEntryForm({});
            }}
          >
            {t("lorebooks.editEntryCancelButton")}
          </button>
          {entryError && (
            <div
              className="badge badge-error"
              style={{ marginTop: "0.5rem" }}
            >
              {t("common.errorPrefix")} {entryError}
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
