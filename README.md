# Commercial Property Professionals Guide

A lightweight, responsive directory guide owned and published by Blue Dawn Commercial. It uses HTML, CSS, vanilla JavaScript and JSON; there is no framework, database, API or browser secret. The live directory contains 37 records: the 19 original WordPress listings, 17 verified regional additions and Blue Dawn Commercial as the Stage 04 capital allowances provider.

## Run locally

The browser must load the JSON file over HTTP (rather than `file://`). From this folder, run a simple local static server, for example:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`. If Python is unavailable, use any local static HTTP server. The published site is static and needs no server-side runtime.

## Preview proposed listings

The normal app loads only `data/professionals.json`. On `localhost` or `127.0.0.1`, open `http://localhost:8000/?preview=proposed` to inspect the six unapproved listings alongside the live directory. The local-only preview shows a warning and labels each proposed card. Search and filters apply to both sets. No preview mode is enabled on deployed hosts, and the Cloudflare build below does not copy proposed data or research reports into its output.

The current research, merger decisions and unresolved checks are documented in [`PROPOSED_DIRECTORY_RESEARCH_REPORT.md`](PROPOSED_DIRECTORY_RESEARCH_REPORT.md). Keep this report and `data/proposed-professionals.json` out of public Git history until their contents are approved.

## Add directory providers

Edit [`data/professionals.json`](data/professionals.json). It must contain a JSON array. Add one object for each real provider; multiple regions, categories and journey stages belong on the same record, so a provider is never duplicated in results.

Example schema (replace every value with provider-approved, verified information before use):

```json
[
  {
    "id": "unique-provider-id",
    "name": "Verified business name",
    "description": "A concise description approved by the business.",
    "logo": "assets/provider-logo.svg",
    "website": "https://example.co.uk/",
    "categories": ["Commercial Estate Agents"],
    "regions": ["Mid Wales", "North Wales"],
    "stages": [1],
    "featured": false,
    "guide_owner": false,
    "last_verified": "2026-11-24",
    "verification_status": "verified",
    "source_urls": ["https://example.co.uk/about"],
    "review_notes": []
  }
]
```

Supported regions: `Mid Wales`, `North Wales`, `Cheshire`. Supported categories are listed in `script.js` and shown in the stage guide. Stage numbers: `1` Find & Assess, `2` Finance & Acquire, `3` Plan & Develop, `4` Tax & Structure, `5` Protect, `6` Manage & Operate. Keep unverified regions as an empty array; businesses without a confirmed area still appear when no area filter is selected.

`logo`, `website` and `description` can be empty strings. Set `logo` to a relative path only when a genuine, correctly matched logo file has been supplied. A typographic initials placeholder appears when a logo is omitted or fails to load. Only valid HTTP(S) website links are rendered.

Research fields:

- `last_verified`: ISO date (`YYYY-MM-DD`) for the latest source review; leave blank when no source-backed verification was completed.
- `verification_status`: `verified`, `partially_verified` or `needs_review`.
- `source_urls`: official pages that support the current verified claims.
- `review_notes`: unresolved checks for a person to resolve.
- `guide_owner`: optional Boolean; true only for the guide owner/publisher.

Do not set a record to `verified` merely because its website responds. Confirm the business identity, services, locations and relevant category/stage. Keep unsupported claims blank and retain the evidence and date for any corrections.

The 19 original businesses remain in the directory, including listings that still need manual verification. See [`DIRECTORY_RESEARCH_REPORT.md`](DIRECTORY_RESEARCH_REPORT.md) for their original research, and [`PROPOSED_DIRECTORY_RESEARCH_REPORT.md`](PROPOSED_DIRECTORY_RESEARCH_REPORT.md) for additions and pending approvals. The `guide_owner` field is optional and should be true only for Blue Dawn Commercial. The project currently has no supplied company logos; the initials fallback is used.

### Details to verify

- Resolve the records marked `needs_review` and the notes on partially verified records before publication.
- Check questionable categories and property-service relevance documented in the research report.
- Supply approved provider logo files using the filenames documented in the research report, or update each `logo` path to the supplied filename.

## Future research and maintenance

The JSON is structured so a later assisted workflow can review records without publishing changes automatically:

1. Read records whose `last_verified` date is older than a chosen review window or whose status is not `verified`.
2. Check saved official `source_urls`, test website responses and redirects, and compare the current site facts with the stored description, category and area coverage.
3. Generate proposed changes with citations, a proposed `last_verified` date and `review_notes`; detect candidates for new businesses separately.
4. Require a person to confirm the business identity, service, category, geography and logo before merging any changes into the JSON.
5. Keep an audit trail of the accepted source URLs and verification date. A failed website check should create a review note, not silently remove a listing or its saved data.

This project does not run an AI research job, scheduled crawler or unattended publishing process. Any future automation should be reviewed and approved before it can modify the directory.

