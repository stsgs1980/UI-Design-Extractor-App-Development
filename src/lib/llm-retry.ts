import ZAI from 'z-ai-web-dev-sdk';

type ZaiInstance = Awaited<ReturnType<typeof ZAI.create>>;

type ChatMessage = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

type ChatCompletionParams = {
  messages: ChatMessage[];
  thinking?: { type: string };
};

/**
 * Call LLM with exponential backoff retry on 429 (rate limit) errors.
 * - Max 8 retries
 * - Base delay: 3s, multiplied by 2 each attempt + jitter
 * - Only retries on 429; other errors propagate immediately
 */
export async function llmWithRetry(
  zai: ZaiInstance,
  params: ChatCompletionParams,
  maxRetries = 8,
  baseDelayMs = 3000
): Promise<{ choices: Array<{ message?: { content?: string } }> }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await zai.chat.completions.create(params as Parameters<ZaiInstance['chat']['completions']['create']>[0]);
      return result as { choices: Array<{ message?: { content?: string } }> };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const is429 = lastError.message.includes('429');
      const isRateLimit = is429 || lastError.message.toLowerCase().includes('too many requests');

      if (!isRateLimit || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`[LLM Retry] 429 rate limited, retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('LLM call failed after retries');
}

/**
 * Sleep for a given number of milliseconds.
 * Use between sequential LLM calls to avoid rate limiting.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
