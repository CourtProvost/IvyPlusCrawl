import { useEffect, useRef, useState } from "react";
import SchoolPicker from "./SchoolPicker.jsx";
import { ALL_SCHOOLS, SCHOOL_BY_ID } from "./schools.js";

const QUICK_SEARCHES = [
  "active threat",
  "shelter in place",
  "network outage",
  "weather warning",
  "campus closed",
  "statement to the community",
];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AlertsSection({ data }) {
  if (data.error) {
    return (
      <section className="alerts">
        <h2>Homepage and key pages</h2>
        <p className="error">{data.error}</p>
      </section>
    );
  }

  const nameOf = (r) => SCHOOL_BY_ID[r.schoolId].name;
  const sectionsOf = (r) => r.sections || [];
  const matchesOf = (r) => [
    ...(r.alerts || []).map((a) => ({ ...a, where: "Homepage", url: SCHOOL_BY_ID[r.schoolId].url })),
    ...sectionsOf(r).flatMap((s) => (s.matches || []).map((a) => ({ ...a, where: s.label, url: s.url }))),
  ];
  const pagesRead = (r) => ["Homepage", ...sectionsOf(r).filter((s) => s.status === "ok").map((s) => s.label)];

  const withHits = data.results.filter((r) => matchesOf(r).length > 0);
  const clear = data.results.filter((r) => r.status === "ok" && matchesOf(r).length === 0);
  const withFeatured = data.results.filter((r) => r.featured && r.featured.length > 0);

  // Anything that could not be read, so a missing match is never mistaken for an all clear.
  const problems = [];
  data.results.forEach((r) => {
    if (r.status === "error") problems.push(`${nameOf(r)} homepage (${r.message.replace(/^The homepage /, "").replace(/\.$/, "")})`);
    sectionsOf(r).filter((s) => s.status === "error").forEach((s) =>
      problems.push(`${nameOf(r)} ${s.label} page (${s.message.replace(/^The page /, "").replace(/\.$/, "")})`)
    );
  });
  const notFound = data.results.filter((r) => r.missing && r.missing.length > 0);

  return (
    <>
      <section className="alerts" aria-label="Homepage and key pages">
        <h2>
          Homepage and key pages: {withHits.length === 0 ? "no matches" : `${withHits.length} ${withHits.length === 1 ? "school" : "schools"} with matches`}
        </h2>
        <p className="alerts-note">
          Read directly just now from each school's front page and its Provost, Statements, Communications and news,
          Community, and IT pages, looking only for your words and related words. Open the page to confirm.
          Content added after a page loads may not appear here.
        </p>

        {withHits.map((r) => {
          const school = SCHOOL_BY_ID[r.schoolId];
          return (
            <article key={r.schoolId} className="alert-school">
              <h3>
                <a href={school.url} target="_blank" rel="noopener noreferrer">{school.name}</a>
              </h3>
              <ul>
                {matchesOf(r).map((a) => (
                  <li key={a.where + a.text}>
                    <p className="alert-text">{a.text}</p>
                    <p className="alert-meta">
                      On the <a href={a.url} target="_blank" rel="noopener noreferrer">{a.where}</a> page. Matched “{a.matched}”.
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}

        {clear.length > 0 && (
          <details className="alerts-clear">
            <summary>No matches at {clear.length} {clear.length === 1 ? "school" : "schools"}</summary>
            <ul className="clear-list">
              {clear.map((r) => (
                <li key={r.schoolId}>
                  {nameOf(r)}: checked {pagesRead(r).join(", ")}
                </li>
              ))}
            </ul>
          </details>
        )}

        {problems.length > 0 && (
          <p className="alerts-failed">Could not read: {problems.join("; ")}. Open these directly.</p>
        )}

        {notFound.length > 0 && (
          <details className="alerts-clear">
            <summary>Pages not found automatically</summary>
            <ul className="clear-list">
              {notFound.map((r) => (
                <li key={r.schoolId}>{nameOf(r)}: {r.missing.join(", ")}</li>
              ))}
            </ul>
            <p className="alert-meta">Pin these addresses in src/priorityPages.js so they are always checked.</p>
          </details>
        )}
      </section>

      {withFeatured.length > 0 && (
        <section className="featured" aria-label="Featured on homepages">
          <h2>Featured on homepages</h2>
          <p className="alerts-note">
            Notices and statements the schools link from their front pages, shown whether or not they match your search words.
          </p>
          {withFeatured.map((r) => {
            const school = SCHOOL_BY_ID[r.schoolId];
            return (
              <article key={r.schoolId} className="alert-school">
                <h3>
                  <a href={school.url} target="_blank" rel="noopener noreferrer">{school.name}</a>
                </h3>
                <ul>
                  {r.featured.map((f) => (
                    <li key={f.url}>
                      <a className="hit-title" href={f.url} target="_blank" rel="noopener noreferrer">{f.text}</a>
                      <p className="alert-meta">{f.why === "banner" ? "In an alert or banner area" : "Linked from the front page"}</p>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

export default function App() {
  const [selected, setSelected] = useState(() => new Set(ALL_SCHOOLS.map((s) => s.id)));
  const [query, setQuery] = useState("");
  const [dateMode, setDateMode] = useState("recent"); // "recent" | "custom"
  const [from, setFrom] = useState(toISODate(daysAgo(30)));
  const [to, setTo] = useState(toISODate(new Date()));
  const [showWarning, setShowWarning] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [showFeatured, setShowFeatured] = useState(false);
  const runId = useRef(0);
  const [fatal, setFatal] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (showWarning) dialogRef.current?.focus();
  }, [showWarning]);

  const todayISO = toISODate(new Date());

  function validateForm() {
    if (query.trim().length < 2) return "Enter a search term of at least 2 characters.";
    if (selected.size === 0) return "Select at least one school.";
    if (dateMode === "custom") {
      if (!from || !to) return "Choose both a start date and an end date.";
      if (from > to) return "The start date must be on or before the end date.";
      if (to > todayISO) return "The end date cannot be in the future.";
    }
    return "";
  }

  async function readReply(resp) {
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      const slow = resp.status === 504 || /timeout|took too long/i.test(text);
      return { error: slow ? "The search took too long for this school." : `The server sent an unexpected reply (${resp.status}).` };
    }
  }

  async function runSearch(termOverride) {
    const term = (termOverride ?? query).trim();
    setLoading(true);
    setFatal("");
    setResponse(null);

    const range =
      dateMode === "recent"
        ? { from: toISODate(daysAgo(3)), to: todayISO }
        : { from, to };

    // One request per school keeps each call short enough to finish in time.
    const ids = ALL_SCHOOLS.map((s) => s.id).filter((id) => selected.has(id));
    const base = { query: term, from: range.from, to: range.to, mode: dateMode };
    const done = {};
    setResponse({ ...base, results: [] });

    // Homepage check runs alongside the slower search and appears as soon as it finishes.
    const thisRun = ++runId.current;
    setAlerts(null);
    fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: term, schoolIds: ids, includeFeatured: showFeatured }),
    })
      .then(async (resp) => {
        const data = await readReply(resp);
        if (thisRun !== runId.current) return;
        setAlerts(resp.ok && data.results ? data : { error: data.error || "The homepage check failed." });
      })
      .catch(() => {
        if (thisRun === runId.current) setAlerts({ error: "The homepage check could not be reached." });
      });

    let next = 0;
    async function worker() {
      while (next < ids.length) {
        const id = ids[next++];
        let result;
        try {
          const resp = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: term, schoolIds: [id], ...range }),
          });
          const data = await readReply(resp);
          result =
            resp.ok && data.results?.[0]
              ? data.results[0]
              : { schoolId: id, status: "error", message: data.error || "The search failed.", items: [] };
        } catch {
          result = { schoolId: id, status: "error", message: "The search could not be reached.", items: [] };
        }
        done[id] = result;
        setResponse({ ...base, results: ids.filter((i) => done[i]).map((i) => done[i]) });
      }
    }

    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
    setLoading(false);
  }

  function onSubmit(e, termOverride) {
    e?.preventDefault();
    const problem = validateForm();
    setFormError(problem);
    if (problem) return;
    if (dateMode === "custom") {
      setShowWarning(true); // confirm before searching older material
    } else {
      runSearch(termOverride);
    }
  }

  function quickSearch(term) {
    setQuery(term);
    setDateMode("recent");
    setFormError("");
    if (selected.size === 0) {
      setFormError("Select at least one school.");
      return;
    }
    runSearch(term);
  }

  const totalHits = response ? response.results.reduce((n, r) => n + r.items.length, 0) : 0;

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead-inner">
          <p className="wordmark">Dartmouth</p>
          <h1>Ivy+ Peer Watch</h1>
          <p className="lede">
            See what peer institutions are posting on their official websites, so we know what
            students and faculty elsewhere are being told.
          </p>
        </div>
      </header>

      <main className="main">
        <form className="panel" onSubmit={onSubmit} noValidate>
          <div className="grid">
            <div className="field">
              <label className="label">Schools</label>
              <SchoolPicker selected={selected} setSelected={setSelected} />
            </div>

            <div className="field field-wide">
              <label className="label" htmlFor="q">Search term</label>
              <input
                id="q"
                className="input"
                type="search"
                value={query}
                maxLength={100}
                placeholder="For example: network outage"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="dates">Posted within</label>
              <select
                id="dates"
                className="input"
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value)}
              >
                <option value="recent">Last 3 days (recommended)</option>
                <option value="custom">Choose a date range</option>
              </select>
            </div>
          </div>

          {dateMode === "custom" && (
            <div className="range">
              <div className="field">
                <label className="label" htmlFor="from">From</label>
                <input id="from" className="input" type="date" value={from} max={todayISO} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="to">To</label>
                <input id="to" className="input" type="date" value={to} max={todayISO} onChange={(e) => setTo(e.target.value)} />
              </div>
              <p className="range-note">
                Older pages may be out of date, archived, or no longer available.
              </p>
            </div>
          )}

          <label className="check">
            <input type="checkbox" checked={showFeatured} onChange={(e) => setShowFeatured(e.target.checked)} />
            <span>Also show notices and statements featured on school homepages, even if they do not match my words</span>
          </label>

          {formError && <p className="error" role="alert">{formError}</p>}

          <div className="actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Searching" : "Search peer websites"}
            </button>
            <div className="quick">
              <span className="quick-label">Quick searches</span>
              {QUICK_SEARCHES.map((term) => (
                <button key={term} type="button" className="chip" disabled={loading} onClick={() => quickSearch(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        </form>

        <section aria-live="polite" className="results">
          {loading && (
            <p className="status">
              Checking official websites. {response ? response.results.length : 0} of {selected.size} finished.
              Each school can take up to a minute.
            </p>
          )}

          {fatal && <p className="error" role="alert">{fatal}</p>}

          {alerts && <AlertsSection data={alerts} />}

          {response && (
            <>
              <div className="summary">
                <h2>
                  {loading
                    ? `Searching for “${response.query}”: ${response.results.length} of ${selected.size} schools finished`
                    : `${totalHits} ${totalHits === 1 ? "match" : "matches"} for “${response.query}”`}
                </h2>
                <p>
                  Posted {prettyDate(response.from)} to {prettyDate(response.to)}. Official school domains only.
                </p>
                {response.mode === "custom" && (
                  <p className="banner">
                    You searched an older date range. Some pages may be out of date, archived, or no longer available.
                  </p>
                )}
              </div>

              {response.results.map((r) => {
                const school = SCHOOL_BY_ID[r.schoolId];
                return (
                  <article key={r.schoolId} className="school">
                    <header className="school-head">
                      <h3>
                        <a href={school.url} target="_blank" rel="noopener noreferrer">{school.name}</a>
                      </h3>
                      <span className="school-count">
                        {r.status === "error" ? "Not searched" : `${r.items.length} ${r.items.length === 1 ? "match" : "matches"}`}
                      </span>
                    </header>

                    {r.status === "error" && <p className="error">{r.message} Search again to retry this school.</p>}

                    {r.status === "ok" && r.items.length === 0 && (
                      <p className="none">No pages on {school.domain} matched in this date range.</p>
                    )}

                    {r.items.length > 0 && (
                      <ul className="hits">
                        {r.items.map((item) => (
                          <li key={item.url}>
                            <a className="hit-title" href={item.url} target="_blank" rel="noopener noreferrer">
                              {item.title}
                            </a>
                            <p className="hit-url">{item.url}</p>
                            {item.description && <p className="hit-desc">{item.description}</p>}
                            {item.published && <p className="hit-age">{item.published}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </>
          )}

          {!loading && !response && !fatal && (
            <p className="status">Enter a term and choose Search peer websites. Results appear here, grouped by school.</p>
          )}
        </section>
      </main>

      {showWarning && (
        <div className="overlay" role="presentation">
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="warn-title"
            aria-describedby="warn-body"
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(e) => e.key === "Escape" && setShowWarning(false)}
          >
            <h2 id="warn-title">Older pages may not be reliable</h2>
            <p id="warn-body">
              Results from {prettyDate(from)} to {prettyDate(to)} could be out of date, archived, or
              no longer available. For current news and emergencies, use the last 3 days.
            </p>
            <div className="dialog-actions">
              <button type="button" className="secondary" onClick={() => setShowWarning(false)}>
                Go back
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setShowWarning(false);
                  runSearch();
                }}
              >
                Search anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        Searches cover official school websites only and return up to 8 matches per school. Homepage alerts read each
        school's front page directly. Always open the school's own page to confirm anything important.
      </footer>
    </div>
  );
}
