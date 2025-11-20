import { useTranslation } from "react-i18next";
import type { LLMConnection } from "../../../api/llmConnections";
import { LLMConnectionStatusBadge } from "./LLMConnectionStatusBadge";

interface Props {
  connections: LLMConnection[];
  loading: boolean;
  error: string | null;
  onEdit: (conn: LLMConnection) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onTest: (id: string) => void;
  testingId: string | null;
}

export function ConnectionsTable({
  connections,
  loading,
  error,
  onEdit,
  onDelete,
  onToggleEnabled,
  onTest,
  testingId,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("llmConnections.listTitle")}
      </h3>
      {loading && <div>{t("llmConnections.listLoading")}</div>}
      {error && (
        <div className="badge">
          {t("common.errorPrefix")} {error}
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>{t("llmConnections.listTableName")}</th>
            <th>{t("llmConnections.listTableProvider")}</th>
            <th>{t("llmConnections.listTableBaseUrl")}</th>
            <th>
              {t("llmConnections.listTableDefaultModel")}
            </th>
            <th>{t("llmConnections.listTableEnabled")}</th>
            <th>{t("llmConnections.listTableStatus")}</th>
            <th>{t("llmConnections.listTableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn) => (
            <tr key={conn.id}>
              <td>{conn.name}</td>
              <td>{conn.provider}</td>
              <td>{conn.baseUrl}</td>
              <td>{conn.defaultModel}</td>
              <td>
                <label>
                  <input
                    type="checkbox"
                    checked={conn.isEnabled}
                    onChange={(e) =>
                      void onToggleEnabled(conn.id, e.target.checked)
                    }
                    />
                  </label>
                </td>
                <td>
                  <LLMConnectionStatusBadge
                    status={conn.status}
                    lastTestedAt={conn.lastTestedAt}
                    checking={testingId === conn.id}
                    modelsAvailable={conn.modelsAvailable}
                  />
                </td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onTest(conn.id)}
                    disabled={testingId === conn.id}
                  >
                    {testingId === conn.id
                      ? t("common.testing")
                      : t("llmConnections.testButton")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onEdit(conn)}
                  >
                    {t("llmConnections.listEditButton")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void onDelete(conn.id)}
                  >
                    {t("llmConnections.listDeleteButton")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {connections.length === 0 && !loading && (
            <tr>
              <td colSpan={7}>
                <span style={{ opacity: 0.8 }}>
                  {t("llmConnections.listEmpty")}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
