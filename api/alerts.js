// Vercel serverless function: POST /api/alerts
//
// Body: { query: string, schoolIds: string[] }
//
// For each selected school, with plain web requests (no AI model), looks for the search words plus
// related words on:
//  - the front page
//  - the school's Provost, Statements, Communications and news, Community, and IT pages
//    (found from the front page's links, or pinned in src/priorityPages.js)
// and returns only the lines that match. Optionally (includeFeatured) it also lists notices and
// statements linked from the front page whether or not they match.
//
// Limits: this reads pages as the server delivers them. Content a page adds after it loads can be
// missed, some sites block automated requests, and pages hidden in menus built by scripts may not be
// found automatically. Anything not found or not readable is reported, never hidden.
 
import { SCHOOL_BY_ID } from "../src/schools.js";
import { PINNED, FEEDS } from "../src/priorityPages.js";
import { parseNarrow, buildNarrowMatcher } from "../src/narrow.js";
 
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 1500000;
const MAX_ALERTS_PER_SCHOOL = 5;
const MAX_FEATURED_PER_SCHOOL = 6;
const cache = new Map();
 
// ---------------------------------------------------------------- related words
 
// A group applies when the search contains any of its triggers. Edit freely.
const RELATED = [
  {
    triggers: ["outage", "outages", "network", "down", "unavailable", "disruption", "offline", "php"],
    terms: [
      "network outage", "outage", "outages", "unavailable", "disruption", "disruptions", "disrupted",
      "service interruption", "systems down", "system outage", "offline", "not working",
      "technical issues", "technical difficulties", "degraded", "experiencing issues", "network issues",
      "may be unavailable", "temporarily unavailable",
    ],
  },
  {
    triggers: ["threat", "shooter", "shooting", "gunman", "armed", "weapon", "lockdown", "shelter", "violence"],
    terms: [
      "active threat", "active shooter", "shooter", "shooting", "gunman", "armed person", "armed individual",
      "weapon", "shots fired", "lockdown", "shelter in place", "shelter-in-place", "police activity",
      "suspicious person", "hostage", "evacuate", "evacuation", "emergency alert", "campus emergency",
      "immediate threat", "avoid the area",
    ],
  },
  {
    triggers: ["weather", "storm", "snow", "flood", "hurricane", "tornado", "blizzard", "warning", "advisory", "ice"],
    terms: [
      "weather warning", "weather alert", "weather advisory", "severe weather", "winter storm", "blizzard",
      "snowstorm", "snow emergency", "flood", "flooding", "flash flood", "hurricane", "tornado",
      "heat advisory", "extreme heat", "ice storm", "freezing rain", "high winds", "power outage",
      "travel advisory", "inclement weather",
    ],
  },
  {
    triggers: ["closed", "closure", "closing", "cancelled", "canceled", "delayed", "suspended", "campus"],
    terms: [
      "campus closed", "campus closure", "university closed", "closed today", "delayed opening",
      "late start", "classes cancelled", "classes canceled", "operations suspended", "reduced operations",
      "closed due to",
    ],
  },
  {
    triggers: ["statement", "statements", "message", "communication", "communications", "urgent", "president", "provost", "trustees", "announcement"],
    terms: [
      "urgent communication", "urgent message", "statement from the president", "message from the president",
      "statement from the provost", "message from the provost", "message to the community",
      "message to the campus community", "statement to the community", "board of trustees",
      "statement from the board", "important message", "community message", "campus message",
      "update for the community", "letter to the community", "message from the board",
    ],
  },
  {
    triggers: ["emergency", "alert", "safety"],
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
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const re = new RegExp("(?<![A-Za-z0-9])(" + sorted.map(escapeRe).join("|") + ")(?![A-Za-z0-9])", "i");
  return (text) => {
    const m = text.match(re);
    return m ? m[1].toLowerCase() : null;
  };
}
 
// Phrases that signal a notice or statement worth showing even when the search words do not match.
const ATTENTION =
  /\b(statements?|message from|message to the|letter to the|update on|allegations?|alleged|investigations?|sexual (violence|misconduct|assault|harassment)|title ix|campus safety|safety alert|incident|tragedy|tragic|mourning|condolences|memorial|vigil|protests?|encampment|lockdown|shooting|threat|outage|unavailable|community (update|message|safety)|resources for (students|the community))\b/i;
 
// ---------------------------------------------------------------- html helpers
 
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
 
function cleanInline(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}
 
function hostBelongsToDomain(url, domain) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === domain || host.endsWith("." + domain);
  } catch {
    return false;
  }
}
 
