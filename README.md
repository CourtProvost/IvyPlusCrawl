Ivy+ Peer Watch

Search the official websites of 12 Ivy+ peer schools for a keyword, limited to recent postings.

How it works
The React front end (Dartmouth styling) sends one request to /api/search.
The Vercel serverless function asks OpenAI (Responses API, web_search tool limited to that school's domain) for matching pages per selected school, and keeps only results whose host matches that school's domain and whose posting date falls in the chosen window. Pages with no visible date are kept but labeled.
Default window is the last 3 days. Choosing a date range shows a warning that older pages may be out of date, archived, or no longer available.
The API key stays on the server and is never sent to the browser.
Folder structure

Files must sit in these folders for the app to build:

ivy-plus-watch/
  api/
    search.js
  src/
    App.jsx
    SchoolPicker.jsx
    main.jsx
    schools.js
    styles.css
  .env.example
  .gitignore
  index.html
  package.json
  README.md
  vite.config.js
Deploy (GitHub + Vercel)
Create a GitHub repo and push this folder.
In Vercel, choose Add New > Project and import the repo. Framework preset: Vite.
Add the environment variable OPENAI_API_KEY (Settings > Environment Variables), then redeploy.
Consider turning on Vercel Authentication or Dartmouth SSO so only staff can open it.
Local testing

Install the Vercel CLI, then run vercel dev (this serves both the front end and /api/search). npm run dev alone starts only the front end, so searches will fail.

Environmental footprint
One search per selected school, first page only, no page-by-page crawling.
Results are cached on the server for 10 minutes, so repeat searches cost nothing.
Searches run only when someone presses the button (no background polling).
The quick-search chips run a single search each.
Things to confirm
Model: set OPENAI_MODEL in Vercel to a small, low-cost model on your account if gpt-5-mini is not available.
Brand fonts: src/styles.css lists Hanover and Public Sans first, with system fallbacks. Add the licensed font files if you have them, or change the two font variables at the top of the file.
Brand colors: check the hex values at the top of src/styles.css against the current brand guide.
Search coverage: web search indexes lag behind live pages by minutes to hours. For an active emergency, also check each school's emergency or alert page directly.
