import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MCPServer } from "../../api/mcpServers";
import {
  deleteMCPServer,
  getMCPServerStatus,
  listMCPServers,
  updateMCPServer,
} from "../../api/mcpServers";
import { ApiError } from "../../api/httpClient";
import { CreateMCPServerForm } from "./CreateMCPServerForm";
import { MCPServerEditPanel } from "./MCPServerEditPanel";
import {
  MCPServerStatusBadge,
  type MCPServerStatus,
} from "./MCPServerStatusBadge";

interface LoadState {
  loading: boolean;
  error: string | null;
}

type StatusMap = Record<string, MCPServerStatus>;

export function MCPServersPage() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });
  const [editing, setEditing] = useState<MCPServer | null>(null);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [testing, setTesting] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadServers();
  }, []);

  async function loadServers() {
    setState({ loading: true, error: null });
    try {
      const data = await listMCPServers();
      setServers(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load MCP servers",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  function setStatus(serverId: string, status: MCPServerStatus) {
    setStatuses((prev) => ({ ...prev, [serverId]: status }));
  }

  function clearStatus(serverId: string) {
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[serverId];
      return next;
    });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(t("mcpServers.deleteConfirm"));
    if (!confirmed) return;
    try {
      await deleteMCPServer(id);
      clearStatus(id);
      await loadServers();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete MCP server",
      }));
    }
  }

  async function toggleServerEnabled(id: string, enabled: boolean) {
    // optimistic UI update
    setServers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isEnabled: enabled } : s,
      ),
    );

    try {
      await updateMCPServer(id, { isEnabled: enabled });
      if (!enabled) {
        clearStatus(id);
        return;
      }
      await testServer(id);
    } catch (err) {
      // revert on error
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isEnabled: !enabled } : s,
        ),
      );
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update MCP server",
      }));
    }
  }

  async function testServer(
    id: string,
    options?: { reset?: boolean },
  ) {
    setTesting((prev) => new Set(prev).add(id));
    const checkedAt = new Date().toISOString();

    try {
      const result = await getMCPServerStatus(id, options);
      if (result.status === "ok") {
        setStatus(id, {
          state: "ok",
          toolCount: result.toolCount ?? 0,
          checkedAt,
        });
      } else {
        setStatus(id, {
          state: "error",
          error: result.error ?? t("mcpServers.statusError"),
          checkedAt,
        });
      }
    } catch (err) {
      setStatus(id, {
        state: "error",
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to check status",
        checkedAt,
      });
    } finally {
      setTesting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CreateMCPServerForm onCreated={() => loadServers()} />

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{t("mcpServers.listTitle")}</h3>
        {state.loading && <div>{t("mcpServers.listLoading")}</div>}
        {state.error && (
          <div className="badge">
            {t("common.errorPrefix")} {state.error}
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>{t("mcpServers.listTableName")}</th>
              <th>{t("mcpServers.listTableCommand")}</th>
              <th>{t("mcpServers.listTableArgs")}</th>
              <th>{t("mcpServers.listTableStatus")}</th>
              <th>{t("mcpServers.listTableEnabled")}</th>
              <th>{t("mcpServers.listTableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const isTesting = testing.has(server.id);
              const status = statuses[server.id];
              return (
                <tr key={server.id}>
                  <td>{server.name}</td>
                  <td>{server.command}</td>
                  <td>{server.args.join(" ")}</td>
                  <td>
                    {server.isEnabled ? (
                      <MCPServerStatusBadge
                        status={status}
                        checking={isTesting}
                      />
                    ) : (
                      <span style={{ opacity: 0.8 }}>
                        {t("mcpServers.statusDisabled")}
                      </span>
                    )}
                  </td>
                  <td>
                    <label>
                      <input
                        type="checkbox"
                        checked={server.isEnabled}
                        onChange={(e) =>
                          void toggleServerEnabled(
                            server.id,
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                    >
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void testServer(server.id)}
                        disabled={!server.isEnabled || isTesting}
                      >
                        {t("mcpServers.listTestButton")}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void testServer(server.id, { reset: true })}
                        disabled={!server.isEnabled || isTesting}
                      >
                        {t("mcpServers.listRestartButton")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setEditing(server)}
                      >
                        {t("mcpServers.listEditButton")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void handleDelete(server.id)}
                      >
                        {t("mcpServers.listDeleteButton")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {servers.length === 0 && !state.loading && (
              <tr>
                <td colSpan={6}>
                  <span style={{ opacity: 0.8 }}>
                    {t("mcpServers.listEmpty")}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <MCPServerEditPanel
          server={editing}
          onSaved={() => loadServers()}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
