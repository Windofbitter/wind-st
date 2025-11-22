import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { PromptPreset } from "../../../api/promptStack";
import {
  detachPromptPreset,
  reorderPromptPresets,
  updatePromptPreset,
} from "../../../api/promptStack";
import type { Preset, PresetKind } from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";
import { PromptStackAttachSection } from "./PromptStackAttachSection";
import { PromptStackPersonaSection } from "./PromptStackPersonaSection";
import { usePromptStackPresets } from "../hooks/usePromptStackPresets";
import type { PromptStackItemView } from "../../promptBuilder/PromptStackList";
import { StackCard } from "../../promptBuilder/components/StackCard";
import type { RoleFilter } from "../../promptBuilder/types";

interface LoadState {
  loading: boolean;
  error: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacter: Character | null;
  promptStack: PromptPreset[];
  promptStackState: LoadState;
  onReload: () => Promise<void>;
}

function toStackItems(
  stack: PromptPreset[],
  presetsById: Map<string, Preset>,
  roleFilter: RoleFilter,
): PromptStackItemView[] {
  const sorted = [...stack].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return sorted
    .filter((pp) =>
      roleFilter === "all" ? true : pp.role === roleFilter,
    )
    .map((pp) => {
      const preset = presetsById.get(pp.presetId);
      const kind = preset?.kind as PresetKind | undefined;
      const rawTitle = preset?.title ?? pp.presetId;
      const title =
        kind === "lorebook"
          ? rawTitle.replace(/^lorebook:\s*/i, "")
          : rawTitle;

      let lorebookId: string | undefined;
      if (kind === "lorebook" && preset?.config) {
        const cfg = preset
          .config as { lorebookId?: unknown };
        if (typeof cfg.lorebookId === "string") {
          lorebookId = cfg.lorebookId;
        }
      }

      const locked = kind === "history";

      return {
        id: pp.id,
        title,
        role: pp.role,
        kind,
        locked,
        presetId: pp.presetId,
        isEnabled: pp.isEnabled !== false,
        lorebookId,
      };
    });
}

export function PromptStackDrawer({
  isOpen,
  onClose,
  selectedCharacter,
  promptStack,
  promptStackState,
  onReload,
}: Props) {
  const { t } = useTranslation();
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");
  const [cardError, setCardError] = useState<string | null>(
    null,
  );
  const [reordering, setReordering] = useState(false);

  const { presetsById, state: presetsState } =
    usePromptStackPresets(promptStack);

  const items: PromptStackItemView[] = useMemo(
    () => toStackItems(promptStack, presetsById, roleFilter),
    [promptStack, presetsById, roleFilter],
  );

  const stackState: LoadState = {
    loading:
      promptStackState.loading || presetsState.loading,
    error:
      promptStackState.error || presetsState.error || null,
  };

  async function handleRemove(id: string) {
    const confirmed = window.confirm(
      t("chat.stackDetachConfirm") ||
        "Remove this item from the stack?",
    );
    if (!confirmed) return;

    setCardError(null);
    try {
      await detachPromptPreset(id);
      await onReload();
    } catch (err) {
      setCardError(
        err instanceof ApiError
          ? err.message
          : "Failed to detach item",
      );
    }
  }

  async function handleToggle(
    id: string,
    isEnabled: boolean,
  ) {
    setCardError(null);
    try {
      await updatePromptPreset(id, { isEnabled });
      await onReload();
    } catch (err) {
      setCardError(
        err instanceof ApiError
          ? err.message
          : "Failed to update item",
      );
    }
  }

  async function handleReorder(ids: string[]) {
    if (!selectedCharacter) return;
    setReordering(true);
    setCardError(null);
    try {
      await reorderPromptPresets(selectedCharacter.id, {
        ids,
      });
      await onReload();
    } catch (err) {
      setCardError(
        err instanceof ApiError
          ? err.message
          : "Failed to reorder items",
      );
    } finally {
      setReordering(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={onClose}
      >
        <div
          className="drawer"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0 }}>
              {t("chat.promptStackTitle")}
            </h3>
            <button
              className="icon-button"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {!selectedCharacter && (
            <div>{t("chat.promptStackSelectCharacter")}</div>
          )}

          {selectedCharacter && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <PromptStackPersonaSection
                character={selectedCharacter}
              />

              <StackCard
                items={items}
                roleFilter={roleFilter}
                onRoleFilterChange={setRoleFilter}
                reordering={reordering}
                stackState={stackState}
                attachError={cardError}
                onRemove={(id) => void handleRemove(id)}
                onReorder={(ids) =>
                  void handleReorder(ids)
                }
                onReload={() => void onReload()}
                onToggleEnabled={(id, enabled) =>
                  void handleToggle(id, enabled)
                }
              />

              <PromptStackAttachSection
                characterId={selectedCharacter.id}
                onAttached={() => onReload()}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

