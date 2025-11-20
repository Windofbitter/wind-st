import type { ChatRun } from "./chatRuns";
import type { Message } from "./messages";

export type ChatEvent =
  | { type: "message"; message: Message }
  | { type: "run"; run: ChatRun };

export interface ChatEventHandlers {
  onEvent?: (event: ChatEvent) => void;
  onError?: (message: string) => void;
  onOpen?: () => void;
}

function buildStreamUrl(chatId: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
    /\/$/,
    "",
  );
  return `${base}/chats/${chatId}/events`;
}

export function connectToChatEvents(
  chatId: string,
  handlers: ChatEventHandlers,
): () => void {
  const url = buildStreamUrl(chatId);
  const source = new EventSource(url);

  const handleMessage = (evt: MessageEvent<string>) => {
    try {
      const parsed = JSON.parse(evt.data) as ChatEvent;
      handlers.onEvent?.(parsed);
    } catch (err) {
      handlers.onError?.(
        err instanceof Error
          ? err.message
          : "Failed to parse chat event payload",
      );
    }
  };

  source.addEventListener("message", handleMessage as EventListener);
  source.addEventListener("run", handleMessage as EventListener);
  source.addEventListener("open", () => handlers.onOpen?.());

  const handleStreamError = () => {
    handlers.onError?.("Lost connection to chat stream; retrying...");
  };
  source.addEventListener("error", handleStreamError);

  return () => {
    source.removeEventListener("message", handleMessage as EventListener);
    source.removeEventListener("run", handleMessage as EventListener);
    source.removeEventListener("error", handleStreamError);
    source.close();
  };
}
