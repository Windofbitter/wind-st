import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptPreset, PromptRole } from "../../api/promptStack";
import {
  attachPromptPreset,
  detachPromptPreset,
  getPromptStack,
  reorderPromptPresets,
} from "../../api/promptStack";
import type { Preset } from "../../api/presets";
import { listPresets } from "../../api/presets";
import { ApiError } from "../../api/httpClient";
import { PresetPalette } from "./PresetPalette";
import type { PromptStackItemView } from "./PromptStackList";
import { PromptStackList } from "./PromptStackList";

type RoleFilter = "all" | PromptRole;

interface PromptBuilderTabProps {
  characterId: string;
  persona: string;
  onPersonaSave(newPersona: string): Promise<void>;
}

export function PromptBuilderTab({
  characterId,
  persona,
  onPersonaSave,
}: PromptBuilderTabProps) {
  const { t } = useTranslation();
  const [personaDraft, setPersonaDraft] = useState(persona);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(
    null,
  );

  const [promptStack, setPromptStack] = useState<PromptPreset[]>([]);
  const [stackLoading, setStackLoading] = useState(false);
  const [stackError, setStackError] = useState<string | null>(null);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(
    null,
  );

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [reordering, setReordering] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    setPersonaDraft(persona);
  }, [persona]);

  useEffect(() => {
    void loadStack();
    void loadPresets();
  }, [characterId]);

  async function loadStack() {
    setStackLoading(true);
    setStackError(null);
    try {
      const data = await getPromptStack(characterId);
      setPromptStack(data);
    } catch (err) {
      setStackError(
        err instanceof ApiError
          ? err.message
          : "Failed to load prompt stack",
      );
    } finally {
      setStackLoading(false);
    }
  }

  async function loadPresets() {
    setPresetsLoading(true);
    setPresetsError(null);
    try {
      const data = await listPresets();
      setPresets(data);
    } catch (err) {
      setPresetsError(
        err instanceof ApiError
          ? err.message
          : "Failed to load presets",
      );
    } finally {
      setPresetsLoading(false);
    }
  }

  const stackItems: PromptStackItemView[] = useMemo(() => {
    const byPreset = new Map(presets.map((p) => [p.id, p]));
    const sorted = [...promptStack].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return sorted
      .filter((pp) =>
        roleFilter === "all" ? true : pp.role === roleFilter,
      )
      .map((pp) => {
        const preset = byPreset.get(pp.presetId);
        return {
          id: pp.id,
          title: preset?.title ?? pp.presetId,
          role: pp.role,
          kind: preset?.kind,
        };
      });
  }, [promptStack, presets, roleFilter]);

  async function handlePersonaSave() {
    setSavingPersona(true);
    setPersonaError(null);
    try {
      await onPersonaSave(personaDraft);
    } catch (err) {
      setPersonaError(
        err instanceof ApiError
          ? err.message
          : "Failed to save persona",
      );
    } finally {
      setSavingPersona(false);
    }
  }

  function resolveNewRole(): PromptRole {
    if (roleFilter === "all") return "system";
    return roleFilter;
  }

  async function handleAddPreset(presetId: string) {
    setAttachError(null);
    try {
      await attachPromptPreset(characterId, {
        presetId,
        role: resolveNewRole(),
      });
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to attach preset",
      );
    }
  }

  async function handleRemovePromptPreset(promptPresetId: string) {
    setAttachError(null);
    try {
      await detachPromptPreset(promptPresetId);
      await loadStack();
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to remove prompt preset",
      );
    }
  }

  async function handleReorderPromptPresets(ids: string[]) {
    setReordering(true);
    setAttachError(null);
    try {
      await reorderPromptPresets(characterId, { ids });
      const byId = new Map(promptStack.map((pp) => [pp.id, pp]));
      const reordered: PromptPreset[] = ids
        .map((id, index) => {
          const original = byId.get(id);
          if (!original) return null;
          return { ...original, sortOrder: index };
        })
        .filter((pp): pp is PromptPreset => pp !== null);
      setPromptStack(reordered);
    } catch (err) {
      setAttachError(
        err instanceof ApiError
          ? err.message
          : "Failed to reorder prompt presets",
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
            onChange={(e) =>
              setPersonaDraft(e.target.value)
            }
            rows={5}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={savingPersona}
          onClick={() => void handlePersonaSave()}
        >
          {savingPersona
            ? t("promptBuilder.quickPersonaSaveButtonSaving")
            : t("promptBuilder.quickPersonaSaveButton")}
        </button>
        {personaError && (
          <div className="badge" style={{ marginTop: "0.5rem" }}>
            {t("common.errorPrefix")} {personaError}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.5fr",
          gap: "1rem",
        }}
      >
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {t("promptBuilder.paletteTitle")}
          </h3>
          {presetsLoading && (
            <div>{t("promptBuilder.paletteLoading")}</div>
          )}
          {presetsError && (
            <div className="badge">
              {t("common.errorPrefix")} {presetsError}
            </div>
          )}
          {!presetsLoading && presets.length === 0 && (
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              {t("promptBuilder.paletteEmpty")}
            </div>
          )}
          {presets.length > 0 && (
            <PresetPalette
              presets={presets}
              onAddPreset={(id) =>
                void handleAddPreset(id)
              }
            />
          )}
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>
                {t("promptBuilder.stackTitle")}
              </h3>
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(
                    e.target.value as RoleFilter,
                  )
                }
              >
                <option value="all">
                  {t("promptBuilder.stackRoleFilterAll")}
                </option>
                <option value="system">
                  {t("promptBuilder.stackRoleFilterSystem")}
                </option>
                <option value="assistant">
                  {t("promptBuilder.stackRoleFilterAssistant")}
                </option>
                <option value="user">
                  {t("promptBuilder.stackRoleFilterUser")}
                </option>
              </select>
            </div>
            {reordering && (
              <span
                style={{
                  fontSize: "0.8rem",
                  opacity: 0.8,
                }}
              >
                {t("promptBuilder.stackReordering")}
              </span>
            )}
          </div>
          {stackLoading && (
            <div>{t("promptBuilder.stackLoading")}</div>
          )}
          {stackError && (
            <div className="badge">
              {t("common.errorPrefix")} {stackError}
            </div>
          )}
          {attachError && (
            <div className="badge">
              {t("common.errorPrefix")} {attachError}
            </div>
          )}
          {stackItems.length === 0 && !stackLoading && (
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              {t("promptBuilder.stackEmpty")}
            </div>
          )}
          {stackItems.length > 0 && (
            <PromptStackList
              items={stackItems}
              onRemove={(id) =>
                void handleRemovePromptPreset(id)
              }
              onReorder={(ids) =>
                void handleReorderPromptPresets(ids)
              }
            />
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          {t("promptBuilder.previewTitle")}
        </h3>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            whiteSpace: "pre-wrap",
            maxHeight: "16rem",
            overflowY: "auto",
          }}
        >
          <strong>
            {t("promptBuilder.previewSystemPersonaLabel")}
          </strong>
          {"\n"}
          {personaDraft ||
            t("promptBuilder.previewEmptyPersona")}
          {"\n\n"}
          <strong>
            {t("promptBuilder.previewStackLabel")}
          </strong>
          {"\n"}
          {stackItems.length === 0
            ? t("promptBuilder.previewNoPresets")
            : stackItems
                .map(
                  (item, index) =>
                    `${index + 1}. [${item.role.toUpperCase()}] ${
                      item.title
                    }`,
                )
                .join("\n")}
        </div>
      </div>
    </div>
  );
}

