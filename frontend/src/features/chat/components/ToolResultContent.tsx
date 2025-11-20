import { useMemo, useState } from "react";
import type { Message } from "../../../api/messages";

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

interface ToolResultContentProps {
  message: Message;
}

export function ToolResultContent({ message }: ToolResultContentProps) {
  const [expanded, setExpanded] = useState(false);

  const display = useMemo(() => {
    const raw = message.toolResults ?? message.content;
    return toDisplayString(raw);
  }, [message.content, message.toolResults]);

  return (
    <div className="tool-result">
      {expanded ? (
        <>
          <pre className="tool-output">{display.text}</pre>
          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setExpanded(false)}
            >
              Collapse
            </button>
            <span className="tool-hint">
              {display.isJson ? "Pretty JSON view." : "Full output shown."}
            </span>
          </div>
        </>
      ) : (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setExpanded(true)}
          >
            Show result
          </button>
          <span className="tool-hint">
            Tool output hidden; expand to view the full content.
          </span>
        </div>
      )}
    </div>
  );
}
