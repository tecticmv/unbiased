/**
 * Input validation and sanitization utilities
 */

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(all\s+)?(previous|above|prior)/i,
  /you\s+are\s+now\s+a/i,
  /new\s+instructions?:/i,
  /system\s*prompt/i,
  /reveal\s+(your|the)\s+(prompt|instructions?)/i,
  /what\s+(are|is)\s+your\s+(instructions?|prompt)/i,
  /print\s+(your|the)\s+(prompt|instructions?)/i,
  /show\s+(your|the)\s+(prompt|instructions?)/i,
  /output\s+(your|the)\s+(prompt|instructions?)/i,
  /\{\s*"isValid"\s*:/i, // Attempting to inject JSON response
  /respond\s+with\s+(only\s+)?json/i,
  /return\s+true/i,
  /return\s*\{/i,
];

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizeInput(input: string): { sanitized: string; isSuspicious: boolean } {
  let sanitized = input;
  let isSuspicious = false;

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      isSuspicious = true;
      break;
    }
  }

  // Remove or escape potentially dangerous characters/sequences
  sanitized = sanitized
    // Remove excessive newlines that could be used to separate fake instructions
    .replace(/\n{3,}/g, "\n\n")
    // Remove backticks that could escape code blocks
    .replace(/`/g, "'")
    // Remove angle brackets
    .replace(/[<>]/g, "")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");

  return { sanitized, isSuspicious };
}