## Publish to GitHub

The current workspace is not yet a Git repository. Create a **private** GitHub repository while you review the project. The local `.gitignore` excludes the unapproved proposal JSON, proposal report, build output and environment files. Stage only the website and its approved directory data:

```powershell
git init
git add .gitignore index.html styles.css script.js data/professionals.json assets README.md DIRECTORY_RESEARCH_REPORT.md
git status --short
git diff --cached --check
git commit -m "Prepare commercial property professionals guide"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the GitHub account and repository placeholders. Review `git status` before committing; do not force-add proposal files, credentials, or `.env` files. These are instructions only; this project has not been initialized, committed or pushed.

## Deploy to Cloudflare Pages

Use **Git integration** so pushes to `main` can deploy automatically after you enable it. Cloudflare Pages cannot convert a Direct Upload project to Git integration later.

1. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git** and select the GitHub repository.
2. Select no framework preset, use the repository root, and set the build command to:

   ```sh
   rm -rf dist && mkdir -p dist/data && cp index.html script.js styles.css dist/ && cp data/professionals.json dist/data/ && cp -R assets dist/
   ```

3. Set the build output directory to `dist` and the production branch to `main`. The build intentionally copies only the app, supplied assets and approved `data/professionals.json`; proposed records and research reports are not deployed.
4. Save and deploy. Test the generated `https://YOUR-PROJECT.pages.dev/` URL, all six stages, filters, `data/professionals.json`, and the iframe on desktop and mobile. Confirm that `/data/proposed-professionals.json` is not present in the deployment.
5. Add a custom Pages domain only when ready. No deploy, custom domain or Cloudflare setting has been changed by this work.

No package installation or environment variables are required. The build command prepares a static output folder; it does not compile or rebuild the application.

## Embed in WordPress / Kadence

After deployment, add a **Custom HTML** block in the Kadence editor. It passes a `business` query parameter from the WordPress page to the directory, resizes the iframe as the directory changes, and acknowledges the resize before a shared listing link scrolls to its card.

Each card's **Copy listing link** button points to the WordPress guide with the provider's existing JSON `id`. A valid `business` parameter clears the default stage filter, reveals and highlights that card, and scrolls to it after the iframe resize is acknowledged.

```html
<iframe
  id="professionals-directory"
  src="https://professionals-ceq.pages.dev/"
  title="Commercial Property Professionals Guide"
  style="display:block;width:100%;height:1500px;border:0"
  loading="lazy"
></iframe>
<script>
(() => {
  const frame = document.getElementById('professionals-directory');
  const trustedOrigin = 'https://professionals-ceq.pages.dev';
  if (!frame) return;

  window.addEventListener('message', (event) => {
    if (event.origin !== trustedOrigin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object' ||
        data.type !== 'blue-dawn-guide:resize' ||
        !Number.isSafeInteger(data.height) ||
        data.height < 300 || data.height > 10000) return;
    frame.style.height = `${data.height}px`;
    frame.contentWindow.postMessage({ type: 'blue-dawn-guide:resize-ack' }, trustedOrigin);
  });

  const businessId = new URLSearchParams(window.location.search).get('business');
  if (businessId) {
    const iframeUrl = new URL(frame.src);
    iframeUrl.searchParams.set('business', businessId);
    frame.src = iframeUrl.href;
  }
})();
</script>
```

The app sends resize messages only to the exact Blue Dawn origins `https://bluedawncommercial.co.uk` and `https://www.bluedawncommercial.co.uk`. Only the origin matching the actual parent receives a message. The parent listener validates the iframe source, origin, message type and bounded integer height before resizing and acknowledging it. External provider links open in a new tab. If WordPress or a content-security policy removes inline scripts, add the same listener through an approved site-script mechanism; the iframe still has the 1500px fallback height.

The parent page and the embedded app are separate origins; do not rely on same-origin access. WordPress security settings or a content-security policy may restrict iframe use or inline scripts; in that case, place the listener in an approved site script or use the fixed-height fallback.

## WordPress SEO

Search engines may treat iframe content separately from the WordPress page, and there is no guarantee that the guide's text will contribute to the host page's ranking. Keep the page title, a useful introduction, the regions served, key property journey stages and relevant explanatory copy directly in WordPress. Treat the embedded app as an interactive tool, not a substitute for crawlable page content.

## Before publication

- Confirm the six withheld proposed businesses before adding any to the live JSON.
- Keep Blue Dawn Commercial as the only `Capital Allowances Specialists` listing; other tax/accountancy businesses must not use that category.
- Add only real providers and descriptions that have been checked and approved.
- Confirm each provider's website, logo permission, categories and service areas.
- Review the disclaimer and privacy requirements for any future data collection.
- Replace the example deployment hostname and configure the production WordPress origin for resizing.
- Preview the iframe on desktop and mobile, and verify the host site's iframe/CSP settings.
