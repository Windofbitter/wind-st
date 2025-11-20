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

function shortId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function MessageItem({
  message,
  characterName,
}: {
  message: Message;
  characterName: string | null;
}) {
  const roleLabel =
    message.role === "assistant"
      ? characterName ?? "Assistant"
      : ROLE_LABEL[message.role] ?? message.role;
  const callId = shortId(message.toolCallId);
  const isTool = message.role === "tool";

  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <span className="message-role">{roleLabel}</span>
        {isTool && (
          <div className="message-meta">
            <span className="badge badge-subtle">MCP</span>
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
  return (
    <>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          characterName={characterName}
        />
      ))}
    </>
  );
}
