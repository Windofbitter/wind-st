import { useTranslation } from "react-i18next";

interface Props {
  personaDraft: string;
  onChange(value: string): void;
  onSave(): void;
  saving: boolean;
  error: string | null;
}

export function PersonaCard({
  personaDraft,
  onChange,
  onSave,
  saving,
  error,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("promptBuilder.quickPersonaTitle")}
      </h3>
      <div className="input-group">
        <label htmlFor="persona-textarea">
          {t("promptBuilder.quickPersonaLabel")}
        </label>
        <textarea
          id="persona-textarea"
          value={personaDraft}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={saving}
        onClick={onSave}
      >
        {saving
          ? t("promptBuilder.quickPersonaSaveButtonSaving")
          : t("promptBuilder.quickPersonaSaveButton")}
      </button>
      {error && (
        <div
          className="badge badge-error"
          style={{ marginTop: "0.5rem" }}
        >
          {t("common.errorPrefix")} {error}
        </div>
      )}
    </div>
  );
}
