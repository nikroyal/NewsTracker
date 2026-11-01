/**
 * Robust JSON Sanitizer and Truncation Repair
 * Inspired by enterprise AI-Ops recovery patterns in BusinessOS
 */

/**
 * Repairs truncated JSON strings by balancing open braces and brackets
 */
export function tryRepairTruncatedJson(str: string): string {
  const openBrackets: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{' || char === '[') {
      openBrackets.push(char);
    } else if (char === '}') {
      if (openBrackets[openBrackets.length - 1] === '{') {
        openBrackets.pop();
      }
    } else if (char === ']') {
      if (openBrackets[openBrackets.length - 1] === '[') {
        openBrackets.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  // Remove trailing commas before closing brackets
  repaired = repaired.trim().replace(/,\s*$/, '');

  while (openBrackets.length > 0) {
    const last = openBrackets.pop();
    if (last === '{') {
      repaired += '}';
    } else if (last === '[') {
      repaired += ']';
    }
  }

  return repaired;
}

/**
 * Extracts and safely parses JSON from arbitrary LLM text outputs.
 * Handles markdown code fences, surrounding conversational text, single quotes, and trailing commas.
 */
export function extractAndParseJson(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  const trimmed = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Proceed to extraction heuristics
  }

  // 2. Check for markdown code fences (```json ... ``` or ``` ...)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(trimmed)) !== null) {
    const content = match[1].trim();
    try {
      return JSON.parse(content);
    } catch {
      try {
        return JSON.parse(tryRepairTruncatedJson(content));
      } catch {
        // Continue to other matches or bracket extraction
      }
    }
  }

  // 3. Bracket extraction: Find outermost '{' and '}'
  const startIdx = trimmed.indexOf('{');
  const endIdx = trimmed.lastIndexOf('}');
  if (startIdx !== -1) {
    const candidate = endIdx > startIdx ? trimmed.substring(startIdx, endIdx + 1) : trimmed.substring(startIdx);
    try {
      return JSON.parse(candidate);
    } catch {
      // 4. Try truncated repair
      try {
        return JSON.parse(tryRepairTruncatedJson(candidate));
      } catch {
        // 5. Try fixing trailing commas and single quotes
        try {
          const repaired = candidate
            .replace(/'/g, '"')
            .replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(repaired);
        } catch {
          try {
            const repaired = tryRepairTruncatedJson(candidate)
              .replace(/'/g, '"')
              .replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(repaired);
          } catch {
            // Failed all recovery attempts
          }
        }
      }
    }
  }

  throw new Error('Failed to extract valid JSON from model response.');
}

/**
 * Detects response format of raw LLM output
 */
export function detectFormat(text: string): 'json' | 'markdown_fenced' | 'markdown' | 'text' {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'json';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'json';
  if (trimmed.includes('```')) return 'markdown_fenced';
  if (trimmed.startsWith('#') || trimmed.includes('\n#') || trimmed.includes('**')) return 'markdown';
  return 'text';
}
