import { http, unwrap } from "./httpClient";

export interface ChatHistoryConfig {
  historyEnabled: boolean;
  messageLimit: number;
  loreScanTokenLimit: number;
}

export type UpdateChatHistoryConfigRequest = Partial<ChatHistoryConfig>;

export async function getChatHistoryConfig(
  chatId: string,
): Promise<ChatHistoryConfig> {
  return unwrap(
    http.get<ChatHistoryConfig>(`/chats/${chatId}/history-config`),
  );
}

export async function updateChatHistoryConfig(
  chatId: string,
  payload: UpdateChatHistoryConfigRequest,
): Promise<ChatHistoryConfig> {
  return unwrap(
    http.patch<ChatHistoryConfig>(
      `/chats/${chatId}/history-config`,
      payload,
    ),
  );
}
