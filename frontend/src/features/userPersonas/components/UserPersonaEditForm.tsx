import { useTranslation } from "react-i18next";
import { Toggle } from "../../../components/common/Toggle";

interface UserPersonaFormState {
    name: string;
    description: string;
    prompt: string;
    isDefault: boolean;
}

interface UserPersonaEditFormProps {
    form: UserPersonaFormState;
    onChange: (form: UserPersonaFormState) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    error: string | null;
    isEditing?: boolean;
}

export function UserPersonaEditForm({
    form,
    onChange,
    onSave,
    onCancel,
    saving,
    error,
    isEditing = false,
}: UserPersonaEditFormProps) {
    const { t } = useTranslation();

    return (
        <div className="card" style={{ margin: 0, backgroundColor: isEditing ? "#1a1a1a" : undefined }}>
            <h4 style={{ marginTop: 0 }}>
                {isEditing ? t("userPersonas.editTitle") : t("userPersonas.newTitle")}
            </h4>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-name" : "persona-name"}>
                    {t("userPersonas.nameLabel")}
                </label>
                <input
                    id={isEditing ? "edit-name" : "persona-name"}
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                        onChange({ ...form, name: e.target.value })
                    }
                    required
                />
            </div>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-description" : "persona-description"}>
                    {t("userPersonas.descriptionLabel")}
                </label>
                <textarea
                    id={isEditing ? "edit-description" : "persona-description"}
                    value={form.description}
                    onChange={(e) =>
                        onChange({ ...form, description: e.target.value })
                    }
                />
            </div>
            <div className="input-group">
                <label htmlFor={isEditing ? "edit-prompt" : "persona-prompt"}>
                    {t("userPersonas.promptLabel")}
                </label>
                <textarea
                    id={isEditing ? "edit-prompt" : "persona-prompt"}
                    value={form.prompt}
                    onChange={(e) =>
                        onChange({ ...form, prompt: e.target.value })
                    }
                />
            </div>
            <div className="input-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.35rem" }}>
                <Toggle
                    checked={form.isDefault}
                    onChange={(checked) =>
                        onChange({ ...form, isDefault: checked })
                    }
                    label={t("userPersonas.isDefaultLabel")}
                />
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
                            ? t("userPersonas.editSaveButtonSaving")
                            : t("userPersonas.createButtonCreating")
                        : isEditing
                            ? t("userPersonas.editSaveButton")
                            : t("userPersonas.createButton")}
                </button>
                {isEditing && (
                    <button
                        type="button"
                        className="btn"
                        onClick={onCancel}
                    >
                        {t("userPersonas.editCancelButton")}
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
