/**
 * Robust JSON Parser for AI response strings
 */

export const parser = {
  /**
   * Clean and parse JSON from a raw AI string that might include markdown wrappers.
   * @param {string} rawString 
   * @returns {object|array|null}
   */
  parseJSON(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      return null;
    }

    let cleaned = rawString.trim();

    // 1. Remove markdown json code block fences if present
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();

    // 2. Try simple JSON parse
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn("Direct JSON parsing failed, attempting regex extraction...", e);
    }

    // 3. Fallback: extract substring between first { or [ and last } or ]
    try {
      const firstCurly = cleaned.indexOf('{');
      const lastCurly = cleaned.lastIndexOf('}');
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');

      let start = -1;
      let end = -1;

      // Determine which starts first (object or array)
      if (firstCurly !== -1 && (firstBracket === -1 || firstCurly < firstBracket)) {
        start = firstCurly;
        end = lastCurly;
      } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
      }

      if (start !== -1 && end !== -1 && end > start) {
        const extracted = cleaned.substring(start, end + 1);
        return JSON.parse(extracted);
      }
    } catch (e) {
      console.error("JSON regex extraction and parsing failed completely:", e);
    }

    // If it fails, return null or throw a descriptive error
    return null;
  }
};
