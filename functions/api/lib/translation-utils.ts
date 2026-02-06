/**
 * Translation parsing utilities
 */

/**
 * Helper to clean and parse JSON from LLM response
 */
export const parseTranslationResponse = (text: string): Record<string, unknown> => {
  if (!text || !text.trim()) {
    throw new Error('Empty response from translation API');
  }

  let jsonStr = text;

  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    jsonStr = codeBlockMatch[1];
  } else {
    // Try to find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      jsonStr = jsonMatch[0];
    }
  }

  // Clean common JSON issues
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === '\n' || char === '\r' || char === '\t') return char;
      return '';
    });

  // First attempt - try parsing as-is
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    // Log the error position for debugging
    const posMatch = String(firstError).match(/position (\d+)/);
    const position = posMatch?.[1] ? parseInt(posMatch[1], 10) : 0;
    console.log(`JSON parse failed at position ${position}, attempting repair...`);

    // Attempt to repair truncated JSON by closing open structures
    let repaired = jsonStr;

    // Count open brackets and braces
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (const char of repaired) {
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }

    // If we ended inside a string, try to close it
    if (inString) {
      // Find the last complete property and truncate there
      const lastCompleteProperty = repaired.lastIndexOf('",');
      if (lastCompleteProperty > repaired.length * 0.8) {
        repaired = repaired.substring(0, lastCompleteProperty + 1);
        // Recount after truncation
        openBraces = 0;
        openBrackets = 0;
        for (const char of repaired) {
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }
      }
    }

    // Close any unclosed structures
    for (let i = 0; i < openBrackets; i++) repaired += ']';
    for (let i = 0; i < openBraces; i++) repaired += '}';

    try {
      const result = JSON.parse(repaired);
      console.log('JSON repair successful');
      return result;
    } catch (secondError) {
      // Log context around the error for debugging
      const start = Math.max(0, position - 100);
      const end = Math.min(jsonStr.length, position + 100);
      console.error(`JSON context around error: ...${jsonStr.substring(start, end)}...`);
      throw firstError; // Throw original error
    }
  }
};

/**
 * Helper to parse discussion translation response with robust error handling
 */
export const parseDiscussionTranslationResponse = (text: string): Array<{ id: number; content: string }> => {
  if (!text || !text.trim()) {
    throw new Error('Empty response from translation API');
  }

  let jsonStr = text;

  // Try to extract JSON from code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // Try to extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch?.[0]) {
      jsonStr = jsonMatch[0];
    }
  }

  // First attempt: direct parse
  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    // Second attempt: try to fix common JSON issues
    try {
      // Fix unescaped newlines in strings
      let fixed = jsonStr.replace(/(?<!\\)\n(?=[^"]*"[^"]*(?:"[^"]*"[^"]*)*$)/g, '\\n');
      // Fix unescaped tabs
      fixed = fixed.replace(/\t/g, '\\t');
      // Try parsing the fixed version
      return JSON.parse(fixed);
    } catch (secondError) {
      // Third attempt: extract individual objects and rebuild array
      try {
        const objectMatches = jsonStr.matchAll(/\{\s*"id"\s*:\s*(\d+)\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g);
        const results: Array<{ id: number; content: string }> = [];
        for (const match of objectMatches) {
          if (match[1] && match[2] !== undefined) {
            results.push({
              id: parseInt(match[1], 10),
              content: match[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
            });
          }
        }
        if (results.length > 0) {
          console.log(`Recovered ${results.length} translations from malformed JSON`);
          return results;
        }
      } catch (thirdError) {
        // Recovery failed
      }

      // Log the problematic response for debugging
      console.error('Failed to parse translation response. First 500 chars:', jsonStr.substring(0, 500));
      throw new Error(`Failed to parse translation JSON: ${firstError instanceof Error ? firstError.message : 'Unknown error'}`);
    }
  }
};
