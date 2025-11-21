import type { ChatHistoryConfig } from "../../core/entities/ChatHistoryConfig";
import type {
  ChatHistoryConfigRepository,
  UpdateChatHistoryConfigInput,
} from "../../core/ports/ChatHistoryConfigRepository";

export interface EffectiveHistoryConfig {
  historyEnabled: boolean;
  messageLimit: number;
  loreScanTokenLimit: number;
}

const DEFAULT_HISTORY_CONFIG: EffectiveHistoryConfig = {
  historyEnabled: true,
  messageLimit: 20,
  loreScanTokenLimit: 1500,
};

export class HistoryConfigService {
  constructor(
    private readonly repo: ChatHistoryConfigRepository,
  ) {}

  async getHistoryConfig(chatId: string): Promise<EffectiveHistoryConfig> {
    const cfg = await this.repo.getByChatId(chatId);
    if (!cfg) return DEFAULT_HISTORY_CONFIG;

    return {
      historyEnabled: cfg.historyEnabled,
      messageLimit: cfg.messageLimit,
      loreScanTokenLimit: cfg.loreScanTokenLimit,
    };
  }

  async updateHistoryConfig(
    chatId: string,
    patch: UpdateChatHistoryConfigInput,
  ): Promise<ChatHistoryConfig> {
    const existing = await this.repo.getByChatId(chatId);

    if (!existing) {
      const base: EffectiveHistoryConfig = {
        historyEnabled:
          patch.historyEnabled ?? DEFAULT_HISTORY_CONFIG.historyEnabled,
        messageLimit:
          patch.messageLimit ?? DEFAULT_HISTORY_CONFIG.messageLimit,
        loreScanTokenLimit:
          patch.loreScanTokenLimit ?? DEFAULT_HISTORY_CONFIG.loreScanTokenLimit,
      };
      return this.repo.create({
        chatId,
        historyEnabled: base.historyEnabled,
        messageLimit: base.messageLimit,
        loreScanTokenLimit: base.loreScanTokenLimit,
      });
    }

    const updated = await this.repo.updateByChatId(chatId, patch);
    // Update always returns a row when one exists.
    return updated ?? existing;
  }
}
