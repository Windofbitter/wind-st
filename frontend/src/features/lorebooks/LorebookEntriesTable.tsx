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
import type { LorebookEntry } from "../../api/lorebooks";

interface LorebookEntriesTableProps {
  entries: LorebookEntry[];
  loading: boolean;
  error: string | null;
  editingId: string | null;
  onReorder(ids: string[]): void;
  onToggleEnabled(entryId: string, enabled: boolean): void;
  onEdit(entry: LorebookEntry): void;
  onDelete(entryId: string): void;
  renderEditor(entry: LorebookEntry): React.ReactNode;
}

export function LorebookEntriesTable({
  entries,
  loading,
  error,
  editingId,
  onReorder,
  onToggleEnabled,
  onEdit,
  onDelete,
  renderEditor,
}: LorebookEntriesTableProps) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = entries.map((entry) => entry.id);

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

  function moveEntry(entryId: string, delta: -1 | 1) {
    const idx = ids.indexOf(entryId);
    if (idx < 0) return;
    const newIndex = idx + delta;
    if (newIndex < 0 || newIndex >= ids.length) return;

    const newOrder = arrayMove(ids, idx, newIndex);
    onReorder(newOrder);
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>
        {t("lorebooks.entriesTitle")}
      </h3>
      {loading && (
        <div>{t("lorebooks.entriesLoading")}</div>
      )}
      {error && (
        <div className="badge badge-error">
          {t("common.errorPrefix")} {error}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={ids}
          strategy={verticalListSortingStrategy}
        >
          <table className="table">
            <thead>
              <tr>
                <th>{t("lorebooks.entriesTableKeywords")}</th>
                <th>{t("lorebooks.entriesTableContent")}</th>
                <th>{t("lorebooks.entriesTableOrder")}</th>
                <th>{t("lorebooks.entriesTableActive")}</th>
                <th>{t("lorebooks.entriesTableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <SortableEntryRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === entries.length - 1}
                  isEditing={editingId === entry.id}
                  onMove={moveEntry}
                  onToggleEnabled={onToggleEnabled}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  editor={editingId === entry.id ? renderEditor(entry) : null}
                />
              ))}
              {entries.length === 0 && !loading && (
                <tr>
                  <td colSpan={5}>
                    <span style={{ opacity: 0.8 }}>
                      {t("lorebooks.entriesEmpty")}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableEntryRowProps {
  entry: LorebookEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  onMove(entryId: string, delta: -1 | 1): void;
  onToggleEnabled(entryId: string, enabled: boolean): void;
  onEdit(entry: LorebookEntry): void;
  onDelete(entryId: string): void;
  editor: React.ReactNode;
}

function SortableEntryRow({
  entry,
  index,
  isFirst,
  isLast,
  isEditing,
  onMove,
  onToggleEnabled,
  onEdit,
  onDelete,
  editor,
}: SortableEntryRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <>
      <tr ref={setNodeRef} style={style}>
        <td>
          {entry.keywords.map((k) => (
            <span
              key={k}
              className="badge"
              style={{ marginRight: "0.25rem" }}
            >
              {k}
            </span>
          ))}
        </td>
        <td>
          {entry.content.split("\n")[0] ?? ""}
          {entry.content.includes("\n") ? "…" : ""}
        </td>
        <td>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <button
              type="button"
              className="btn"
              title={t("lorebooks.entriesReorderHandleTitle")}
              {...attributes}
              {...listeners}
              style={{
                cursor: "grab",
                padding: "0.15rem 0.4rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>⋮⋮</span>
            </button>
            <span>#{index + 1}</span>
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                marginLeft: "0.5rem",
              }}
            >
              <button
                type="button"
                className="btn"
                disabled={isFirst}
                title={t("lorebooks.entriesMoveUpTitle")}
                onClick={() => onMove(entry.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn"
                disabled={isLast}
                title={t("lorebooks.entriesMoveDownTitle")}
                onClick={() => onMove(entry.id, +1)}
              >
                ↓
              </button>
            </div>
          </div>
        </td>
        <td>
          <label>
            <input
              type="checkbox"
              checked={entry.isEnabled}
              onChange={(e) =>
                onToggleEnabled(entry.id, e.target.checked)
              }
            />
          </label>
        </td>
        <td>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onEdit(entry)}
            >
              {t("lorebooks.entriesEditButton")}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete(entry.id)}
            >
              {t("lorebooks.entriesDeleteButton")}
            </button>
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            {editor}
          </td>
        </tr>
      )}
    </>
  );
}
