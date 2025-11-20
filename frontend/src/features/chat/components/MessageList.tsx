import { useMemo } from "react";
import type { Message } from "../../../api/messages";
import type { ChatRun } from "../../../api/runs";
import { ToolResultContent } from "./ToolResultContent";
import { MarkdownMessage } from "./MarkdownMessage";

interface MessageListProps {
  messages: Message[];
  characterName: string | null;
  runs: ChatRun[];
  onRetryMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
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
  onDelete,
  onRetry,
  showRetry,
}: {
  message: Message;
  characterName: string | null;
  toolMeta: Map<string, ToolCallMeta>;
  onDelete: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
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
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          {showRetry && (
            <button
              className="icon-button"
              type="button"
              aria-label="Retry turn"
              onClick={onRetry}
              title="Retry this turn"
            >
              ⟳
            </button>
          )}
          <button
            className="icon-button"
            type="button"
            aria-label="Delete message"
            onClick={onDelete}
            title="Delete message"
          >
            🗑️
          </button>
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
      </div>
      <div className="message-body">
        {isTool ? (
          <ToolResultContent message={message} />
        ) : (
          <MarkdownMessage content={message.content} />
        )}
      </div>
    </div>
  );
}

function AssistantPlaceholder({
  run,
  characterName,
  onRetry,
}: {
  run: ChatRun;
  characterName: string | null;
  onRetry: () => void;
}) {
  const retryable = run.status === "failed" && !run.assistantMessageId;
  const label = characterName ?? "Assistant";

  return (
    <div className="message assistant">
      <div className="message-header">
        <span className="message-role">{label}</span>
      </div>
      <div className="message-body">
        {retryable ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="badge badge-error" style={{ alignSelf: "flex-start" }}>
              {run.error ?? "Generation failed."}
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onRetry}
              style={{ alignSelf: "flex-start" }}
            >
              Retry this turn
            </button>
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>
            {run.status === "running" || run.status === "pending"
              ? "Assistant is thinking..."
              : "Awaiting response."}
          </div>
        )}
      </div>
    </div>
  );
}

function latestRunsByUser(runs: ChatRun[]): Map<string, ChatRun> {
  const sorted = [...runs].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const map = new Map<string, ChatRun>();
  for (const run of sorted) {
    map.set(run.userMessageId, run);
  }
  return map;
}

export function MessageList({
  messages,
  characterName,
  runs,
  onRetryMessage,
  onDeleteMessage,
}: MessageListProps) {
  const toolMeta = useMemo(
    () => extractToolCallMeta(messages),
    [messages],
  );

  const runsByUser = useMemo(() => latestRunsByUser(runs), [runs]);
  const latestUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const items: Array<
    | { type: "message"; message: Message }
    | { type: "placeholder"; key: string; run: ChatRun; userMessageId: string }
  > = [];

  for (const msg of messages) {
    items.push({ type: "message", message: msg });
    if (msg.role === "user") {
      const run = runsByUser.get(msg.id);
      const needsAssistant =
        run && !run.assistantMessageId && (run.status === "failed" || run.status === "running" || run.status === "pending");
      if (run && needsAssistant) {
        items.push({
          type: "placeholder",
          key: `run-${run.id}`,
          run,
          userMessageId: msg.id,
        });
      }
    }
  }

  return (
    <>
      {items.map((item) => {
        if (item.type === "message") {
          const isLatestUser =
            item.message.role === "user" &&
            latestUserId === item.message.id;
          return (
            <MessageItem
              key={item.message.id}
              message={item.message}
              characterName={characterName}
              toolMeta={toolMeta}
              onDelete={() => onDeleteMessage(item.message.id)}
              onRetry={
                isLatestUser
                  ? () => onRetryMessage(item.message.id)
                  : undefined
              }
              showRetry={isLatestUser}
            />
          );
        }

        return (
          <AssistantPlaceholder
            key={item.key}
            run={item.run}
            characterName={characterName}
            onRetry={() => onRetryMessage(item.userMessageId)}
          />
        );
      })}
    </>
  );
}
