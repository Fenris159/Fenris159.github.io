# Fenris

Personal GitHub Pages site for Fenris.

## Portfolio performance

The root page retains its static repository list while refreshing GitHub data
when the list comes within 400 pixels of the viewport. Successful results are
cached locally for 15 minutes. A failed request or unavailable browser storage
keeps the existing content usable.

The small stylesheet is inlined into `index.html` to remove a render-blocking
request. Edit `styles.css`, then run `python3 tools/sync-portfolio-styles.py` to
update the generated block. `--check` verifies that they match. JavaScript is
deferred, and the starfield uses dimensions delivered by `ResizeObserver`
instead of synchronous viewport reads. It pauses in hidden tabs and draws a
single static frame when reduced motion is requested.

The 460 × 460 avatar is served as a 19,664-byte WebP, with the original
31,580-byte JPEG retained for browsers without WebP support. The layout and
image dimensions are preserved.

GitHub Pages currently serves assets with `Cache-Control: max-age=600` and
[does not support custom response headers](https://github.com/orgs/community/discussions/60087).
That PageSpeed cache-lifetime warning cannot be removed by adding repository
headers; these changes reduce the requested bytes and avoid repeated GitHub API
calls instead.

For validation, use Node.js 20 or later and Python 3:

```console
npm ci
npx playwright install chromium
npm run check
```

The browser checks cover initial requests, desktop and mobile layouts, repository
ranking and caching, API failures, blocked or corrupt storage, no-JavaScript
content, resizing, reduced motion, and hidden-tab animation. An existing Chromium
installation can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
The site remains buildless; Node and Playwright are used only for checks.

## SrvSurvey-XP

The application site lives at <https://fenris159.github.io/srvsurvey/>. Its
buildless static source is in `srvsurvey/`; the root developer portfolio is
retained and links to the application site.

- Homepage: <https://fenris159.github.io/srvsurvey/>
- Privacy Policy: <https://fenris159.github.io/srvsurvey/privacy.html>
- Terms of Service: <https://fenris159.github.io/srvsurvey/terms.html>

Content and screenshot assets are adapted from `Fenris159/SrvSurvey`'s
`SrvSurvey-Avalonia` README and RC.62 capabilities (source commit
`9fc98deb0903544caf316a43882570b3691a6759`). The original SrvSurvey by
`njthomson` is credited on the homepage and Terms of Service. Game imagery belongs
to the respective rights holders. The application license remains GNU GPL v3.

The app site has no analytics scripts, externally hosted fonts or login flow.
It uses a responsive navigation menu, native expandable details, and a screenshot
dialog with ordinary image links as the no-JavaScript fallback.

### Local preview and checks

Run `python3 -m http.server 8765 --bind 127.0.0.1` from this repository, then visit
`http://127.0.0.1:8765/srvsurvey/`. Validate JavaScript with
`node --check srvsurvey/site.js` and check local links and image files with
`python3 tools/check-srvsurvey-site.py`. Check desktop and mobile layouts before
publishing. GitHub Pages publishes `main` from the repository root.

### Google OAuth branding

Use the three public URLs above for the homepage, privacy policy and terms.
The expected Authorized domain is `fenris159.github.io`. Verify control through
Google Search Console with the Google Cloud project owner/editor account. Use a
URL-prefix property for `https://fenris159.github.io/` and add Google's exact
verification file at the repository root, or its verification meta tag to the
root homepage. Do not remove the verification file/tag after approval. Publishing
the site does not itself verify OAuth branding; Google's review determines
acceptance.

### Search discovery

The XML sitemap at <https://fenris159.github.io/sitemap.xml> lists the portfolio,
application homepage, Privacy Policy and Terms of Service. `robots.txt` points
crawlers to it. Keep the sitemap in sync when adding or removing public pages;
do not list asset files or ownership verification files.

For the Search Console property `https://fenris159.github.io/`, submit
`sitemap.xml` in **Sitemaps → Add a new sitemap**. The `/srvsurvey/` HTML page is
not itself a sitemap; an entry for that page can be removed from the Sitemaps
report and replaced with `sitemap.xml`. Sitemap submission helps search
discovery; it does not replace Search Console ownership verification or Google
OAuth branding review.

Recheck the privacy policy when integrations, permissions, payloads, retention,
activity reporting or credential handling change. Update the policy dates when
data practices change. GitHub is the default public support route; do not post
private credentials in issues.
