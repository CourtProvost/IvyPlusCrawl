// Narrowing words: an optional second box next to the main search term.
// A result must match the main term (or its related words) AND at least one narrowing word.
// Narrowing words match from the start of a word, so "gun" also finds "gunman" and "gunshot".
 
export function parseNarrow(input) {
  if (typeof input !== "string") return [];
  const words = input
    .split(/[,;\n]+|\s+or\s+/i)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2);
  return [...new Set(words)].slice(0, 6);
}
 
export function buildNarrowMatcher(words) {
  if (!words || words.length === 0) return null;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(?<![A-Za-z0-9])(" + words.map(esc).join("|") + ")", "i");
  return (text) => {
    const m = text.match(re);
    return m ? m[1].toLowerCase() : null;
  };
}
 
