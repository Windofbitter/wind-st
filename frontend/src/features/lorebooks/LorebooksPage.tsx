import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  CreateLorebookRequest,
  Lorebook,
} from "../../api/lorebooks";
import {
  createLorebook,
  deleteLorebook,
  listLorebooks,
} from "../../api/lorebooks";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyForm: CreateLorebookRequest = {
  name: "",
  description: "",
  isGlobal: false,
};

export function LorebooksPage() {
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [form, setForm] =
    useState<CreateLorebookRequest>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  // Filters
  const [scopeFilter, setScopeFilter] = useState<"all" | "global" | "local">(
    "all",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadLorebooks();
  }, [scopeFilter, search]);

  async function loadLorebooks() {
    setState({ loading: true, error: null });
    try {
      const isGlobalParam =
        scopeFilter === "global"
          ? true
          : scopeFilter === "local"
            ? false
            : undefined;
      const nameContainsParam = search.trim() !== "" ? search.trim() : undefined;
      const data = await listLorebooks({
        isGlobal: isGlobalParam,
        nameContains: nameContainsParam,
      });
      setLorebooks(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load lorebooks",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreateLorebook(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createLorebook(form);
      setForm(emptyForm);
      await loadLorebooks();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create lorebook",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteLorebook(id: string) {
    const confirmed = window.confirm(
      "Delete this lorebook and all entries?",
    );
    if (!confirmed) return;

    try {
      await deleteLorebook(id);
      await loadLorebooks();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete lorebook",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>New Lorebook</h3>
        <form onSubmit={handleCreateLorebook}>
          <div className="input-group">
            <label htmlFor="lb-name">Name</label>
            <input
              id="lb-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="lb-description">Description</label>
            <textarea
              id="lb-description"
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
            <label htmlFor="lb-scope">Scope</label>
            <div id="lb-scope" style={{ display: "flex", gap: "1rem" }}>
              <label>
                <input
                  type="radio"
                  name="lorebook-scope"
                  checked={!form.isGlobal}
                  onChange={() => setForm({ ...form, isGlobal: false })}
                />{" "}
                Local
              </label>
              <label>
                <input
                  type="radio"
                  name="lorebook-scope"
                  checked={form.isGlobal === true}
                  onChange={() => setForm({ ...form, isGlobal: true })}
                />{" "}
                Global
              </label>
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
              Global is an organizational tag for filtering; it does not change behavior.
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating}
          >
            {creating ? "Creating…" : "Create Lorebook"}
          </button>
          {createError && (
            <div className="badge" style={{ marginTop: "0.5rem" }}>
              Error: {createError}
            </div>
          )}
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lorebooks</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className={"btn" + (scopeFilter === "all" ? " btn-primary" : "")}
              onClick={() => setScopeFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={"btn" + (scopeFilter === "global" ? " btn-primary" : "")}
              onClick={() => setScopeFilter("global")}
            >
              Global
            </button>
            <button
              type="button"
              className={"btn" + (scopeFilter === "local" ? " btn-primary" : "")}
              onClick={() => setScopeFilter("local")}
            >
              Local
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px" }}
          />
        </div>
        {state.loading && <div>Loading lorebooks…</div>}
        {state.error && (
          <div className="badge">Error: {state.error}</div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Global</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lorebooks.map((lb) => (
              <tr key={lb.id}>
                <td>{lb.name}</td>
                <td>{lb.description}</td>
                <td>{lb.isGlobal ? "Yes" : "No"}</td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <Link
                      to={`/lorebooks/${lb.id}`}
                      className="btn btn-primary"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        void handleDeleteLorebook(lb.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {lorebooks.length === 0 && !state.loading && (
              <tr>
                <td colSpan={4}>
                  <span style={{ opacity: 0.8 }}>
                    No lorebooks yet. Create one above.
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

