import { useTranslation } from "react-i18next";
import type { Preset, PresetKind } from "../../api/presets";

interface PresetPaletteProps {
  presets: Preset[];
  onAddPreset(presetId: string): void;
}

function groupByKind(presets: Preset[]): Map<PresetKind, Preset[]> {
  const map = new Map<PresetKind, Preset[]>();
  for (const preset of presets) {
    const list = map.get(preset.kind) ?? [];
    list.push(preset);
    map.set(preset.kind, list);
  }
  return map;
}

export function PresetPalette({
  presets,
  onAddPreset,
}: PresetPaletteProps) {
  const { t } = useTranslation();
  const byKind = groupByKind(presets);

  function renderSection(kind: PresetKind, title: string) {
    const items = byKind.get(kind) ?? [];
    if (items.length === 0) return null;

    return (
      <div key={kind} style={{ marginBottom: "1rem" }}>
        <div
          style={{
            fontWeight: 500,
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {items.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="list-button"
              onClick={() => onAddPreset(preset.id)}
            >
              <div className="list-button-text">
                <div className="list-button-title">
                  {preset.title}
                </div>
                {preset.description && (
                  <div className="list-button-subtitle">
                    {preset.description}
                  </div>
                )}
              </div>
              <span className="badge">
                {t("promptBuilder.paletteAddBadge")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderSection(
        "static_text",
        t("promptBuilder.paletteSectionStaticBlocks"),
      )}
    </div>
  );
}

