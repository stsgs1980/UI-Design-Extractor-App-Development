import ZAI from "z-ai-web-dev-sdk";

/**
 * Classify an error from the page_reader SDK function.
 * Returns a user-friendly message and whether it's a retryable rate limit error.
 */
function classifyPageError(err: unknown): { userMessage: string; isRateLimit: boolean } {
  const msg = err instanceof Error ? err.message : String(err);

  const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("too many requests");

  if (isRateLimit) {
    return {
      userMessage: "Rate limited by the extraction service. Please wait a moment and try again.",
      isRateLimit: true,
    };
  }

  // Strip SDK wrappers, HTML, JSON blobs but keep the core message
  let cleaned = msg
    .replace(/\\u003c[^>]*\\u003e/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/Function invoke failed with status \d+: /, "")
    .replace(/Page reader failed: /, "")
    .replace(/request failed with status \d+: /, "")
    .replace(/\s*\{.*\}\s*/, "")
    .replace(/Failed to invoke remote function: /, "")
    .trim();

  if (!cleaned) {
    cleaned = "Page fetch failed. The site may be unreachable or blocking automated requests.";
  }

  return { userMessage: cleaned, isRateLimit: false };
}

/**
 * Fetch a page using the page_reader SDK function with retries.
 * - 5 retries for rate-limit (429) errors with exponential backoff + jitter
 * - 2 retries for other errors with fixed 2s delay
 */
export async function fetchPageWithRetry(
  url: string,
  {
    maxRetries = 5,
    onRetry,
  }: { maxRetries?: number; onRetry?: (attempt: number, delay: number) => void } = {},
): Promise<{ title: string; html: string }> {
  const zai = await ZAI.create();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await zai.functions.invoke("page_reader", { url });
      const title = result.data?.title || "";
      const html = result.data?.html || "";
      if (!html) throw new Error("Empty HTML received from page reader");
      return { title, html };
    } catch (err) {
      lastError = err;
      const { isRateLimit } = classifyPageError(err);

      if (attempt < maxRetries) {
        const delay = isRateLimit ? 3000 * Math.pow(2, attempt - 1) + Math.random() * 1000 : 2000;

        console.warn(
          `page_reader attempt ${attempt}/${maxRetries} failed for ${url} (${isRateLimit ? "rate-limited" : "error"}), retrying in ${Math.round(delay)}ms...`,
        );
        onRetry?.(attempt, delay);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  const { userMessage } = classifyPageError(lastError);
  throw new PageFetchError(userMessage);
}

/**
 * Custom error class for page fetch failures with a clean user-facing message.
 */
export class PageFetchError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = "PageFetchError";
  }
}
