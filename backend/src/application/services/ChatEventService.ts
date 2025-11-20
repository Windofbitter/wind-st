import { EventEmitter } from "events";
import type { ChatRun } from "../../core/entities/ChatRun";
import type { Message } from "../../core/entities/Message";

export type ChatEvent =
  | { type: "message"; message: Message }
  | { type: "run"; run: ChatRun };

type EventListener = (event: ChatEvent) => void;

export class ChatEventService {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Allow many listeners per chat without warnings.
    this.emitter.setMaxListeners(0);
  }

  subscribe(chatId: string, listener: EventListener): () => void {
    const key = this.toKey(chatId);
    this.emitter.on(key, listener);
    return () => {
      this.emitter.off(key, listener);
    };
  }

  publishMessage(chatId: string, message: Message): void {
    this.emit(chatId, { type: "message", message });
  }

  publishRun(chatId: string, run: ChatRun): void {
    this.emit(chatId, { type: "run", run });
  }

  private emit(chatId: string, event: ChatEvent): void {
    this.emitter.emit(this.toKey(chatId), event);
  }

  private toKey(chatId: string): string {
    return `chat:${chatId}`;
  }
}
