export interface TokenCounter {
  count(text: string): number;
  countAll(texts: string[]): number;
}

type CountTokensFn = (text: string, model?: string) => number;

let cachedCountTokens: CountTokensFn | null = null;
let attemptedLoad = false;

function loadCountTokens(): CountTokensFn | null {
  if (attemptedLoad) {
    return cachedCountTokens;
  }
  attemptedLoad = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("gpt-tokenizer") as {
      countTokens?: CountTokensFn;
    };
    if (typeof mod.countTokens === "function") {
      cachedCountTokens = mod.countTokens;
    }
  } catch {
    cachedCountTokens = null;
  }
  return cachedCountTokens;
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
  constructor(
    private readonly countTokensFn: CountTokensFn,
    private readonly model?: string,
  ) {}

  count(text: string): number {
    if (!text) return 0;
    return this.countTokensFn(text, this.model);
  }

  countAll(texts: string[]): number {
    return texts.reduce((sum, text) => sum + this.count(text), 0);
  }
}

export function createGptTokenCounter(model?: string): TokenCounter {
  const countTokensFn = loadCountTokens();
  if (!countTokensFn) {
    return createApproxTokenCounter();
  }
  return new GptTokenCounter(countTokensFn, model);
}
