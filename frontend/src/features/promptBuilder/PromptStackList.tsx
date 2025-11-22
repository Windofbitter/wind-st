import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import type { PromptRole } from "../../api/promptStack";
import type { PresetKind } from "../../api/presets";
import { Toggle } from "../../components/common/Toggle";

export interface PromptStackItemView {
  id: string;
  title: string;
  role: PromptRole;
  kind?: PresetKind;
  locked?: boolean;
  presetId: string;
  lorebookId?: string;
  isEnabled: boolean;
}

interface PromptStackListProps {
  items: PromptStackItemView[];
  editingId: string | null;
  onReorder(ids: string[]): void;
  onRemove(id: string): void;
  onEdit(item: PromptStackItemView): void;
  onToggle(id: string, isEnabled: boolean): void;
  renderEditor(item: PromptStackItemView): React.ReactNode;
}

export function PromptStackList({
  items,
  editingId,
  onReorder,
  onRemove,
  onEdit,
  onToggle,
  renderEditor,
}: PromptStackListProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = items.map((item) => item.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = typeof active.id === "string" ? active.id : `${active.id}`;
    const overId = typeof over.id === "string" ? over.id : `${over.id}`;

    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);
    onReorder(newOrder);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {items.map((item) => (
            <SortableStackItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onEdit={onEdit}
              onToggle={onToggle}
              isEditing={editingId === item.id}
              editor={editingId === item.id ? renderEditor(item) : null}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableStackItemProps {
  item: PromptStackItemView;
  onRemove(id: string): void;
  onEdit(item: PromptStackItemView): void;
  onToggle(id: string, isEnabled: boolean): void;
  isEditing: boolean;
  editor: React.ReactNode;
}

function SortableStackItem({
  item,
  onRemove,
  onEdit,
  onToggle,
  isEditing,
  editor,
}: SortableStackItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const isDisabled = item.isEnabled === false;

  const containerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : isDisabled ? 0.65 : 1,
  };

  const roleLabel = item.role.toUpperCase();
  let kindLabel: string | undefined;
  if (item.kind === "static_text") {
    kindLabel = t("promptBuilder.kindLabelStaticText");
  } else if (item.kind === "lorebook") {
    kindLabel = t("promptBuilder.kindLabelLorebook");
  } else if (item.kind === "history") {
    kindLabel = t("promptBuilder.kindLabelHistory");
  } else if (item.kind === "mcp_tools") {
    kindLabel = t("promptBuilder.kindLabelMcpTools");
  }

  return (
    <div ref={setNodeRef} style={containerStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.75rem",
          borderRadius: 4,
          border: "1px solid var(--border-color)",
          backgroundColor: isDisabled
            ? "var(--card-bg)"
            : "var(--sidebar-bg)",
          borderBottomLeftRadius: isEditing ? 0 : 4,
          borderBottomRightRadius: isEditing ? 0 : 4,
        }}
      >
        <div
          {...attributes}
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            cursor: "grab",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>⋮⋮</span>
          <div>
            <div style={{ fontWeight: 500 }}>{item.title}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span className="badge">{roleLabel}</span>
              {kindLabel && (
                <span className="badge">
                  {kindLabel.charAt(0).toUpperCase() +
                    kindLabel.slice(1)}
                </span>
              )}
              {item.locked && (
                <span className="badge badge-secondary">
                  {t("promptBuilder.stackLocked")}
                </span>
              )}
              {isDisabled && (
                <span className="badge badge-secondary">
                  {t("promptBuilder.stackDisabled")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Toggle
            checked={item.isEnabled}
            onChange={(next) => onToggle(item.id, next)}
            label={t("promptBuilder.stackToggleLabel")}
            disabled={isDragging}
          />
          <button
            type="button"
            className="btn"
            style={{ padding: "0.25rem 0.6rem" }}
            onClick={() => onEdit(item)}
            disabled={item.locked === true}
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: "0.25rem 0.6rem" }}
            onClick={() => !item.locked && onRemove(item.id)}
            disabled={item.locked === true}
          >
            {t("promptBuilder.stackRemoveButton")}
          </button>
        </div>
      </div>
      {isEditing && editor && (
        <div
          style={{
            border: "1px solid var(--border-color)",
            borderTop: "none",
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            padding: "0.5rem 0.75rem",
            marginTop: "-1px",
            backgroundColor: "var(--card-bg)",
          }}
        >
          {editor}
        </div>
      )}
    </div>
  );
}