const ANCHOR_RE = /<a\b[^>]*?href\s*=\s*["']([^"'][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
 
function resolveUrl(href, base, domain) {
  if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return null;
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!hostBelongsToDomain(u.href, domain)) return null;
    if (/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|gif|zip|mp4)(\?|$)/i.test(u.pathname)) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
 
function allAnchors(html, base, domain) {
  const out = [];
  const re = new RegExp(ANCHOR_RE.source, "gi");
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = resolveUrl(m[1], base, domain);
    if (!url) continue;
    const text = cleanInline(m[2]);
    if (!text) continue;
    out.push({ url, text, index: m.index, raw: m[0] });
  }
  return out;
}
 
// ---------------------------------------------------------------- front page analysis
 
const BANNER_OPEN =
  /<(?:div|section|aside|header|p|span|a|li)\b[^>]*\b(?:class|id|role|aria-label)\s*=\s*["'][^"']*(?:alert|banner|emergency|notice|announcement|urgent|advisory)[^"']*["'][^>]*>/gi;
const NOT_A_NOTICE = /cookie|consent|privacy|gdpr|skip|search|newsletter/i;
 
export function analyzeHtml(html, terms, narrow = null) {
  const match = buildMatcher(terms);
  const found = new Map();
 
  // A line counts when it matches the search words and, if narrowing words were given, the same
  // line (or, inside an alert or banner area, the same banner) also contains one of them.
  const add = (line, kind, context) => {
    if (line.length < 15 || line.length > 400) return;
    const matched = match(line);
    if (!matched) return;
    let also = null;
    if (narrow) {
      also = narrow(context);
      if (!also) return;
    }
    const prev = found.get(line);
    if (!prev || (kind === "banner" && prev.kind !== "banner")) found.set(line, { text: line, kind, matched, also });
  };
 
  const lower = html.toLowerCase();
  const re = new RegExp(BANNER_OPEN.source, "gi");
  let m;
  while ((m = re.exec(html)) !== null) {
    if (NOT_A_NOTICE.test(m[0])) continue;
    // Read the banner area only: stop at its closing tag when there is one nearby.
    const start = m.index + m[0].length;
    const tag = (m[0].match(/^<([a-z0-9]+)/i) || [])[1];
    let end = start + 1500;
    if (tag) {
      const close = lower.indexOf("</" + tag.toLowerCase(), start);
      if (close !== -1) end = Math.min(end, close);
    }
    const lines = htmlToLines(html.slice(start, end)).slice(0, 6);
    const context = lines.join(" ");
    lines.forEach((l) => add(l, "banner", context));
  }
  const lines = htmlToLines(html);
  lines.forEach((l) => add(l, "page", l));
 
  return [...found.values()]
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "banner" ? -1 : 1))
    .slice(0, MAX_ALERTS_PER_SCHOOL);
}
 
