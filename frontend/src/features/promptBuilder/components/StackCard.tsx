import { useTranslation } from "react-i18next";
import type { PromptStackItemView } from "../PromptStackList";
import { PromptStackList } from "../PromptStackList";
import type { RoleFilter } from "../types";

interface Props {
  items: PromptStackItemView[];
  roleFilter: RoleFilter;
  onRoleFilterChange(next: RoleFilter): void;
  reordering: boolean;
  stackState: { loading: boolean; error: string | null };
  attachError: string | null;
  onRemove(id: string): void;
  onReorder(ids: string[]): void;
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
}: Props) {
  const { t } = useTranslation();
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
        <PromptStackList
          items={items}
          onRemove={(id) => void onRemove(id)}
          onReorder={(ids) => void onReorder(ids)}
        />
      )}
    </div>
  );
}
