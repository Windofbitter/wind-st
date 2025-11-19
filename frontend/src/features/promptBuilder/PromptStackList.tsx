import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
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

export interface PromptStackItemView {
  id: string;
  title: string;
  role: PromptRole;
  kind?: PresetKind;
}

interface PromptStackListProps {
  items: PromptStackItemView[];
  onReorder(ids: string[]): void;
  onRemove(id: string): void;
}

export function PromptStackList({
  items,
  onReorder,
  onRemove,
}: PromptStackListProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = items.map((item) => item.id);

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
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
}

function SortableStackItem({
  item,
  onRemove,
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 0.75rem",
    borderRadius: 4,
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--sidebar-bg)",
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
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
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
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-danger"
        style={{ padding: "0.25rem 0.6rem" }}
        onClick={() => onRemove(item.id)}
      >
        {t("promptBuilder.stackRemoveButton")}
      </button>
    </div>
  );
}

