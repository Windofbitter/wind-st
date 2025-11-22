import { useTranslation } from "react-i18next";
import type { Lorebook, UpdateLorebookRequest } from "../../../api/lorebooks";

interface LorebookMetaCardProps {
  lorebook: Lorebook | null;
  metaDraft: UpdateLorebookRequest;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onChange(meta: UpdateLorebookRequest): void;
  onSave(): void;
}

export function LorebookMetaCard({
  lorebook,
  metaDraft,
  loading,
  error,
  saving,
  onChange,
  onSave,
}: LorebookMetaCardProps) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("lorebooks.detailTitle")}
      </h3>
      {loading && (
        <div>{t("lorebooks.detailLoadingLorebook")}</div>
      )}
      {error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {error}
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
                onChange({
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
                onChange({
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
            disabled={saving}
            onClick={onSave}
          >
            {saving
              ? t("lorebooks.detailSaveButtonSaving")
              : t("lorebooks.detailSaveButton")}
          </button>
        </>
      )}
    </div>
  );
}

