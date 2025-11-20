import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { CreateLLMConnectionRequest } from "../../../api/llmConnections";

interface Props {
  form: CreateLLMConnectionRequest;
  onChange: (next: CreateLLMConnectionRequest) => void;
  onSubmit: (e: FormEvent) => void;
  creating: boolean;
  error: string | null;
  onTest: () => void;
  testing: boolean;
  testResult: string | null;
}

export function CreateConnectionCard({
  form,
  onChange,
  onSubmit,
  creating,
  error,
  onTest,
  testing,
  testResult,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("llmConnections.newTitle")}
      </h3>
      <form onSubmit={onSubmit}>
        <div className="input-group">
          <label htmlFor="conn-name">
            {t("llmConnections.newNameLabel")}
          </label>
          <input
            id="conn-name"
            type="text"
            value={form.name}
            onChange={(e) =>
              onChange({ ...form, name: e.target.value })
            }
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="conn-base-url">
            {t("llmConnections.newBaseUrlLabel")}
          </label>
          <input
            id="conn-base-url"
            type="text"
            value={form.baseUrl}
            onChange={(e) =>
              onChange({
                ...form,
                baseUrl: e.target.value,
              })
            }
          />
        </div>
        <div className="input-group">
          <label htmlFor="conn-model">
            {t("llmConnections.newDefaultModelLabel")}
          </label>
          <input
            id="conn-model"
            type="text"
            value={form.defaultModel}
            onChange={(e) =>
              onChange({
                ...form,
                defaultModel: e.target.value,
              })
            }
          />
        </div>
        <div className="input-group">
          <label htmlFor="conn-api-key">
            {t("llmConnections.newApiKeyLabel")}
          </label>
          <input
            id="conn-api-key"
            type="password"
            value={form.apiKey}
            onChange={(e) =>
              onChange({
                ...form,
                apiKey: e.target.value,
              })
            }
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={creating}
        >
          {creating
            ? t("llmConnections.newCreateButtonCreating")
            : t("llmConnections.newCreateButton")}
        </button>
        <button
          type="button"
          className="btn"
          style={{ marginLeft: "0.5rem" }}
          onClick={onTest}
          disabled={testing || creating}
        >
          {testing
            ? t("common.testing")
            : t("llmConnections.testDraftButton")}
        </button>
        {error && (
          <div
            className="badge badge-error"
            style={{ marginTop: "0.5rem" }}
          >
            {t("common.errorPrefix")} {error}
          </div>
        )}
        {testResult && (
          <div
            className="badge"
            style={{ marginTop: "0.5rem", opacity: 0.9 }}
          >
            {testResult}
          </div>
        )}
      </form>
    </div>
  );
}
