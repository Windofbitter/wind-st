import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChatRun, ChatRunStatus } from "../../api/runs";
import { listChatRuns } from "../../api/runs";
import { ApiError } from "../../api/httpClient";

interface LoadState {
  loading: boolean;
  error: string | null;
}

export function RunsPage() {
  const { t } = useTranslation();
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
        <h3 style={{ marginTop: 0 }}>{t("runs.filterTitle")}</h3>
        <form onSubmit={loadRuns}>
          <div className="flex-row">
            <div className="input-group" style={{ flex: 2 }}>
              <label htmlFor="runs-chat-id">
                {t("runs.filterChatIdLabel")}
              </label>
              <input
                id="runs-chat-id"
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
              />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label htmlFor="runs-status">
                {t("runs.filterStatusLabel")}
              </label>
              <select
                id="runs-status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as ChatRunStatus | "all",
                  )
                }
              >
                <option value="all">
                  {t("runs.filterStatusAll")}
                </option>
                <option value="pending">
                  {t("runs.filterStatusPending")}
                </option>
                <option value="running">
                  {t("runs.filterStatusRunning")}
                </option>
                <option value="completed">
                  {t("runs.filterStatusCompleted")}
                </option>
                <option value="failed">
                  {t("runs.filterStatusFailed")}
                </option>
                <option value="canceled">
                  {t("runs.filterStatusCanceled")}
                </option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("runs.filterSubmitButton")}
          </button>
        </form>
        {state.error && (
          <div
            className="badge badge-error"
            style={{ marginTop: "0.5rem" }}
          >
            {t("common.errorPrefix")} {state.error}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("runs.listTitle")}</h3>
        {state.loading && (
          <div>{t("runs.listLoading")}</div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>{t("runs.listTableStartedAt")}</th>
              <th>{t("runs.listTableFinishedAt")}</th>
              <th>{t("runs.listTableStatus")}</th>
              <th>{t("runs.listTableTokens")}</th>
              <th>{t("runs.listTableError")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id}>
                <td>{run.startedAt}</td>
                <td>
                  {run.finishedAt ?? t("runs.listNoFinished")}
                </td>
                <td>
                  {t(`runs.statusValue.${run.status}` as const)}
                </td>
                <td>
                  {run.tokenUsage
                    ? run.tokenUsage.total
                    : t("runs.listNoTokens")}
                </td>
                <td>{run.error ?? ""}</td>
              </tr>
            ))}
            {filteredRuns.length === 0 && !state.loading && (
              <tr>
                <td colSpan={5}>
                  <span style={{ opacity: 0.8 }}>
                    {t("runs.listNoRuns")}
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

