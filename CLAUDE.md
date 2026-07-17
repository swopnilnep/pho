# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                       # Start dev server with live reload (eleventy --serve)
npm run build                   # Build static site to dist/
npm run ingest -- <folder>      # Import a folder of photos as a new album (see below)
```

There are no tests configured.

## Upstream pipeline (where albums come from)

This repo is the **public, curated** end of a two-stage photo pipeline; the private archive lives in the separate `backup-scripts` repo (`~/Backups/scripts`, symlinked into `~/.local/bin`):

1. **Archive:** `import-photos "Event" --apply` (card → `~/Pictures/Raw/YYYY/<event>/`, collision-proof names, launch-date guard) → edit in DxO PhotoLab (exports to a `./Edits` subfolder) → `backup-nas` (auto-runs `collect-edits`, which consolidates + EXIF-keyword-tags the JPGs into `~/Pictures/Edits/YYYY/<event>/`, then rsyncs raws → NAS `lab` and edits → NAS `homes/Photos` for Synology Photos).
2. **Publish (this repo):** hand-pick ~10 favorite JPGs from `~/Pictures/Edits/YYYY/<event>/`, then `npm run ingest -- <folder> --title "…"`, fill in the `description`, and push. `ingest` copies *every* file in the given folder (hence the curation step) and expects `.jpg`.

## Architecture

This is a static photo gallery site built with [Eleventy (11ty)](https://www.11ty.dev/).

- **Input:** `src/` → **Output:** `dist/`
- **Albums:** auto-discovered from `src/albums/<name>/` folders. Discovery runs in `.eleventy.js` via `addGlobalData("photos", discoverAlbums)`, which scans each folder for images and an optional `album.json` (`title`, `description`, `date`, `location`, `camera`, `tags`). Missing `date`/`camera` fall back to EXIF; missing `title` is derived from the folder name. Albums are ordered newest-first by date.
  - **Why config-global, not `src/_data/photos.js`:** a JavaScript file in `_data` trips an Eleventy 3 + Nunjucks async quirk that breaks the async image shortcode (`"next is not a function"`). Keep discovery in `.eleventy.js`.
- **Images:** processed at build time by `@11ty/eleventy-img` (in `.eleventy.js`), **not** passthrough-copied. The `galleryImage` Nunjucks shortcode generates AVIF/WebP/JPEG at 400/800/2000px → `dist/img/`, returning a `<picture>` (grid thumbnail) wrapped in an `<a>` (2000px lightbox target with build-time `data-pswp-width/height`). Source originals live in `src/albums/` and are never served directly; eleventy-img strips their EXIF from every variant.
- **Template:** `src/index.njk` extends `src/_includes/layouts/base.njk` (Nunjucks). Iterates over `photos` to render one `<section>` per album, calling `{% galleryImage image, section.title %}` per image.
- **Styles:** `src/styles/main.css` (plain CSS with nesting)
- **Client JS:** `src/scripts/gallery.js` — initializes a PhotoSwipe v4 lightbox per section, reading the build-time `data-pswp-width/height` (no runtime image probing)
- **Static assets** (`src/styles/`, `src/scripts/`, `src/favicon/`) are copied to `dist/` as-is via `addPassthroughCopy`.

### Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and deploys to **GitHub Pages via the native Actions flow** (`upload-pages-artifact` + `deploy-pages`; Pages source = "GitHub Actions"). PRs run `.github/workflows/ci.yml` (build only, no deploy). Served at pho.swopnil.com.

### PhotoSwipe integration

The base layout loads **PhotoSwipe v4** (not v5) from CDN and includes the `.pswp` lightbox DOM template. `gallery.js` groups anchors by their parent `<section>` and initializes a per-section PhotoSwipe instance on click, using the build-time dimensions baked into each `<a>`. Note: `package.json` lists `photoswipe@5` as a dependency, but the actual runtime uses v4 via CDN.

### Adding a new photo album

Two ways:
1. **Ingest (recommended):** `npm run ingest -- /path/to/folder --title "Album Title"`. Reads EXIF (camera, date, GPS→location), copies images into `src/albums/<slug>/`, and writes `album.json`. Then fill in the `description` (and tweak the title) in the generated `album.json`.
2. **Manual:** drop a folder of images into `src/albums/<name>/`. It renders automatically with an EXIF-derived date/camera and a title from the folder name. Add an `album.json` to set title/description/location/tags.
