// Vercel serverless function: POST /api/search
//
// Body: { query: string, schoolIds: string[], from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
//
// Uses the OpenAI Responses API with the built-in web_search tool, limited to
// each school's own domain. One request per selected school.
//
// Keeping environmental cost low:
//  - One request per selected school, with a small cap on searches per request.
//  - Results are cached in memory for 10 minutes, so repeat searches cost nothing.
//  - Inputs are validated before any outside request is made.
//
// Vercel settings: OPENAI_API_KEY (required), OPENAI_MODEL (optional, pick a small, low-cost model).
 
import { SCHOOL_BY_ID } from "../src/schools.js";
 
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 50000;
const MAX_ITEMS = 8;
const MAX_TOOL_CALLS = 2;
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const cache = new Map();
 
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
 
function today() {
  return new Date().toISOString().slice(0, 10);
}
 
function validate(body) {
  const { query, schoolIds, from, to } = body || {};
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 100) {
    return "Enter a search term between 2 and 100 characters.";
  }
  if (!Array.isArray(schoolIds) || schoolIds.length === 0 || schoolIds.length > 12) {
    return "Select at least one school.";
  }
  if (!schoolIds.every((id) => SCHOOL_BY_ID[id])) {
    return "One or more selected schools are not recognized.";
  }
  if (!DATE_RE.test(from || "") || !DATE_RE.test(to || "")) {
    return "Dates must use the YYYY-MM-DD format.";
  }
  if (from > to) return "The start date must be on or before the end date.";
  if (to > today()) return "The end date cannot be in the future.";
  return null;
}
 
function hostBelongsToDomain(url, domain) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith("." + domain);
  } catch {
    return false;
  }
}
 
function cleanUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    return u.toString();
  } catch {
    return url;
  }
}
 
function readText(data) {
  return (data?.output || [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content || [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text)
    .join("");
}
 
function parseItems(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return null; // signals unreadable output
  }
}
 
async function searchOneSchool(school, query, from, to) {
  const instructions =
    `Find pages on ${school.domain} (including its subdomains) that mention or are about: ${query.trim()}\n` +
    `Only include pages posted between ${from} and ${to}. Take each posting date from the page itself. ` +
    `Never guess a date; use null when the page shows none.\n` +
    `Reply with a JSON array only, no other text, with at most ${MAX_ITEMS} objects shaped like:\n` +
    `{"title": string, "url": string, "summary": string (one short sentence), "published": "YYYY-MM-DD" or null}\n` +
    `If nothing matches, reply with [].`;
 
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 
  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: instructions,
        tools: [{ type: "web_search", filters: { allowed_domains: [school.domain] } }],
        tool_choice: "required",
        max_tool_calls: MAX_TOOL_CALLS,
      }),
      signal: controller.signal,
    });
 
    if (!resp.ok) {
      let detail = "";
      try {
        const body = await resp.json();
        detail = body?.error?.message || "";
      } catch {}
      return {
        schoolId: school.id,
        status: "error",
        message: `Search service returned ${resp.status}${detail ? ": " + detail.slice(0, 300) : "."}`,
        items: [],
      };
    }
 
    const data = await resp.json();
    const parsed = parseItems(readText(data));
    if (parsed === null) {
      return { schoolId: school.id, status: "error", message: "The search answer could not be read.", items: [] };
    }
 
    const items = parsed
      .filter((r) => r && typeof r.url === "string" && hostBelongsToDomain(r.url, school.domain))
      .map((r) => {
        const date = typeof r.published === "string" && DATE_RE.test(r.published.slice(0, 10)) ? r.published.slice(0, 10) : null;
        return {
          title: String(r.title || r.url).slice(0, 200),
          url: cleanUrl(r.url),
          description: String(r.summary || "").slice(0, 400),
          date,
        };
      })
      // Drop anything with a known date outside the window. Keep undated pages, labeled as such.
      .filter((r) => r.date === null || (r.date >= from && r.date <= to))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map(({ date, ...rest }) => ({
        ...rest,
        published: date ? `Posted ${date}` : "Posting date not found on the page",
      }));
 
    return { schoolId: school.id, status: "ok", items };
  } catch (err) {
    const message = err.name === "AbortError" ? "The search timed out." : "The search could not be completed.";
    return { schoolId: school.id, status: "error", message, items: [] };
  } finally {
    clearTimeout(timer);
  }
}
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
 
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "The search key is not configured on the server." });
  }
 
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ error: problem });
 
  const { query, schoolIds, from, to } = req.body;
  const ids = [...new Set(schoolIds)].sort();
  const cacheKey = JSON.stringify([query.trim().toLowerCase(), ids, from, to]);
 
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.status(200).json({ ...hit.payload, cached: true });
  }
 
  const results = await Promise.all(
    ids.map((id) => searchOneSchool(SCHOOL_BY_ID[id], query, from, to))
  );
 
  const payload = {
    query: query.trim(),
    from,
    to,
    searchedAt: new Date().toISOString(),
    results,
  };
 
  // Only cache runs where every school answered, so a failure is retried next time.
  if (results.every((r) => r.status === "ok")) {
    cache.set(cacheKey, { at: Date.now(), payload });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
  }
 
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ...payload, cached: false });
}
 
