import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
        isGlobal: data.isGlobal,
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
    const confirmed = window.confirm("Delete this entry?");
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

  // Move entry up/down by delta (-1 or +1) and persist sequential order
  async function moveEntry(entryId: string, delta: -1 | 1) {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return;
    const newIndex = idx + delta;
    if (newIndex < 0 || newIndex >= entries.length) return;

    const reordered = entries.slice();
    const [item] = reordered.splice(idx, 1);
    reordered.splice(newIndex, 0, item);

    // optimistic UI
    setEntries(reordered.map((e, i) => ({ ...e, insertionOrder: i })));
    try {
      await Promise.all(
        reordered.map((e, i) => updateLorebookEntry(e.id, { insertionOrder: i })),
      );
    } catch (err) {
      setEntriesState((s) => ({
        ...s,
        error:
          err instanceof ApiError ? err.message : "Failed to reorder entries",
      }));
      if (lorebookId) {
        await loadEntries(lorebookId);
      }
    }
  }

  if (!lorebookId) {
    return <div>Lorebook ID is missing.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lorebook</h3>
        {lorebookState.loading && <div>Loading lorebook…</div>}
        {lorebookState.error && (
          <div className="badge">Error: {lorebookState.error}</div>
        )}
        {lorebook && (
          <>
            <div className="input-group">
              <label htmlFor="lb-name">Name</label>
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
              <label htmlFor="lb-description">Description</label>
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
            <div className="input-group">
              <label htmlFor="lb-scope">Scope</label>
              <div id="lb-scope" style={{ display: "flex", gap: "1rem" }}>
                <label>
                  <input
                    type="radio"
                    name="lorebook-scope"
                    checked={!metaDraft.isGlobal}
                    onChange={() => setMetaDraft({ ...metaDraft, isGlobal: false })}
                  />{" "}
                  Local
                </label>
                <label>
                  <input
                    type="radio"
                    name="lorebook-scope"
                    checked={metaDraft.isGlobal === true}
                    onChange={() => setMetaDraft({ ...metaDraft, isGlobal: true })}
                  />{" "}
                  Global
                </label>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
                Global is an organizational tag for filtering; it does not change behavior.
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingMeta}
              onClick={() => void saveMeta()}
            >
              {savingMeta ? "Saving…" : "Save Lorebook"}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>New Entry</h3>
        <form onSubmit={createEntry}>
          <div className="input-group">
            <label htmlFor="entry-keywords">Keywords (comma-separated)</label>
            <input
              id="entry-keywords"
              type="text"
              placeholder="e.g., spaceship, warp core, starship"
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
              Matching triggers when any keyword is found.
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="entry-content">Content</label>
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
                checked={entryForm.isEnabled ?? true}
                onChange={(e) =>
                  setEntryForm({
                    ...entryForm,
                    isEnabled: e.target.checked,
                  })
                }
              />{" "}
              Active
            </label>
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
              Only active entries are used.
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creatingEntry}
          >
            {creatingEntry ? "Creating…" : "Add Entry"}
          </button>
          {entryError && (
            <div className="badge" style={{ marginTop: "0.5rem" }}>
              Error: {entryError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Entries</h3>
        {entriesState.loading && <div>Loading entries…</div>}
        {entriesState.error && (
          <div className="badge">Error: {entriesState.error}</div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Keywords</th>
              <th>Content</th>
              <th>Order</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id}>
                <td>
                  {entry.keywords.map((k) => (
                    <span
                      key={k}
                      className="badge"
                      style={{ marginRight: "0.25rem" }}
                    >
                      {k}
                    </span>
                  ))}
                </td>
                <td>
                  {entry.content.split("\n")[0] ?? ""}
                  {entry.content.includes("\n") ? "…" : ""}
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span>#{index + 1}</span>
                    <div style={{ display: "flex", gap: "0.25rem", marginLeft: "0.5rem" }}>
                      <button
                        type="button"
                        className="btn"
                        disabled={index === 0}
                        title="Move up"
                        onClick={() => void moveEntry(entry.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={index === entries.length - 1}
                        title="Move down"
                        onClick={() => void moveEntry(entry.id, +1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={entry.isEnabled}
                      onChange={(e) => void toggleEntryEnabled(entry.id, e.target.checked)}
                    />
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
                      onClick={() => startEdit(entry)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void deleteEntry(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && !entriesState.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    No entries yet. Add one above.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {editingEntryId && (
          <div
            className="card"
            style={{ marginTop: "1rem", backgroundColor: "#1a1a1a" }}
          >
            <h4 style={{ marginTop: 0 }}>Edit entry</h4>
            <div className="input-group">
              <label htmlFor="edit-keywords">
                Keywords (comma-separated)
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
              <label htmlFor="edit-content">Content</label>
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
                Enabled
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingEntry}
              onClick={() => void saveEntryEdit()}
            >
              {savingEntry ? "Saving…" : "Save Entry"}
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
              Cancel
            </button>
            {entryError && (
              <div className="badge" style={{ marginTop: "0.5rem" }}>
                Error: {entryError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


