import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Character } from "../../../api/characters";
import type { PromptPreset } from "../../../api/promptStack";
import { detachPromptPreset } from "../../../api/promptStack";
import { getPreset } from "../../../api/presets";
import { ApiError } from "../../../api/httpClient";
import { PresetEditorPanel } from "../../promptStack/PresetEditorPanel";
import { LorebookEditorPanel } from "../../promptStack/LorebookEditorPanel";

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

export function PromptStackDrawer({
    isOpen,
    onClose,
    selectedCharacter,
    promptStack,
    promptStackState,
    onReload,
}: Props) {
    const { t } = useTranslation();
    const [error, setError] = useState<string | null>(null);

    // Edit state
    const [editingItem, setEditingItem] = useState<{ id: string; type: "preset" | "lorebook" } | null>(null);
    const [checkingItem, setCheckingItem] = useState<string | null>(null);

    async function handleDetach(id: string) {
        if (!confirm(t("chat.stackDetachConfirm") || "Remove this item from the stack?")) return;
        try {
            await detachPromptPreset(id);
            await onReload();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to detach item");
        }
    }

    async function handleEditClick(pp: PromptPreset) {
        setCheckingItem(pp.id);
        setError(null);
        try {
            // Try to fetch as preset first to check kind
            const preset = await getPreset(pp.presetId);
            if (preset.kind === "lorebook") {
                // If it's a lorebook preset, we need the lorebook ID.
                // Assuming the presetId might be the lorebookId or we can find it.
                // If the backend wraps lorebooks in presets, we need to know how to get the lorebook ID.
                // For now, let's try to use presetId as lorebookId if kind is lorebook.
                // Or check if config has it.
                const lbId = (preset.config as any)?.lorebookId || pp.presetId;
                setEditingItem({ id: lbId, type: "lorebook" });
            } else {
                setEditingItem({ id: pp.presetId, type: "preset" });
            }
        } catch (err) {
            // If getPreset fails, maybe it's a raw lorebook attached directly?
            // Try to assume it's a lorebook if we can't find a preset?
            // Or just show error.
            console.error("Failed to resolve preset kind", err);
            // Fallback: try to open as preset if we can't determine
            setEditingItem({ id: pp.presetId, type: "preset" });
        } finally {
            setCheckingItem(null);
        }
    }

    if (!isOpen) return null;

    return (
        <>
            <div className="drawer-backdrop" onClick={onClose}>
                <div className="drawer" onClick={(e) => e.stopPropagation()}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1rem",
                        }}
                    >
                        <h3 style={{ margin: 0 }}>{t("chat.promptStackTitle")}</h3>
                        <button className="icon-button" onClick={onClose}>
                            ✕
                        </button>
                    </div>

                    {promptStackState.error && (
                        <div className="badge badge-error">
                            Error: {promptStackState.error}
                        </div>
                    )}
                    {error && (
                        <div className="badge badge-error" style={{ marginBottom: "1rem" }}>
                            {t("common.errorPrefix")} {error}
                        </div>
                    )}

                    {!selectedCharacter && (
                        <div>{t("chat.promptStackSelectCharacter")}</div>
                    )}
                    {selectedCharacter && promptStackState.loading && (
                        <div>{t("chat.promptStackLoading")}</div>
                    )}
                    {selectedCharacter && !promptStackState.loading && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div className="card" style={{ margin: 0 }}>
                                <strong>{t("chat.personaTitle")}</strong>
                                <div
                                    style={{
                                        fontSize: "0.85rem",
                                        maxHeight: "6rem",
                                        overflowY: "auto",
                                        marginTop: "0.25rem",
                                        whiteSpace: "pre-wrap",
                                    }}
                                >
                                    {selectedCharacter.persona || (
                                        <span style={{ opacity: 0.7 }}>
                                            {t("chat.personaEmpty")}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="card" style={{ margin: 0 }}>
                                <strong>{t("chat.stackTitle")}</strong>
                                {promptStack.length === 0 && (
                                    <div style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                                        {t("chat.stackEmpty")}
                                    </div>
                                )}
                                <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0 0" }}>
                                    {promptStack
                                        .slice()
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((pp) => (
                                            <li
                                                key={pp.id}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    fontSize: "0.9rem",
                                                    padding: "0.5rem",
                                                    borderBottom: "1px solid var(--glass-border)",
                                                    backgroundColor: "rgba(0,0,0,0.1)",
                                                    marginBottom: "0.25rem",
                                                    borderRadius: "4px",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <span className="badge">
                                                        {pp.role.toUpperCase()}
                                                    </span>
                                                    <span>{pp.presetId}</span>
                                                </div>
                                                <div style={{ display: "flex", gap: "0.25rem" }}>
                                                    <button
                                                        className="icon-button"
                                                        style={{ width: "28px", height: "28px", fontSize: "0.9rem" }}
                                                        onClick={() => void handleEditClick(pp)}
                                                        disabled={checkingItem === pp.id}
                                                        title={t("common.edit") || "Edit"}
                                                    >
                                                        {checkingItem === pp.id ? "..." : "✎"}
                                                    </button>
                                                    <button
                                                        className="icon-button"
                                                        style={{ width: "28px", height: "28px", fontSize: "0.9rem", color: "var(--error-text)" }}
                                                        onClick={() => void handleDetach(pp.id)}
                                                        title={t("common.remove") || "Remove"}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </div>

                            {editingItem && (
                                <div className="card" style={{ margin: 0 }}>
                                    {editingItem.type === "preset" ? (
                                        <PresetEditorPanel
                                            presetId={editingItem.id}
                                            onSaved={() => {
                                                setEditingItem(null);
                                                void onReload();
                                            }}
                                            onCancel={() => setEditingItem(null)}
                                        />
                                    ) : (
                                        <LorebookEditorPanel
                                            lorebookId={editingItem.id}
                                            onSaved={() => {
                                                setEditingItem(null);
                                                void onReload();
                                            }}
                                            onCancel={() => setEditingItem(null)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
