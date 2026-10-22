// Vercel serverless function: POST /api/search
//
// Body: { query: string, schoolIds: string[], from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
//
// Design choices that keep the environmental cost low:
//  - One search request per selected school, first page only (10 results). No page crawling.
//  - Results are cached in memory for 10 minutes, so repeat searches cost nothing.
//  - Inputs are validated before any outside request is made.
//
// The search provider is Brave Search API (set BRAVE_API_KEY in Vercel).
// To swap providers, only the searchOneSchool() function needs to change.

import { SCHOOL_BY_ID } from "../src/schools.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const RESULTS_PER_SCHOOL = 10;
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

async function searchOneSchool(school, query, from, to) {
  const params = new URLSearchParams({
    q: `${query.trim()} site:${school.domain}`,
    count: String(RESULTS_PER_SCHOOL),
    freshness: `${from}to${to}`,
    text_decorations: "false",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_API_KEY,
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      return { schoolId: school.id, status: "error", message: `Search service returned ${resp.status}.`, items: [] };
    }

    const data = await resp.json();
    const raw = data?.web?.results || [];
    const items = raw
      .filter((r) => hostBelongsToDomain(r.url, school.domain))
      .map((r) => ({
        title: r.title,
        url: r.url,
        description: r.description || "",
        published: r.page_age || r.age || null,
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

  if (!process.env.BRAVE_API_KEY) {
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
