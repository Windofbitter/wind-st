import { useTranslation } from "react-i18next";
import type { CreatePresetRequest, UpdatePresetRequest, PresetKind } from "../../../api/presets";

interface PresetEditFormProps {
    form: CreatePresetRequest | UpdatePresetRequest;
    onChange: (form: any) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    error: string | null;
    isEditing?: boolean;
}

export function PresetEditForm({
    form,
    onChange,
    onSave,
    onCancel,
    saving,
    error,
    isEditing = false,
}: PresetEditFormProps) {
    const { t } = useTranslation();

    return (
        <div className="card" style={{ margin: 0, backgroundColor: isEditing ? "#1a1a1a" : undefined }}>
            <h4 style={{ marginTop: 0 }}>
                {isEditing ? t("presets.editTitle") : t("presets.newTitle")}
            </h4>
            <div className="flex-row">
                <div className="input-group" style={{ flex: 1 }}>
                    <label htmlFor={isEditing ? "edit-title" : "preset-title"}>
                        {isEditing ? t("presets.editFormTitleLabel") : t("presets.newFormTitleLabel")}
                    </label>
                    <input
                        id={isEditing ? "edit-title" : "preset-title"}
                        type="text"
                        value={form.title ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...form,
                                title: e.target.value,
                            })
                        }
                        required={!isEditing}
                    />
                </div>
                {!isEditing && (
                    <div className="input-group" style={{ width: 220 }}>
                        <label htmlFor="preset-kind-new">
                            {t("presets.newFormKindLabel")}
                        </label>
                        <select
                            id="preset-kind-new"
                            value={form.kind}
                            onChange={(e) =>
                                onChange({
                                    ...form,
                                    kind: e.target.value as PresetKind,
                                })
                            }
                        >
                            <option value="static_text">
                                {t("presets.filtersKindStaticText")}
                            </option>
                        </select>
                    </div>
                )}
            </div>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-description" : "preset-description"}>
                    {isEditing ? t("presets.editFormDescriptionLabel") : t("presets.newFormDescriptionLabel")}
                </label>
                <textarea
                    id={isEditing ? "edit-description" : "preset-description"}
                    value={form.description ?? ""}
                    onChange={(e) =>
                        onChange({
                            ...form,
                            description: e.target.value,
                        })
                    }
                />
            </div>
            {(form.kind === "static_text" || isEditing) && (
                <div className="input-group">
                    <label htmlFor={isEditing ? "edit-content" : "preset-content"}>
                        {isEditing ? t("presets.editFormContentLabel") : t("presets.newFormContentLabel")}
                    </label>
                    <textarea
                        id={isEditing ? "edit-content" : "preset-content"}
                        value={form.content ?? ""}
                        onChange={(e) =>
                            onChange({
                                ...form,
                                content: e.target.value,
                            })
                        }
                    />
                </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving}
                    onClick={onSave}
                >
                    {saving
                        ? isEditing
                            ? t("presets.editSaveButtonSaving")
                            : t("presets.newCreateButtonCreating")
                        : isEditing
                            ? t("presets.editSaveButton")
                            : t("presets.newCreateButton")}
                </button>
                {isEditing && (
                    <button
                        type="button"
                        className="btn"
                        onClick={onCancel}
                    >
                        {t("presets.editCancelButton")}
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
