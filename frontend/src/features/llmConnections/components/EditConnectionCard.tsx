import { useTranslation } from "react-i18next";
import type { UpdateLLMConnectionRequest } from "../../../api/llmConnections";

interface Props {
  form: UpdateLLMConnectionRequest;
  onChange: (next: UpdateLLMConnectionRequest) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  onTest: () => void;
  testing: boolean;
  testResult: string | null;
}

export function EditConnectionCard({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  onTest,
  testing,
  testResult,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="card"
      style={{ marginTop: "1rem", backgroundColor: "#1a1a1a" }}
    >
      <h4 style={{ marginTop: 0 }}>
        {t("llmConnections.editTitle")}
      </h4>
      <div className="input-group">
        <label htmlFor="edit-name">
          {t("llmConnections.editNameLabel")}
        </label>
        <input
          id="edit-name"
          type="text"
          value={form.name ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              name: e.target.value,
            })
          }
        />
      </div>
      <div className="input-group">
        <label htmlFor="edit-base-url">
          {t("llmConnections.editBaseUrlLabel")}
        </label>
        <input
          id="edit-base-url"
          type="text"
          value={form.baseUrl ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              baseUrl: e.target.value,
            })
          }
        />
      </div>
      <div className="input-group">
        <label htmlFor="edit-model">
          {t("llmConnections.editDefaultModelLabel")}
        </label>
        <input
          id="edit-model"
          type="text"
          value={form.defaultModel ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              defaultModel: e.target.value,
            })
          }
        />
      </div>
      <div className="input-group">
        <label htmlFor="edit-api-key">
          {t("llmConnections.newApiKeyLabel")}
        </label>
        <input
          id="edit-api-key"
          type="password"
          value={form.apiKey ?? ""}
          onChange={(e) =>
            onChange({
              ...form,
              apiKey: e.target.value,
            })
          }
          placeholder={t("llmConnections.newApiKeyLabel")}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving
          ? t("llmConnections.editSaveButtonSaving")
          : t("llmConnections.editSaveButton")}
      </button>
      <button
        type="button"
        className="btn"
        style={{ marginLeft: "0.5rem" }}
        disabled={testing || saving}
        onClick={() => onTest()}
      >
        {testing
          ? t("common.testing")
          : t("llmConnections.testButton")}
      </button>
      <button
        type="button"
        className="btn"
        style={{ marginLeft: "0.5rem" }}
        onClick={onCancel}
      >
        {t("llmConnections.editCancelButton")}
      </button>
      {error && (
        <div className="badge" style={{ marginTop: "0.5rem" }}>
          {t("common.errorPrefix")} {error}
        </div>
      )}
      {testResult && (
        <div className="badge" style={{ marginTop: "0.5rem" }}>
          {testResult}
        </div>
      )}
    </div>
  );
}
