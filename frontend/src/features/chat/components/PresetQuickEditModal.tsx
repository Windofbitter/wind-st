import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    getPreset,
    updatePreset,
    type Preset,
    type UpdatePresetRequest,
} from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";

interface Props {
    presetId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PresetQuickEditModal({ presetId, isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const [preset, setPreset] = useState<Preset | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<UpdatePresetRequest>({});

    useEffect(() => {
        if (isOpen && presetId) {
            void loadPreset(presetId);
        }
    }, [isOpen, presetId]);

    async function loadPreset(id: string) {
        setLoading(true);
        setError(null);
        try {
            const data = await getPreset(id);
            setPreset(data);
            setForm({
                title: data.title,
                description: data.description,
                content: data.content,
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load preset");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!presetId) return;
        setSaving(true);
        setError(null);
        try {
            await updatePreset(presetId, form);
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save preset");
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                    }}
                >
                    <h3 style={{ margin: 0 }}>{t("presets.editTitle") || "Edit Preset"}</h3>
                    <button className="icon-button" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {loading && <div>{t("common.loading") || "Loading..."}</div>}
                {error && (
                    <div className="badge badge-error" style={{ marginBottom: "1rem" }}>
                        {t("common.errorPrefix")} {error}
                    </div>
                )}

                {!loading && preset && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="input-group">
                            <label>{t("presets.titleLabel") || "Title"}</label>
                            <input
                                type="text"
                                value={form.title ?? ""}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t("presets.descriptionLabel") || "Description"}</label>
                            <textarea
                                value={form.description ?? ""}
                                onChange={(e) =>
                                    setForm({ ...form, description: e.target.value })
                                }
                                rows={2}
                            />
                        </div>
                        {preset.kind === "static_text" && (
                            <div className="input-group">
                                <label>{t("presets.contentLabel") || "Content"}</label>
                                <textarea
                                    value={form.content ?? ""}
                                    onChange={(e) =>
                                        setForm({ ...form, content: e.target.value })
                                    }
                                    rows={6}
                                    style={{ fontFamily: "monospace" }}
                                />
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button className="btn" onClick={onClose}>
                                {t("common.cancel") || "Cancel"}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => void handleSave()}
                                disabled={saving}
                            >
                                {saving ? (t("common.saving") || "Saving...") : (t("common.save") || "Save")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
