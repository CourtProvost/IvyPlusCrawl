// Vercel serverless function: POST /api/alerts
//
// Body: { query: string, schoolIds: string[] }
//
// Reads each selected school's front page directly (no AI model, one small request per school)
// and looks for the search words plus related words, so a banner like "Some University websites
// and systems may be unavailable" is found when someone searches "network outage".
//
// Limits: this reads the page as the server delivers it. Banners that a page adds after it loads
// can be missed, and some sites block automated requests. Results are labeled accordingly.
 
import { SCHOOL_BY_ID } from "../src/schools.js";
 
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_CHARS = 1500000;
const MAX_ALERTS_PER_SCHOOL = 5;
const cache = new Map();
 
// Related words. A group applies when the search contains any of its triggers.
// Edit these lists freely. Use whole words or short phrases; avoid very short words that
// appear inside other words.
const RELATED = [
  {
    name: "outage",
    triggers: ["outage", "outages", "network", "down", "unavailable", "disruption", "offline", "php"],
    terms: [
      "network outage", "outage", "outages", "unavailable", "disruption", "disruptions", "disrupted",
      "service interruption", "systems down", "system outage", "offline", "not working",
      "technical issues", "technical difficulties", "degraded", "experiencing issues", "network issues",
      "may be unavailable", "temporarily unavailable",
    ],
  },
  {
    name: "threat",
    triggers: ["threat", "shooter", "shooting", "gunman", "armed", "weapon", "lockdown", "shelter", "violence"],
    terms: [
      "active threat", "active shooter", "shooter", "shooting", "gunman", "armed person", "armed individual",
      "weapon", "shots fired", "lockdown", "shelter in place", "shelter-in-place", "police activity",
      "suspicious person", "hostage", "evacuate", "evacuation", "emergency alert", "campus emergency",
      "immediate threat", "avoid the area",
    ],
  },
  {
    name: "weather",
    triggers: ["weather", "storm", "snow", "flood", "hurricane", "tornado", "blizzard", "warning", "advisory", "ice"],
    terms: [
      "weather warning", "weather alert", "weather advisory", "severe weather", "winter storm", "blizzard",
      "snowstorm", "snow emergency", "flood", "flooding", "flash flood", "hurricane", "tornado",
      "heat advisory", "extreme heat", "ice storm", "freezing rain", "high winds", "power outage",
      "travel advisory", "inclement weather",
    ],
  },
  {
    name: "closure",
    triggers: ["closed", "closure", "closing", "cancelled", "canceled", "delayed", "suspended", "campus"],
    terms: [
      "campus closed", "campus closure", "university closed", "closed today", "delayed opening",
      "late start", "classes cancelled", "classes canceled", "operations suspended", "reduced operations",
      "closed due to",
    ],
  },
  {
    name: "emergency",
    triggers: ["emergency", "alert", "urgent", "safety"],
    terms: ["emergency", "alert", "urgent", "campus safety", "safety alert", "important notice"],
  },
];
 
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
 
export function expandTerms(query) {
  const q = query.toLowerCase().trim();
  const words = q.split(/[^a-z0-9'-]+/).filter(Boolean);
  const terms = new Set([q]);
  for (const group of RELATED) {
    if (group.triggers.some((t) => words.includes(t) || q.includes(t + " ") || q === t)) {
      group.terms.forEach((t) => terms.add(t));
    }
  }
  return [...terms].filter((t) => t.length >= 3);
}
 
function buildMatcher(terms) {
  // Longest first so the most specific term is reported.
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const re = new RegExp("(?<![A-Za-z0-9])(" + sorted.map(escapeRe).join("|") + ")(?![A-Za-z0-9])", "i");
  return (text) => {
    const m = text.match(re);
    return m ? m[1].toLowerCase() : null;
  };
}
 
function decodeEntities(s) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "-", mdash: "-", hellip: "..." };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10) || 32))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m));
}
 
function htmlToLines(html) {
  const text = decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/?(br|p|div|li|ul|ol|h[1-6]|section|header|footer|aside|nav|tr|td|article|main|form|button)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim())
    .filter((l) => l.length > 0);
}
 
const BANNER_OPEN =
  /<(?:div|section|aside|header|p|span|a|li)\b[^>]*\b(?:class|id|role|aria-label)\s*=\s*["'][^"']*(?:alert|banner|emergency|notice|announcement|urgent|advisory)[^"']*["'][^>]*>/gi;
 
export function analyzeHtml(html, terms) {
  const match = buildMatcher(terms);
  const found = new Map(); // text -> { text, kind, matched }
 
  const add = (line, kind) => {
    if (line.length < 15 || line.length > 400) return;
    const matched = match(line);
    if (!matched) return;
    const prev = found.get(line);
    if (!prev || (kind === "banner" && prev.kind !== "banner")) found.set(line, { text: line, kind, matched });
  };
 
  // 1. Areas whose markup says alert, banner, emergency, notice, and so on.
  let m;
  while ((m = BANNER_OPEN.exec(html)) !== null) {
    const chunk = html.slice(m.index + m[0].length, m.index + m[0].length + 1500);
    htmlToLines(chunk).slice(0, 6).forEach((l) => add(l, "banner"));
  }
 
  // 2. Everything else on the page.
  htmlToLines(html).forEach((l) => add(l, "page"));
 
  return [...found.values()]
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "banner" ? -1 : 1))
    .slice(0, MAX_ALERTS_PER_SCHOOL);
}
 
function hostBelongsToDomain(url, domain) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith("." + domain);
  } catch {
    return false;
  }
}
 
async function checkOneSchool(school, terms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(school.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IvyPlusPeerWatch/1.0; internal monitoring)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!hostBelongsToDomain(resp.url, school.domain)) {
      return { schoolId: school.id, status: "error", message: "The homepage redirected away from the official domain.", alerts: [] };
    }
    if (!resp.ok) {
      return {
        schoolId: school.id,
        status: "error",
        message: `The homepage returned ${resp.status}${resp.status === 403 ? " (the site may block automated reading)" : ""}.`,
        alerts: [],
      };
    }
    const html = (await resp.text()).slice(0, MAX_HTML_CHARS);
    return { schoolId: school.id, status: "ok", alerts: analyzeHtml(html, terms) };
  } catch (err) {
    return {
      schoolId: school.id,
      status: "error",
      message: err.name === "AbortError" ? "The homepage took too long to load." : "The homepage could not be read.",
      alerts: [],
    };
  } finally {
    clearTimeout(timer);
  }
}
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
 
  const { query, schoolIds } = req.body || {};
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 100) {
    return res.status(400).json({ error: "Enter a search term between 2 and 100 characters." });
  }
  if (!Array.isArray(schoolIds) || schoolIds.length === 0 || schoolIds.length > 12 || !schoolIds.every((id) => SCHOOL_BY_ID[id])) {
    return res.status(400).json({ error: "Select at least one valid school." });
  }
 
  const ids = [...new Set(schoolIds)].sort();
  const terms = expandTerms(query);
  const cacheKey = JSON.stringify([terms, ids]);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.status(200).json({ ...hit.payload, cached: true });
  }
 
  const results = await Promise.all(ids.map((id) => checkOneSchool(SCHOOL_BY_ID[id], terms)));
  const payload = { query: query.trim(), checkedAt: new Date().toISOString(), terms, results };
 
  if (results.every((r) => r.status === "ok")) {
    cache.set(cacheKey, { at: Date.now(), payload });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
  }
 
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ...payload, cached: false });
}
 
