import { useMemo } from "react";
import type { Message } from "../../../api/messages";
import { ToolResultContent } from "./ToolResultContent";

interface MessageListProps {
  messages: Message[];
  characterName: string | null;
}

const ROLE_LABEL: Record<Message["role"], string> = {
  user: "User",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
};

interface ToolCallMeta {
  name?: string;
  method?: string;
}

function extractToolCallMeta(messages: Message[]): Map<string, ToolCallMeta> {
  const map = new Map<string, ToolCallMeta>();

  for (const msg of messages) {
    if (msg.role !== "assistant" || !Array.isArray(msg.toolCalls)) continue;

    for (const call of msg.toolCalls as unknown[]) {
      if (!call || typeof call !== "object") continue;
      const callObj = call as Record<string, unknown>;
      const id = callObj.id;
      if (typeof id !== "string") continue;

      const name =
        typeof callObj.name === "string" ? callObj.name : undefined;

      let method: string | undefined;
      const args = callObj.arguments;
      if (args && typeof args === "object" && !Array.isArray(args)) {
        const rawMethod = (args as Record<string, unknown>).method;
        if (typeof rawMethod === "string" && rawMethod.trim() !== "") {
          method = rawMethod.trim().toUpperCase();
        }
      }

      map.set(id, { name, method });
    }
  }

  return map;
}

function shortId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function MessageItem({
  message,
  characterName,
  toolMeta,
}: {
  message: Message;
  characterName: string | null;
  toolMeta: Map<string, ToolCallMeta>;
}) {
  const roleLabel =
    message.role === "assistant"
      ? characterName ?? "Assistant"
      : message.role === "tool"
        ? toolMeta.get(message.toolCallId ?? "")?.name ??
          ROLE_LABEL[message.role] ??
          message.role
        : ROLE_LABEL[message.role] ?? message.role;
  const callId = shortId(message.toolCallId);
  const isTool = message.role === "tool";
  const toolInfo = isTool
    ? toolMeta.get(message.toolCallId ?? "")
    : undefined;

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">{roleLabel}</span>
        {isTool && (
          <div className="message-meta">
            <span className="badge badge-subtle">MCP</span>
            {toolInfo?.method && (
              <span className="badge badge-subtle">
                {toolInfo.method}
              </span>
            )}
            {callId && (
              <span className="badge badge-subtle">
                Call {callId}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="message-body">
        {isTool ? (
          <ToolResultContent message={message} />
        ) : (
          <div className="message-text">{message.content}</div>
        )}
      </div>
    </div>
  );
}

export function MessageList({ messages, characterName }: MessageListProps) {
  const toolMeta = useMemo(
    () => extractToolCallMeta(messages),
    [messages],
  );

  return (
    <>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          characterName={characterName}
          toolMeta={toolMeta}
        />
      ))}
    </>
  );
}
