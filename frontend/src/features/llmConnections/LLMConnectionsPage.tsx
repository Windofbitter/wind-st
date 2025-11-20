import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CreateLLMConnectionRequest,
  LLMConnection,
  LLMProvider,
  UpdateLLMConnectionRequest,
} from "../../api/llmConnections";
import {
  createLLMConnection,
  deleteLLMConnection,
  listLLMConnections,
  testLLMConnection,
  testLLMConnectionDraft,
  updateLLMConnection,
} from "../../api/llmConnections";
import { ApiError } from "../../api/httpClient";
import { CreateConnectionCard } from "./components/CreateConnectionCard";
import { ConnectionsTable } from "./components/ConnectionsTable";
import { EditConnectionCard } from "./components/EditConnectionCard";

interface LoadState {
  loading: boolean;
  error: string | null;
}

const emptyForm: CreateLLMConnectionRequest = {
  name: "",
  provider: "openai_compatible",
  baseUrl: "",
  defaultModel: "",
  apiKey: "",
  isEnabled: true,
};

export function LLMConnectionsPage() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<LLMConnection[]>([]);
  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
  });

  const [form, setForm] =
    useState<CreateLLMConnectionRequest>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(
    null,
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] =
    useState<UpdateLLMConnectionRequest>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [draftTesting, setDraftTesting] = useState(false);
  const [draftTestResult, setDraftTestResult] = useState<string | null>(
    null,
  );
  const [editTesting, setEditTesting] = useState(false);
  const [editTestResult, setEditTestResult] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadConnections();
  }, []);

  async function loadConnections() {
    setState({ loading: true, error: null });
    try {
      const data = await listLLMConnections();
      setConnections(data);
    } catch (err) {
      setState({
        loading: false,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to load LLM connections",
      });
      return;
    }
    setState({ loading: false, error: null });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createLLMConnection(form);
      setForm(emptyForm);
      await loadConnections();
    } catch (err) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : "Failed to create connection",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      t("llmConnections.deleteConfirm"),
    );
    if (!confirmed) return;
    try {
      await deleteLLMConnection(id);
      await loadConnections();
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to delete connection",
      }));
    }
  }

  function startEdit(conn: LLMConnection) {
    setEditingId(conn.id);
    const patch: UpdateLLMConnectionRequest = {
      name: conn.name,
      provider: conn.provider as LLMProvider,
      baseUrl: conn.baseUrl,
      defaultModel: conn.defaultModel,
      isEnabled: conn.isEnabled,
      apiKey: conn.apiKey,
    };
    setEditForm(patch);
    setEditError(null);
    setEditTestResult(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateLLMConnection(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      await loadConnections();
    } catch (err) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : "Failed to update connection",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const result = await testLLMConnection(id);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: result.status ?? (result.state === "ok" ? "ok" : "error"),
                lastTestedAt: result.checkedAt ?? null,
                modelsAvailable: result.modelsAvailable ?? null,
              }
            : c,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to test connection";
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "error",
                lastTestedAt: null,
              }
            : c,
        ),
      );
      window.alert(msg);
    } finally {
      setTestingId(null);
    }
  }

  async function handleTestDraft(payload: CreateLLMConnectionRequest) {
    setDraftTesting(true);
    setDraftTestResult(t("common.testing"));
    try {
      const result = await testLLMConnectionDraft(payload);
      setDraftTestResult(
        result.state === "ok"
          ? t("llmConnections.testResultOk", {
              count: result.modelsAvailable ?? 0,
            })
          : t("llmConnections.testResultFail", {
              message: result.error ?? "",
            }),
      );
    } catch (err) {
      setDraftTestResult(
        err instanceof ApiError
          ? err.message
          : "Failed to test connection",
      );
    } finally {
      setDraftTesting(false);
    }
  }

  async function handleTestEditDraft() {
    if (!editingId) return;
    const payload: CreateLLMConnectionRequest = {
      name: editForm.name ?? "",
      provider: (editForm.provider as LLMProvider) ?? "openai_compatible",
      baseUrl: editForm.baseUrl ?? "",
      defaultModel: editForm.defaultModel ?? "",
      apiKey: editForm.apiKey ?? "",
      isEnabled: editForm.isEnabled ?? true,
    };
    setEditTesting(true);
    setEditTestResult(t("common.testing"));
    try {
      const result = await testLLMConnectionDraft(payload);
      setEditTestResult(
        result.state === "ok"
          ? t("llmConnections.testResultOk", {
              count: result.modelsAvailable ?? 0,
            })
          : t("llmConnections.testResultFail", {
              message: result.error ?? "",
            }),
      );
    } catch (err) {
      setEditTestResult(
        err instanceof ApiError
          ? err.message
          : "Failed to test connection",
      );
    } finally {
      setEditTesting(false);
    }
  }

  async function toggleConnectionEnabled(id: string, enabled: boolean) {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, isEnabled: enabled } : c,
      ),
    );
    try {
      await updateLLMConnection(id, { isEnabled: enabled });
    } catch (err) {
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, isEnabled: !enabled } : c,
        ),
      );
      setState((s) => ({
        ...s,
        error:
          err instanceof ApiError
            ? err.message
            : "Failed to update connection",
      }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <CreateConnectionCard
        form={form}
        onChange={setForm}
        onSubmit={handleCreate}
        creating={creating}
        error={createError}
        onTest={() => void handleTestDraft(form)}
        testing={draftTesting}
        testResult={draftTestResult}
      />

      <ConnectionsTable
        connections={connections}
        loading={state.loading}
        error={state.error}
        onEdit={startEdit}
        onDelete={handleDelete}
        onToggleEnabled={toggleConnectionEnabled}
        onTest={handleTest}
        testingId={testingId}
      />

      {editingId && (
        <EditConnectionCard
          form={editForm}
          onChange={setEditForm}
          onSave={saveEdit}
          onCancel={() => {
            setEditingId(null);
            setEditForm({});
          }}
          saving={savingEdit}
          error={editError}
          onTest={() => void handleTestEditDraft()}
          testing={editTesting}
          testResult={editTestResult}
        />
      )}
    </div>
  );
}
