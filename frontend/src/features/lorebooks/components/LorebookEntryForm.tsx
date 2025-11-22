import { useTranslation } from "react-i18next";
import type { CreateLorebookEntryRequest, UpdateLorebookEntryRequest } from "../../../api/lorebooks";

interface LorebookEntryFormProps {
    form: CreateLorebookEntryRequest | UpdateLorebookEntryRequest;
    onChange: (form: any) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    error: string | null;
    isEditing?: boolean;
}

export function LorebookEntryForm({
    form,
    onChange,
    onSave,
    onCancel,
    saving,
    error,
    isEditing = false,
}: LorebookEntryFormProps) {
    const { t } = useTranslation();

    return (
        <div className="card" style={{ margin: 0, backgroundColor: isEditing ? "#1a1a1a" : undefined }}>
            <h4 style={{ marginTop: 0 }}>
                {isEditing ? t("lorebooks.editEntryTitle") : t("lorebooks.newEntryTitle")}
            </h4>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-keywords" : "entry-keywords"}>
                    {isEditing ? t("lorebooks.editEntryKeywordsLabel") : t("lorebooks.newEntryKeywordsLabel")}
                </label>
                <input
                    id={isEditing ? "edit-keywords" : "entry-keywords"}
                    type="text"
                    placeholder={!isEditing ? t("lorebooks.newEntryKeywordsPlaceholder") : undefined}
                    value={(form.keywords ?? []).join(", ")}
                    onChange={(e) =>
                        onChange({
                            ...form,
                            keywords: e.target.value
                                .split(",")
                                .map((k) => k.trim())
                                .filter(Boolean),
                        })
                    }
                />
                {!isEditing && (
                    <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
                        {t("lorebooks.newEntryKeywordsHint")}
                    </div>
                )}
            </div>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-content" : "entry-content"}>
                    {isEditing ? t("lorebooks.editEntryContentLabel") : t("lorebooks.newEntryContentLabel")}
                </label>
                <textarea
                    id={isEditing ? "edit-content" : "entry-content"}
                    rows={4}
                    value={form.content ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...form,
                            content: e.target.value,
                        })
                    }
                />
            </div>
            <div className="input-group">
                <label>
                    <input
                        type="checkbox"
                        checked={form.isEnabled ?? true}
                        onChange={(e) =>
                            onChange({
                                ...form,
                                isEnabled: e.target.checked,
                            })
                        }
                    />{" "}
                    {isEditing ? t("lorebooks.editEntryEnabledLabel") : t("lorebooks.newEntryActiveLabel")}
                </label>
                {!isEditing && (
                    <div
                        style={{
                            fontSize: "0.85rem",
                            opacity: 0.8,
                            marginTop: "0.25rem",
                        }}
                    >
                        {t("lorebooks.newEntryActiveHint")}
                    </div>
                )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={onSave}
                >
                    {saving
                        ? isEditing
                            ? t("lorebooks.editEntrySaveButtonSaving")
                            : t("lorebooks.newEntryCreateButtonCreating")
                        : isEditing
                            ? t("lorebooks.editEntrySaveButton")
                            : t("lorebooks.newEntryCreateButton")}
                </button>
                {isEditing && (
                    <button
                        type="button"
                        className="btn"
                        onClick={onCancel}
                    >
                        {t("lorebooks.editEntryCancelButton")}
                    </button>
                )}
            </div>
            {error && (
                <div
                    className="badge badge-error"
                    style={{ marginTop: "0.5rem" }}
                >
                    {t("common.errorPrefix")} {error}
                </div>
            )}
        </div>
    );
}
