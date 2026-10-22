// Vercel serverless function: POST /api/search
//
// Body: { query: string, schoolIds: string[], from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
//
// Sends one request per selected school to the Dartmouth Chat API
// (https://chat.dartmouth.edu/api, OpenAI-compatible) with web search turned on,
// then keeps only results on that school's own domain and inside the date window.
//
// Keeping environmental cost low:
//  - One request per selected school, sent a few at a time.
//  - Results are cached in memory for 10 minutes, so repeat searches cost nothing.
//  - Inputs are validated before any outside request is made.
//
// Vercel settings: DARTMOUTH_CHAT_API_KEY (required), DARTMOUTH_CHAT_MODEL (optional).
 
import { SCHOOL_BY_ID } from "../src/schools.js";
 
const API_URL = "https://chat.dartmouth.edu/api/chat/completions";
const MODEL = process.env.DARTMOUTH_CHAT_MODEL || "google.gemma-4-31B-it";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 45000;
const MAX_ITEMS = 8;
const CONCURRENCY = 4;
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
 
// Pull any URLs the search step reports, so we can check the model's links against them.
function collectSourceUrls(data) {
  const urls = new Set();
  const walk = (node, depth = 0) => {
    if (!node || depth > 6) return;
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node)) urls.add(cleanUrl(node));
      return;
    }
    if (Array.isArray(node)) return node.forEach((n) => walk(n, depth + 1));
    if (typeof node === "object") Object.values(node).forEach((n) => walk(n, depth + 1));
  };
  walk(data?.sources);
  return urls;
}
 
function parseItems(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return null; // unreadable output
  }
}
 
async function searchOneSchool(school, query, from, to) {
  const prompt =
    `Search the web for: ${query.trim()} site:${school.domain}\n\n` +
    `Using only what the search returns, list pages on ${school.domain} (including its subdomains) about this topic ` +
    `that were posted between ${from} and ${to}. Take each posting date from the page itself and never guess one; ` +
    `use null when no date is shown. Do not invent pages or links.\n` +
    `Reply with a JSON array only, no other text, with at most ${MAX_ITEMS} objects shaped like:\n` +
    `{"title": string, "url": string, "summary": string (one short sentence), "published": "YYYY-MM-DD" or null}\n` +
    `If nothing matches, reply with [].`;
 
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DARTMOUTH_CHAT_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        features: { web_search: true },
      }),
      signal: controller.signal,
    });
 
    if (!resp.ok) {
      let detail = "";
      try {
        const body = await resp.json();
        detail = body?.detail || body?.error?.message || body?.message || "";
        if (typeof detail !== "string") detail = JSON.stringify(detail);
      } catch {}
      return {
        schoolId: school.id,
        status: "error",
        message: `Search service returned ${resp.status}${detail ? ": " + detail.slice(0, 300) : "."}`,
        items: [],
      };
    }
 
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const parsed = parseItems(text);
    if (parsed === null) {
      return {
        schoolId: school.id,
        status: "error",
        message: `The search answer could not be read. It began: ${text.slice(0, 150).replace(/\s+/g, " ")}`,
        items: [],
      };
    }
 
    const sourceUrls = collectSourceUrls(data);
    const canCheckSources = sourceUrls.size > 0;
 
    const items = parsed
      .filter((r) => r && typeof r.url === "string" && hostBelongsToDomain(r.url, school.domain))
      .map((r) => {
        const url = cleanUrl(r.url);
        const date = typeof r.published === "string" && DATE_RE.test(r.published.slice(0, 10)) ? r.published.slice(0, 10) : null;
        return {
          title: String(r.title || url).slice(0, 200),
          url,
          description: String(r.summary || "").slice(0, 400),
          date,
          seen: canCheckSources ? sourceUrls.has(url) : null,
        };
      })
      // When the search step reports its pages, drop links it never returned.
      .filter((r) => r.seen !== false)
      // Drop anything with a known date outside the window. Keep undated pages, labeled as such.
      .filter((r) => r.date === null || (r.date >= from && r.date <= to))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((r) => ({
        title: r.title,
        url: r.url,
        description: r.description,
        published: r.date ? `Posted ${r.date}` : "Posting date not found on the page",
      }));
 
    return { schoolId: school.id, status: "ok", items };
  } catch (err) {
    const message = err.name === "AbortError" ? "The search timed out." : "The search could not be completed.";
    return { schoolId: school.id, status: "error", message, items: [] };
  } finally {
    clearTimeout(timer);
  }
}
 
async function inBatches(ids, fn) {
  const out = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    out.push(...(await Promise.all(ids.slice(i, i + CONCURRENCY).map(fn))));
  }
  return out;
}
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
 
  if (!process.env.DARTMOUTH_CHAT_API_KEY) {
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
 
  const results = await inBatches(ids, (id) => searchOneSchool(SCHOOL_BY_ID[id], query, from, to));
 
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
 
