import { useMemo, useState } from "react";
import type { Message } from "../../../api/messages";

const PREVIEW_LINE_LIMIT = 20;
const PREVIEW_CHAR_LIMIT = 2400;
const PREVIEW_COLLAPSE_MIN_LINES = 1;

function toDisplayString(value: unknown): { text: string; isJson: boolean } {
  if (value === null || value === undefined) {
    return { text: "", isJson: false };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const looksLikeJson =
      (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
      (trimmed.endsWith("}") || trimmed.endsWith("]"));
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        return { text: JSON.stringify(parsed, null, 2), isJson: true };
      } catch {
        // Fall back to the raw string if it isn't valid JSON.
      }
    }
    return { text: value, isJson: false };
  }

  try {
    return { text: JSON.stringify(value, null, 2), isJson: true };
  } catch {
    return { text: String(value), isJson: false };
  }
}

function buildPreview(text: string): { preview: string; truncated: boolean } {
  const lines = text.split(/\r?\n/);
  if (lines.length > PREVIEW_COLLAPSE_MIN_LINES) {
    const sliced = lines.slice(0, PREVIEW_LINE_LIMIT).join("\n");
    const clipped =
      sliced.length > PREVIEW_CHAR_LIMIT
        ? sliced.slice(0, PREVIEW_CHAR_LIMIT)
        : sliced;
    return {
      preview: clipped,
      truncated: true,
    };
  }

  if (text.length > PREVIEW_CHAR_LIMIT) {
    return {
      preview: text.slice(0, PREVIEW_CHAR_LIMIT),
      truncated: true,
    };
  }

  return { preview: text, truncated: false };
}

interface ToolResultContentProps {
  message: Message;
}

export function ToolResultContent({ message }: ToolResultContentProps) {
  const [expanded, setExpanded] = useState(false);

  const display = useMemo(() => {
    const raw = message.toolResults ?? message.content;
    return toDisplayString(raw);
  }, [message.content, message.toolResults]);

  const preview = useMemo(
    () => buildPreview(display.text),
    [display.text],
  );

  const body = expanded || !preview.truncated ? display.text : preview.preview;

  return (
    <div className="tool-result">
      <pre className="tool-output">{body}</pre>
      {preview.truncated && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Collapse" : "Show full"}
          </button>
          <span className="tool-hint">
            {display.isJson
              ? "Pretty JSON view; expanded for full output."
              : "Showing preview; expand to see everything."}
          </span>
        </div>
      )}
    </div>
  );
}
