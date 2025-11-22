import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PromptStackItemView } from "../PromptStackList";
import { PromptStackList } from "../PromptStackList";
import type { RoleFilter } from "../types";
import { PresetEditorPanel } from "../../promptStack/PresetEditorPanel";
import { LorebookEditorPanel } from "../../promptStack/LorebookEditorPanel";

interface Props {
  items: PromptStackItemView[];
  roleFilter: RoleFilter;
  onRoleFilterChange(next: RoleFilter): void;
  reordering: boolean;
  stackState: { loading: boolean; error: string | null };
  attachError: string | null;
  onRemove(id: string): void;
  onReorder(ids: string[]): void;
  onReload(): void | Promise<void>;
  onToggleEnabled(id: string, isEnabled: boolean): void;
}

export function StackCard({
  items,
  roleFilter,
  onRoleFilterChange,
  reordering,
  stackState,
  attachError,
  onRemove,
  onReorder,
  onReload,
  onToggleEnabled,
}: Props) {
  const { t } = useTranslation();
  const [editingItem, setEditingItem] =
    useState<PromptStackItemView | null>(null);
  return (
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
            className="select"
            value={roleFilter}
            onChange={(e) =>
              onRoleFilterChange(e.target.value as RoleFilter)
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
      {stackState.loading && (
        <div>{t("promptBuilder.stackLoading")}</div>
      )}
      {stackState.error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {stackState.error}
        </div>
      )}
      {attachError && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {attachError}
        </div>
      )}
      {items.length === 0 && !stackState.loading && (
        <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          {t("promptBuilder.stackEmpty")}
        </div>
      )}
      {items.length > 0 && (
        <>
          <PromptStackList
            items={items}
            editingId={editingItem?.id ?? null}
            onRemove={(id) => void onRemove(id)}
            onReorder={(ids) => void onReorder(ids)}
            onEdit={(item) => {
              if (item.locked) return;
              setEditingItem((current) =>
                current && current.id === item.id ? null : item,
              );
            }}
            onToggle={(id, isEnabled) =>
              void onToggleEnabled(id, isEnabled)
            }
            renderEditor={(item) =>
              item.kind === "lorebook" && item.lorebookId ? (
                <LorebookEditorPanel
                  lorebookId={item.lorebookId}
                  onSaved={() => {
                    setEditingItem(null);
                    void onReload();
                  }}
                  onCancel={() => setEditingItem(null)}
                />
              ) : (
                <PresetEditorPanel
                  presetId={item.presetId}
                  onSaved={() => {
                    setEditingItem(null);
                    void onReload();
                  }}
                  onCancel={() => setEditingItem(null)}
                />
              )
            }
          />
        </>
      )}
    </div>
  );
}
