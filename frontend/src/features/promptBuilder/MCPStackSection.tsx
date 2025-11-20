import { useTranslation } from "react-i18next";
import type {
  CharacterMCPServer,
  MCPServer,
} from "../../api/mcpServers";

interface MCPStackSectionProps {
  servers: MCPServer[];
  attached: CharacterMCPServer[];
  loading: boolean;
  error: string | null;
  onAttach(serverId: string): void;
  onDetach(mappingId: string): void;
}

export function MCPStackSection({
  servers,
  attached,
  loading,
  error,
  onAttach,
  onDetach,
}: MCPStackSectionProps) {
  const { t } = useTranslation();

  const attachedByServer = new Map(
    attached.map((m) => [m.mcpServerId, m]),
  );

  const availableServers = servers.filter(
    (s) => !attachedByServer.has(s.id),
  );
  const attachedServers = servers.filter((s) =>
    attachedByServer.has(s.id),
  );

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("mcpServers.listTitle")}
      </h3>
      {loading && (
        <div>{t("mcpServers.listLoading")}</div>
      )}
      {error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {error}
        </div>
      )}
      {!loading && servers.length === 0 && (
        <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          {t("mcpServers.listEmpty")}
        </div>
      )}
      {servers.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 500,
                marginBottom: "0.5rem",
              }}
            >
              {t("mcpServers.listTitle")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {availableServers.map((server) => (
                <button
                  key={server.id}
                  type="button"
                  className="list-button"
                  onClick={() => onAttach(server.id)}
                >
                  <div className="list-button-text">
                    <div className="list-button-title">
                      {server.name}
                    </div>
                    <div className="list-button-subtitle">
                      {server.command} {server.args.join(" ")}
                    </div>
                  </div>
                  <span className="badge">
                    {t("promptBuilder.paletteAddBadge")}
                  </span>
                </button>
              ))}
              {availableServers.length === 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.7,
                  }}
                >
                  {t("mcpServers.listEmpty")}
                </div>
              )}
            </div>
          </div>
          <div>
            <div
              style={{
                fontWeight: 500,
                marginBottom: "0.5rem",
              }}
            >
              {t("promptBuilder.mcpAttachedTitle")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {attachedServers.map((server) => {
                const mapping = attachedByServer.get(server.id)!;
                return (
                  <div
                    key={mapping.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.4rem 0.6rem",
                      borderRadius: 4,
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--sidebar-bg)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {server.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          opacity: 0.8,
                          marginTop: "0.1rem",
                        }}
                      >
                        {server.command}{" "}
                        {server.args.join(" ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ padding: "0.25rem 0.6rem" }}
                      onClick={() => onDetach(mapping.id)}
                    >
                      {t("promptBuilder.stackRemoveButton")}
                    </button>
                  </div>
                );
              })}
              {attachedServers.length === 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.7,
                  }}
                >
                  {t("promptBuilder.mcpAttachedEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
