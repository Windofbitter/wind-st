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
              className="nav-link"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => onAddPreset(preset.id)}
            >
              <span>
                <div style={{ fontWeight: 500 }}>{preset.title}</div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.8,
                    marginTop: "0.1rem",
                  }}
                >
                  {preset.description}
                </div>
              </span>
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

