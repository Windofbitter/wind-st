import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../api/promptStack";
import type { PresetKind } from "../../api/presets";
import {
  attachCharacterMCPServer,
  detachCharacterMCPServer,
} from "../../api/mcpServers";
import { PresetPalette } from "./PresetPalette";
import { MCPStackSection } from "./MCPStackSection";
import type { PromptStackItemView } from "./PromptStackList";
import type { RoleFilter } from "./types";
import { PersonaCard } from "./components/PersonaCard";
import { StackCard } from "./components/StackCard";
import { AddLorebookRow } from "./components/AddLorebookRow";
import { usePromptBuilderData } from "./usePromptBuilderData";

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
  const data = usePromptBuilderData({
    characterId,
    persona,
    onPersonaSave,
  });

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [attachRole, setAttachRole] = useState<PromptRole>("system");

  const staticPresets = useMemo(
    () => data.presets.filter((p) => p.kind === "static_text"),
    [data.presets],
  );

  const stackItems: PromptStackItemView[] = useMemo(() => {
    const byPreset = new Map(data.presets.map((p) => [p.id, p]));
    const sorted = [...data.promptStack].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return sorted
      .filter((pp) =>
        roleFilter === "all" ? true : pp.role === roleFilter,
      )
      .map((pp) => {
        const preset = byPreset.get(pp.presetId);
        const kind = preset?.kind as PresetKind | undefined;
        const rawTitle = preset?.title ?? pp.presetId;
        const title =
          kind === "lorebook"
            ? rawTitle.replace(/^lorebook:\s*/i, "")
            : rawTitle;
        const lorebookId =
          kind === "lorebook"
            ? (preset?.config &&
                typeof (preset.config as { lorebookId?: unknown })
                  .lorebookId === "string"
                ? (preset.config as { lorebookId: string })
                    .lorebookId
                : null)
            : null;
        return {
          id: pp.id,
          title,
          role: pp.role,
          kind,
          locked: kind === "history",
          presetId: pp.presetId,
          lorebookId: lorebookId ?? undefined,
        };
      });
  }, [data.presets, data.promptStack, roleFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PersonaCard
        personaDraft={data.personaDraft}
        onChange={data.setPersonaDraft}
        onSave={() => void data.savePersona()}
        saving={data.savingPersona}
        error={data.personaError}
      />

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
          {data.presetsState.loading && (
            <div>{t("promptBuilder.paletteLoading")}</div>
          )}
          {data.presetsState.error && (
            <div className="badge badge-error">
              {t("common.errorPrefix")} {data.presetsState.error}
            </div>
          )}
          {!data.presetsState.loading &&
            staticPresets.length === 0 && (
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                {t("promptBuilder.paletteEmpty")}
              </div>
            )}
          {staticPresets.length > 0 && (
            <PresetPalette
              presets={staticPresets}
              onAddPreset={(id) =>
                void data.attachStaticPreset(id, attachRole)
              }
            />
          )}
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.5rem" }}>
            <label style={{ fontWeight: 500 }}>
              {t("promptBuilder.stackAttachRoleLabel")}
            </label>
            <select
              className="select"
              value={attachRole}
              onChange={(e) =>
                setAttachRole(e.target.value as PromptRole)
              }
            >
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
            <div style={{ fontWeight: 500 }}>
              {t("promptBuilder.paletteSectionLorebooks")}
            </div>
            <AddLorebookRow
              lorebooks={data.lorebooks}
              loading={data.lorebooksState.loading}
              error={data.lorebooksState.error}
              selectedId={data.selectedLorebookId}
              onSelect={data.setSelectedLorebookId}
              onAttach={() => void data.attachLorebook(attachRole)}
            />
            <button
              type="button"
              className="btn"
              onClick={() => void data.attachMcpTools(attachRole)}
            >
              {t("promptBuilder.mcpAttachedTitle")}
            </button>
          </div>
        </div>

        <StackCard
          items={stackItems}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          reordering={data.reordering}
          stackState={data.stackState}
          attachError={data.attachError}
          onRemove={(id) => void data.removePromptPreset(id)}
          onReorder={(ids) =>
            void data.reorderPromptPresets(ids)
          }
          onReload={() => void data.reloadAll()}
        />
      </div>

      <MCPStackSection
        servers={data.mcpServers}
        attached={data.characterMcpServers}
        loading={data.mcpState.loading}
        error={data.mcpState.error}
        onAttach={(id) =>
          attachAndReloadMcp(characterId, id, data.reloadMcp)
        }
        onDetach={(id) =>
          detachAndReloadMcp(id, data.reloadMcp)
        }
        onReload={() => void data.reloadMcp()}
      />

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
          {data.personaDraft ||
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

function attachAndReloadMcp(
  characterId: string,
  serverId: string,
  reload: () => Promise<void>,
) {
  return attachCharacterMCPServer(characterId, serverId).then(reload);
}

function detachAndReloadMcp(
  mappingId: string,
  reload: () => Promise<void>,
) {
  return detachCharacterMCPServer(mappingId).then(reload);
}