// Links the school features on its front page: anything inside an alert or banner area, plus any
// link whose wording signals a statement or incident. Shown whether or not it matches the search.
export function featuredLinks(html, base, domain) {
  const found = new Map();
  const put = (a, why) => {
    if (a.text.length < 12 || a.text.length > 220) return;
    if (!found.has(a.url)) found.set(a.url, { text: a.text, url: a.url, why });
  };
 
  const re = new RegExp(BANNER_OPEN.source, "gi");
  let m;
  while ((m = re.exec(html)) !== null) {
    if (NOT_A_NOTICE.test(m[0])) continue;
    const chunk = html.slice(m.index, m.index + m[0].length + 1500);
    allAnchors(chunk, base, domain).forEach((a) => put(a, "banner"));
  }
  allAnchors(html, base, domain)
    .filter((a) => ATTENTION.test(a.text))
    .forEach((a) => put(a, "headline"));
 
  return [...found.values()].slice(0, MAX_FEATURED_PER_SCHOOL);
}
 
// ---------------------------------------------------------------- priority pages
 
const CATEGORIES = [
  {
    id: "provost",
    label: "Provost",
    href: /provost/i,
    text: (t) => /provost/i.test(t),
  },
  {
    id: "statements",
    label: "Statements",
    href: /statement|president[^/]*(message|letter|communication)|messages?-from/i,
    text: (t) => /\bstatements?\b|message from|messages from|letter from|message to the/i.test(t),
  },
  {
    id: "communications",
    label: "Communications and news",
    href: /communications?|newsroom|\/news\b|\/\/news\./i,
    text: (t) => /communications?|newsroom|^news$|university news|^news (&|and) |media relations/i.test(t),
  },
  {
    id: "community",
    label: "Community",
    href: /community/i,
    text: (t) => /community/i.test(t),
  },
  {
    id: "releases",
    label: "Press releases",
    href: /press-releases?|\/releases?\b|news-releases?/i,
    text: (t) => /press releases?|news releases?|^releases$/i.test(t),
  },
  {
    id: "it",
    label: "IT",
    href: /information-technology|technology-services|it-services|\/\/its?\.|huit|\/\/uis\.|\/\/status\.|service-status/i,
    text: (t) => /\b(IT|ITS|HUIT|UIS)\b/.test(t) || /information technology|technology services|systems? status|service status/i.test(t),
  },
];
 
// Pinned pages may use a few friendly names. Anything unrecognized is reported on screen, not ignored.
const PIN_ALIASES = {
  news: "communications",
  communication: "communications",
  comms: "communications",
  statement: "statements",
  release: "releases",
  "press-releases": "releases",
  "press releases": "releases",
  press: "releases",
};
const NORMALIZED_PINS = {};
const PIN_WARNINGS = [];
for (const [schoolId, cats] of Object.entries(PINNED)) {
  if (!SCHOOL_BY_ID[schoolId]) {
    PIN_WARNINGS.push(`School id "${schoolId}" is not recognized and was ignored.`);
    continue;
  }
  NORMALIZED_PINS[schoolId] = {};
  for (const [key, value] of Object.entries(cats || {})) {
    const id = PIN_ALIASES[key.toLowerCase()] || key.toLowerCase();
    if (!CATEGORIES.some((c) => c.id === id)) {
      PIN_WARNINGS.push(`${schoolId}: the category "${key}" is not recognized and was ignored.`);
      continue;
    }
    NORMALIZED_PINS[schoolId][id] = value;
  }
}
 
export function discoverCategories(html, base, domain) {
  const anchors = allAnchors(html, base, domain).filter((a) => a.text.length <= 120);
  const best = {};
  for (const cat of CATEGORIES) {
    let top = null;
    for (const a of anchors) {
      const textHit = cat.text(a.text);
      const hrefHit = cat.href.test(a.url);
      if (!textHit && !hrefHit) continue;
      const u = new URL(a.url);
      let score = (textHit ? 5 : 0) + (hrefHit ? 4 : 0);
      if (textHit && hrefHit) score += 2;
      if (u.pathname === "/" || u.pathname === "") score += 2; // a section's own front page
      score -= a.url.length / 120; // shorter, broader addresses win ties
      if (!top || score > top.score) top = { url: a.url, text: a.text, score };
    }
    if (top) best[cat.id] = top.url;
  }
  return best;
}
 
// ---------------------------------------------------------------- fetching
 
