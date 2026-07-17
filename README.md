# pho 🍜

**pho**-tos — a simple, fast static photo gallery built with [Eleventy](https://www.11ty.dev/) and [PhotoSwipe](https://photoswipe.com/). Live at **[pho.swopnil.com](https://pho.swopnil.com)**.

Photos live in folders. Add a folder, push, and it publishes itself — image resizing, format conversion, metadata, and deployment are all automatic.

---

## The full pipeline

This gallery is the **public, curated** end of a two-stage flow. The private archive lives elsewhere (the `backup-scripts` repo: `import-photos`, `collect-edits`, `backup-nas`); this repo publishes a handful of favorites from it.

```
 📷 card ─ import-photos "Event" ─► ~/Pictures/Raw/YYYY/<event>/   (originals, renamed, date-guarded)
                                        │ edit in DxO → ./Edits/
                                        ▼ backup-nas (auto-runs collect-edits)
              ~/Pictures/Edits/YYYY/<event>/*_DxO.jpg  ─► NAS + Synology Photos   (private archive)
                                        │
     ── curate ~10 favorites ──────────┘
                                        ▼ npm run ingest -- <folder> --title "…"
                    src/albums/<slug>/ (+ album.json)  ─ git push ─► GitHub Actions ─► pho.swopnil.com
```

**Stage 1 — archive (every keeper):** `import-photos` → edit in DxO → `backup-nas`. Originals go to cold NAS storage; edited JPGs (event baked into their keywords) land in Synology Photos.

**Stage 2 — publish (a curated few):** hand-pick ~10 edited JPGs into a folder, then `npm run ingest` them here (below). The one manual step is picking favorites — `ingest` copies *every* file in the folder you give it, and wants `.jpg`, not raws. The build strips EXIF/GPS from every served image, so nothing public leaks a location.

---

## Setup (one time)

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/swopnilnep/pho.git
cd pho
npm install
```

## Run it locally

```bash
npm start
```

Open the printed URL (usually <http://localhost:8080>). The site rebuilds and reloads as you edit. To produce the final files without serving:

```bash
npm run build      # writes the site to dist/
```

---

## Adding a photo album

Each album is a folder under `src/albums/`. There are two ways to create one.

### Option A — Ingest a folder (recommended)

Point the ingest command at a folder of photos straight off your camera or export:

```bash
npm run ingest -- /path/to/your/photos --title "Cape Disappointment"
```

This will:

- read each photo's EXIF to fill in the **date**, **camera**, and (if the photos have GPS) **location**,
- copy the images into `src/albums/cape-disappointment/`, sorted by capture time,
- write an `album.json` with everything it found.

Then open the generated `src/albums/<slug>/album.json` and **add a description** (the one thing it can't guess):

```json
{
    "title": "Cape Disappointment",
    "description": "20 feet waves off the Washington coast",
    "date": "Dec 1 2024",
    "location": "Cape Disappointment State Park, Washington",
    "camera": "SONY ILCE-7C",
    "tags": ["travel", "landscape"]
}
```

**Options:**

| Flag | Meaning | Default |
|---|---|---|
| `--title "..."` | Album title (also sets the folder name) | the source folder's name |
| `--tags a,b,c` | Comma-separated tags | `travel, landscape` |
| `--location "..."` | Override the location instead of geocoding GPS | from GPS, if present |

### Option B — Drop a folder in by hand

1. Create `src/albums/<your-album-name>/`.
2. Put your image files (`.jpg`, `.jpeg`, `.png`) in it.
3. (Optional) add an `album.json` (see fields below).

With no `album.json`, the album still works: the title comes from the folder name, and the date and camera are read from the photos' EXIF.

> **Tip:** images display in filename order, so name them so they sort the way you want (e.g. `01.jpg`, `02.jpg`).

### `album.json` fields

All fields are optional — anything you leave out is filled from EXIF or sensible defaults.

| Field | Description |
|---|---|
| `title` | Album heading. Defaults to a prettified folder name. |
| `description` | Caption shown under the title. |
| `date` | Display date, e.g. `"Dec 1 2024"`. Defaults to the EXIF capture date. Also used to order albums (newest first). |
| `location` | Place shown with a map-pin icon. |
| `camera` | Camera shown with a camera icon. Defaults to EXIF make + model. |
| `tags` | Array of tags, e.g. `["travel", "landscape"]`. |

---

## Preview your changes

```bash
npm start
```

Check the new album looks right, then publish.

## Publishing

The site deploys automatically. Commit your new album folder and push to `main`:

```bash
git add src/albums/
git commit -m "Add Cape Disappointment album"
git push
```

GitHub Actions builds the site and deploys it to **pho.swopnil.com** within a couple of minutes. You can watch the run under the repo's **Actions** tab. Pull requests get a build check (but don't deploy) before you merge.

---

## How it works (the short version)

- You only ever add **full-resolution originals** to `src/albums/`. They are never served directly.
- At build time, [`@11ty/eleventy-img`](https://www.11ty.dev/docs/plugins/image/) generates small, modern variants (AVIF/WebP/JPEG at several sizes). The grid loads tiny thumbnails; clicking opens a large version in the PhotoSwipe lightbox.
- EXIF metadata (including GPS) is **stripped** from every served image, so nothing public leaks where a photo was taken.

## Project layout

```
src/
  albums/<name>/        one folder per album: images + optional album.json
  index.njk             page template (one section per album)
  _includes/layouts/    base HTML layout + PhotoSwipe markup
  styles/main.css       styles
  scripts/gallery.js    lightbox behavior
scripts/ingest.js       the `npm run ingest` command
.eleventy.js            build config: album discovery + image generation
```

## Troubleshooting

- **My album isn't showing up.** Make sure the folder is directly under `src/albums/` and contains at least one `.jpg`/`.jpeg`/`.png`. Restart `npm start` after adding a new folder.
- **Wrong date or order.** Albums sort by `date` (newest first). Set `date` in `album.json` to fix it.
- **Location is blank.** The photos had no GPS data. Add `location` to `album.json` (or pass `--location` to ingest).
- **The build is slow the first time.** Generating image variants takes a few seconds per photo. Subsequent builds reuse the cached output and are much faster.
