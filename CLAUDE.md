# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Start dev server with live reload (eleventy --serve)
npm run build    # Build static site to dist/
```

There are no tests configured.

## Architecture

This is a static photo gallery site built with [Eleventy (11ty)](https://www.11ty.dev/).

- **Input:** `src/` → **Output:** `dist/`
- **Data:** `src/_data/photos.json` — array of photo section objects, each with `title`, `description`, `date`, `location`, `camera`, `tags`, and `images` (array of paths relative to `src/`)
- **Template:** `src/index.njk` extends `src/_includes/layouts/base.njk` (Nunjucks). Iterates over the `photos` data to render one `<section>` per album.
- **Styles:** `src/styles/main.css` (plain CSS with nesting)
- **Client JS:** `src/scripts/gallery.js` — initializes PhotoSwipe v4 lightbox per section after all images load
- **Static assets** (`src/images/`, `src/styles/`, `src/scripts/`, `src/favicon/`) are copied to `dist/` as-is via `addPassthroughCopy` in `.eleventy.js`

### PhotoSwipe integration

The base layout loads **PhotoSwipe v4** (not v5) from CDN and includes the `.pswp` lightbox DOM template. `gallery.js` groups anchor elements by their parent `<section>` ID, preloads images to get natural dimensions, then initializes a per-section PhotoSwipe instance on click. Note: `package.json` lists `photoswipe@5` as a dependency, but the actual runtime uses v4 via CDN.

### Adding a new photo album

Add an entry to `src/_data/photos.json` and place the image files in `src/images/`. The template and gallery script handle the rest automatically.
