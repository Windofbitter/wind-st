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
import { LorebookEntryForm } from "./components/LorebookEntryForm";
import { LorebookMetaCard } from "./components/LorebookMetaCard";

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

  async function createEntry() {
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
      <LorebookMetaCard
        lorebook={lorebook}
        metaDraft={metaDraft}
        loading={lorebookState.loading}
        error={lorebookState.error}
        saving={savingMeta}
        onChange={setMetaDraft}
        onSave={() => void saveMeta()}
      />

      <div className="card">
        <LorebookEntryForm
          form={entryForm}
          onChange={setEntryForm}
          onSave={() => void createEntry()}
          onCancel={() => { }}
          saving={creatingEntry}
          error={entryError}
          isEditing={false}
        />
      </div>

      <LorebookEntriesTable
        entries={entries}
        loading={entriesState.loading}
        error={entriesState.error}
        editingId={editingEntryId}
        onReorder={(ids) => void reorderEntriesByIds(ids)}
        onToggleEnabled={(id, enabled) =>
          void toggleEntryEnabled(id, enabled)
        }
        onEdit={startEdit}
        onDelete={(id) => void deleteEntry(id)}
        renderEditor={() => (
          <LorebookEntryForm
            form={editEntryForm}
            onChange={setEditEntryForm}
            onSave={() => void saveEntryEdit()}
            onCancel={() => {
              setEditingEntryId(null);
              setEditEntryForm({});
            }}
            saving={savingEntry}
            error={entryError}
            isEditing={true}
          />
        )}
      />
    </div>
  );
}
