import { countTokens } from "gpt-tokenizer";

export interface TokenCounter {
  count(text: string): number;
  countAll(texts: string[]): number;
}

// Approximates token counts using a simple character heuristic (chars / 4).
// Keeps dependencies light while still bounding prompt slices reasonably.
export class ApproxTokenCounter implements TokenCounter {
  count(text: string): number {
    if (!text) return 0;
    // Roughly aligns with common LLM token density for English text.
    return Math.ceil(text.length / 4);
  }

  countAll(texts: string[]): number {
    return texts.reduce((sum, text) => sum + this.count(text), 0);
  }
}

export function createApproxTokenCounter(): TokenCounter {
  return new ApproxTokenCounter();
}

export class GptTokenCounter implements TokenCounter {
  constructor(private readonly model?: string) {}

  count(text: string): number {
    if (!text) return 0;
    return countTokens(text, this.model);
  }

  countAll(texts: string[]): number {
    return texts.reduce((sum, text) => sum + this.count(text), 0);
  }
}

export function createGptTokenCounter(model?: string): TokenCounter {
  try {
    return new GptTokenCounter(model);
  } catch {
    // Fall back quietly if tokenizer fails to initialize.
    return createApproxTokenCounter();
  }
}
