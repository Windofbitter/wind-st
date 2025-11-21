import { useTranslation } from "react-i18next";
import type { Lorebook } from "../../../api/lorebooks";

interface Props {
  lorebooks: Lorebook[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onAttach(): void;
}

export function AddLorebookRow({
  lorebooks,
  loading,
  error,
  selectedId,
  onSelect,
  onAttach,
}: Props) {
  const { t } = useTranslation();
  if (loading) {
    return <div>{t("lorebooks.listLoading")}</div>;
  }
  if (error) {
    return (
      <div className="badge badge-error">
        {t("common.errorPrefix")} {error}
      </div>
    );
  }
  if (lorebooks.length === 0) {
    return (
      <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
        {t("lorebooks.listEmpty")}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <select
        className="select"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
      >
        {lorebooks.map((lb) => (
          <option key={lb.id} value={lb.id}>
            {lb.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn"
        onClick={onAttach}
        disabled={!selectedId}
      >
        {t("promptBuilder.paletteAddBadge")}
      </button>
    </div>
  );
}