async function fetchPage(url, domain, accept = "text/html,application/xhtml+xml") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IvyPlusPeerWatch/1.0; internal monitoring)",
        Accept: accept,
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!hostBelongsToDomain(resp.url, domain)) {
      return { ok: false, message: "The page redirected away from the official domain." };
    }
    if (!resp.ok) {
      return {
        ok: false,
        message: `Returned ${resp.status} error.${resp.status === 403 ? " The site may block automated reading." : ""}`,
      };
    }
    const html = (await resp.text()).slice(0, MAX_HTML_CHARS);
    return { ok: true, html, finalUrl: resp.url };
  } catch (err) {
    return { ok: false, message: err.name === "AbortError" ? "The page took too long to load." : "The page could not be read." };
  } finally {
    clearTimeout(timer);
  }
}
 
// ---------------------------------------------------------------- feeds (RSS and Atom)
 
function feedTag(block, name) {
  const m = block.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? m[1] : "";
}
 
function feedText(raw) {
  const noCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return cleanInline(decodeEntities(noCdata));
}
 
export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks.slice(0, 60)) {
    const title = feedText(feedTag(b, "title"));
    let link = feedText(feedTag(b, "link"));
    if (!/^https?:/i.test(link)) {
      const m = b.match(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
      link = m ? decodeEntities(m[1]) : "";
    }
    if (!link) {
      const g = feedText(feedTag(b, "guid"));
      if (/^https?:/i.test(g)) link = g;
    }
    const desc = feedText(
      feedTag(b, "description") || feedTag(b, "summary") || feedTag(b, "content:encoded") || feedTag(b, "content")
    );
    const dateRaw = feedTag(b, "pubDate") || feedTag(b, "published") || feedTag(b, "updated") || feedTag(b, "dc:date");
    const t = Date.parse(feedText(dateRaw));
    items.push({ title, link, desc, date: Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10) });
  }
  return items;
}
 
export function analyzeFeed(xml, terms, narrow, from, to) {
  const match = buildMatcher(terms);
  const out = [];
  for (const it of parseFeed(xml)) {
    if (from && to && it.date && (it.date < from || it.date > to)) continue;
    const text = `${it.title}. ${it.desc}`.slice(0, 1500);
    const matched = match(text);
    if (!matched) continue;
    let also = null;
    if (narrow) {
      also = narrow(text);
      if (!also) continue;
    }
    out.push({ text: it.title || it.link, kind: "feed", matched, also, itemUrl: it.link || null, date: it.date });
  }
  return out.slice(0, 5);
}
 
async function readFeed(feed, school, terms, narrow, from, to) {
  const label = feed.label || "Feed";
  const base = { category: "feed", label, url: feed.url, pinned: true };
  if (!hostBelongsToDomain(feed.url, school.domain)) {
    return { ...base, status: "error", message: "The feed address is not on the school's official domain.", matches: [] };
  }
  const page = await fetchPage(feed.url, school.domain, "application/rss+xml, application/atom+xml, application/xml, text/xml, */*");
  if (!page.ok) return { ...base, status: "error", message: page.message, matches: [] };
  if (!/<(rss|feed|rdf:RDF)\b/i.test(page.html.slice(0, 3000))) {
    return { ...base, status: "error", message: "The address did not return an RSS or Atom feed.", matches: [] };
  }
  return { ...base, status: "ok", matches: analyzeFeed(page.html, terms, narrow, from, to) };
}
 
async function readPriorityPage(cat, url, school, terms, narrow, pinned) {
  const page = await fetchPage(url, school.domain);
  if (!page.ok) return { category: cat.id, label: cat.label, url, pinned, status: "error", message: page.message, matches: [] };
  return {
    category: cat.id,
    label: cat.label,
    url,
    pinned,
    status: "ok",
    matches: analyzeHtml(page.html, terms, narrow).slice(0, 3),
  };
}
 
