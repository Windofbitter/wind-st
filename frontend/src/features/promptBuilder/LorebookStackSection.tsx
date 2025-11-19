import { useTranslation } from "react-i18next";
import type {
  CharacterLorebook,
  Lorebook,
} from "../../api/lorebooks";

interface LorebookStackSectionProps {
  lorebooks: Lorebook[];
  attached: CharacterLorebook[];
  loading: boolean;
  error: string | null;
  onAttach(lorebookId: string): void;
  onDetach(mappingId: string): void;
}

export function LorebookStackSection({
  lorebooks,
  attached,
  loading,
  error,
  onAttach,
  onDetach,
}: LorebookStackSectionProps) {
  const { t } = useTranslation();

  const attachedByLorebook = new Map(
    attached.map((m) => [m.lorebookId, m]),
  );

  const availableLorebooks = lorebooks.filter(
    (lb) => !attachedByLorebook.has(lb.id),
  );
  const attachedLorebooks = lorebooks.filter((lb) =>
    attachedByLorebook.has(lb.id),
  );

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("lorebooks.listTitle")}
      </h3>
      {loading && (
        <div>{t("lorebooks.listLoading")}</div>
      )}
      {error && (
        <div className="badge">
          {t("common.errorPrefix")} {error}
        </div>
      )}
      {!loading && lorebooks.length === 0 && (
        <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          {t("lorebooks.listEmpty")}
        </div>
      )}
      {lorebooks.length > 0 && (
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
              {t("lorebooks.listTitle")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {availableLorebooks.map((lb) => (
                <button
                  key={lb.id}
                  type="button"
                  className="list-button"
                  onClick={() => onAttach(lb.id)}
                >
                  <div className="list-button-text">
                    <div className="list-button-title">
                      {lb.name}
                    </div>
                    {lb.description && (
                      <div className="list-button-subtitle">
                        {lb.description}
                      </div>
                    )}
                  </div>
                  <span className="badge">
                    {t("promptBuilder.paletteAddBadge")}
                  </span>
                </button>
              ))}
              {availableLorebooks.length === 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.7,
                  }}
                >
                  {t("lorebooks.listEmpty")}
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
              {t("promptBuilder.lorebooksAttachedTitle")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {attachedLorebooks.map((lb) => {
                const mapping = attachedByLorebook.get(lb.id)!;
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
                        {lb.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          opacity: 0.8,
                          marginTop: "0.1rem",
                        }}
                      >
                        {lb.description}
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
              {attachedLorebooks.length === 0 && (
                <div
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.7,
                  }}
                >
                  {t("promptBuilder.lorebooksAttachedEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
