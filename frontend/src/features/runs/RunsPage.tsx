import { useState } from "react";
import type { ChatRun, ChatRunStatus } from "../../api/runs";
import { listChatRuns } from "../../api/runs";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export function RunsPage() {
  const [chatId, setChatId] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    ChatRunStatus | "all"
  >("all");
  const [runs, setRuns] = useState<ChatRun[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  async function loadRuns(e: React.FormEvent) {
    e.preventDefault();
    if (!chatId.trim()) return;
    setState({ loading: true, error: null });
    try {
      const data = await listChatRuns(chatId.trim());
      setRuns(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load chat runs",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  const filteredRuns =
    statusFilter === "all"
      ? runs
      : runs.filter((r) => r.status === statusFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Filter</h3>
        <form onSubmit={loadRuns}>
          <div className="flex-row">
            <div className="input-group" style={{ flex: 2 }}>
              <label htmlFor="runs-chat-id">Chat ID</label>
              <input
                id="runs-chat-id"
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label htmlFor="runs-status">Status</label>
              <select
                id="runs-status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as ChatRunStatus | "all",
                  )
                }
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Load Runs
          </button>
        </form>
        {state.error && (
          <div className="badge" style={{ marginTop: "0.5rem" }}>
            Error: {state.error}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Runs</h3>
        {state.loading && <div>Loading runs…</div>}
        <table className="table">
          <thead>
            <tr>
              <th>Started at</th>
              <th>Finished at</th>
              <th>Status</th>
              <th>Tokens</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id}>
                <td>{run.startedAt}</td>
                <td>{run.finishedAt ?? "-"}</td>
                <td>{run.status}</td>
                <td>
                  {run.tokenUsage
                    ? run.tokenUsage.total
                    : "-"}
                </td>
                <td>{run.error ?? ""}</td>
              </tr>
            ))}
            {filteredRuns.length === 0 && !state.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    No runs loaded yet. Enter a chat ID above.
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