async function checkOneSchool(school, terms, narrow, includeFeatured, from, to) {
  const home = await fetchPage(school.url, school.domain);
  const pinnedForSchool = NORMALIZED_PINS[school.id] || {};
 
  // Choose pages: pinned first, then whatever the front page links to.
  const discovered = home.ok ? discoverCategories(home.html, home.finalUrl, school.domain) : {};
  const plan = [];
  const missing = [];
  const used = new Set();
  const norm = (u) => u.replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
  for (const cat of CATEGORIES) {
    if (pinnedForSchool[cat.id] === null) continue; // marked as not applicable for this school
    const pins = [].concat(pinnedForSchool[cat.id] || []).filter((u) => hostBelongsToDomain(u, school.domain));
    if (pins.length) {
      pins.forEach((u) => {
        if (!used.has(norm(u))) {
          used.add(norm(u));
          plan.push({ cat, url: u, pinned: true });
        }
      });
    } else if (discovered[cat.id]) {
      // The same page can answer two categories (for example statements and press releases); read it once.
      if (!used.has(norm(discovered[cat.id]))) {
        used.add(norm(discovered[cat.id]));
        plan.push({ cat, url: discovered[cat.id], pinned: false });
      }
    } else missing.push(cat.label);
  }
 
  const feedList = [].concat(FEEDS[school.id] || []).map((f) => (typeof f === "string" ? { url: f } : f));
  const [pageSections, feedSections] = await Promise.all([
    Promise.all(plan.map((p) => readPriorityPage(p.cat, p.url, school, terms, narrow, p.pinned))),
    Promise.all(feedList.map((f) => readFeed(f, school, terms, narrow, from, to))),
  ]);
  const sections = [...pageSections, ...feedSections];
 
  if (!home.ok) {
    return {
      schoolId: school.id,
      status: "error",
      message: home.message.replace("The page", "The homepage"),
      alerts: [],
      featured: [],
      sections,
      missing,
    };
  }
 
  return {
    schoolId: school.id,
    status: "ok",
    alerts: analyzeHtml(home.html, terms, narrow),
    featured: includeFeatured ? featuredLinks(home.html, home.finalUrl, school.domain) : [],
    sections,
    missing,
  };
}
 
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
 
  const { query, schoolIds } = req.body || {};
  const includeFeatured = req.body?.includeFeatured === true;
  if (req.body?.narrow !== undefined && (typeof req.body.narrow !== "string" || req.body.narrow.length > 100)) {
    return res.status(400).json({ error: "Narrowing words must be 100 characters or fewer." });
  }
  const narrowWords = parseNarrow(req.body?.narrow);
  const narrow = buildNarrowMatcher(narrowWords);
  const okDate = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const from = okDate(req.body?.from);
  const to = okDate(req.body?.to);
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 100) {
    return res.status(400).json({ error: "Enter a search term between 2 and 100 characters." });
  }
  if (!Array.isArray(schoolIds) || schoolIds.length === 0 || schoolIds.length > 12 || !schoolIds.every((id) => SCHOOL_BY_ID[id])) {
    return res.status(400).json({ error: "Select at least one valid school." });
  }
 
  const ids = [...new Set(schoolIds)].sort();
  const terms = expandTerms(query);
  const cacheKey = JSON.stringify([terms, ids, includeFeatured, narrowWords, from, to]);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return res.status(200).json({ ...hit.payload, cached: true });
  }
 
  const results = await Promise.all(ids.map((id) => checkOneSchool(SCHOOL_BY_ID[id], terms, narrow, includeFeatured, from, to)));
  const payload = { query: query.trim(), pinWarnings: PIN_WARNINGS, narrow: narrowWords, checkedAt: new Date().toISOString(), terms, results };
 
  if (results.every((r) => r.status === "ok")) {
    cache.set(cacheKey, { at: Date.now(), payload });
    if (cache.size > 100) cache.delete(cache.keys().next().value);
  }
 
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ...payload, cached: false });
}
 
