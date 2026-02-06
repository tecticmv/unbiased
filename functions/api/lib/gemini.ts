/**
 * Gemini API error handling and retry logic
 */

// Error types that are retryable
const RETRYABLE_ERROR_PATTERNS = [
  /rate limit/i,
  /quota exceeded/i,
  /too many requests/i,
  /429/,
  /500/,
  /502/,
  /503/,
  /504/,
  /internal server error/i,
  /service unavailable/i,
  /gateway timeout/i,
  /overloaded/i,
  /temporarily unavailable/i,
  /resource exhausted/i,
  /deadline exceeded/i,
  /connection reset/i,
  /network error/i,
  /fetch failed/i,
];

// Error types that should not be retried (user/input errors)
const NON_RETRYABLE_ERROR_PATTERNS = [
  /invalid api key/i,
  /permission denied/i,
  /unauthorized/i,
  /forbidden/i,
  /not found/i,
  /invalid argument/i,
  /bad request/i,
  /content blocked/i,
  /safety/i,
  /harmful/i,
];

// Classify error for appropriate handling
export type GeminiErrorType = "retryable" | "non_retryable" | "unknown";

export const classifyGeminiError = (error: unknown): { type: GeminiErrorType; message: string; userMessage: string } => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for non-retryable errors first
  for (const pattern of NON_RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        type: "non_retryable",
        message: errorMessage,
        userMessage: getReadableErrorMessage(errorMessage, "non_retryable"),
      };
    }
  }

  // Check for retryable errors
  for (const pattern of RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return {
        type: "retryable",
        message: errorMessage,
        userMessage: getReadableErrorMessage(errorMessage, "retryable"),
      };
    }
  }

  return {
    type: "unknown",
    message: errorMessage,
    userMessage: "An unexpected error occurred. Please try again.",
  };
};

// Convert technical errors to user-friendly messages
const getReadableErrorMessage = (errorMessage: string, type: GeminiErrorType): string => {
  const lowerMessage = errorMessage.toLowerCase();

  if (type === "retryable") {
    if (lowerMessage.includes("rate limit") || lowerMessage.includes("quota") || lowerMessage.includes("429")) {
      return "The AI service is currently busy. Please wait a moment and try again.";
    }
    if (lowerMessage.includes("overloaded") || lowerMessage.includes("503")) {
      return "The AI service is temporarily overloaded. Please try again in a few seconds.";
    }
    if (lowerMessage.includes("timeout") || lowerMessage.includes("deadline")) {
      return "The request took too long. Please try again.";
    }
    return "A temporary error occurred. Please try again.";
  }

  if (type === "non_retryable") {
    if (lowerMessage.includes("safety") || lowerMessage.includes("harmful") || lowerMessage.includes("blocked")) {
      return "Your request could not be processed due to content restrictions. Please modify your input and try again.";
    }
    if (lowerMessage.includes("invalid") || lowerMessage.includes("bad request")) {
      return "There was an issue with the request. Please check your input and try again.";
    }
    return "This request cannot be processed. Please modify your input and try again.";
  }

  return "An unexpected error occurred. Please try again.";
};

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// Calculate delay with exponential backoff and jitter
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  // Add jitter (±20%) to prevent thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
};

// Sleep helper
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Custom error class for Gemini API errors
export class GeminiAPIError extends Error {
  public userMessage: string;
  public wasRetried: boolean;

  constructor(message: string, userMessage: string, wasRetried: boolean) {
    super(message);
    this.name = "GeminiAPIError";
    this.userMessage = userMessage;
    this.wasRetried = wasRetried;
  }
}

// Generic retry wrapper for Gemini API calls
export async function withGeminiRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: unknown, delay: number) => void
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const classification = classifyGeminiError(error);

      // Don't retry non-retryable errors
      if (classification.type === "non_retryable") {
        throw new GeminiAPIError(classification.message, classification.userMessage, false);
      }

      // If we've exhausted retries, throw
      if (attempt === fullConfig.maxRetries) {
        throw new GeminiAPIError(
          classification.message,
          `${classification.userMessage} (after ${fullConfig.maxRetries} retries)`,
          true
        );
      }

      // Calculate delay and wait before retrying
      const delay = calculateRetryDelay(attempt, fullConfig);
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }
      console.log(`Gemini API retry ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms: ${classification.message}`);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

// Helper to extract user-friendly error message from any error
export const getUserFriendlyError = (error: unknown): string => {
  if (error instanceof GeminiAPIError) {
    return error.userMessage;
  }
  const classification = classifyGeminiError(error);
  return classification.userMessage;
};
