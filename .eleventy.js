// .eleventy.js
const fs = require("fs");
const path = require("path");
const Image = require("@11ty/eleventy-img");
const exifr = require("exifr");

// Grid thumbnails are displayed small; the lightbox needs a large variant.
// 1200 keeps wide justified rows crisp on retina; 2000 is the lightbox target.
const THUMB_WIDTHS = [400, 800, 1200];
const LIGHTBOX_WIDTH = 2000;
const FORMATS = ["avif", "webp", "jpeg"];
const GRID_SIZES = "(min-width: 700px) 45vw, 100vw";

const ALBUMS_DIR = path.join(__dirname, "src", "albums");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const DEFAULT_TAGS = ["travel", "landscape"];

// Generate responsive variants for one source image and return the markup:
// an <a> (lightbox target, with build-time dimensions for PhotoSwipe) wrapping
// a <picture> whose <img> only ever loads thumbnail-sized files in the grid.
async function galleryImage(src, alt) {
  const metadata = await Image(`src/${src}`, {
    widths: [...THUMB_WIDTHS, LIGHTBOX_WIDTH],
    formats: FORMATS,
    outputDir: "./dist/img/",
    urlPath: "/img/",
  });

  const pick = (fmt, width) =>
    metadata[fmt] && metadata[fmt].find((e) => e.width === width);
  const largest = (fmt) =>
    metadata[fmt] && metadata[fmt][metadata[fmt].length - 1];

  // <source> per format, restricted to thumbnail widths so the grid never
  // pulls the 2000px lightbox variant.
  const sources = FORMATS.filter((f) => metadata[f])
    .map((f) => {
      const srcset = metadata[f]
        .filter((e) => THUMB_WIDTHS.includes(e.width))
        .map((e) => `${e.url} ${e.width}w`)
        .join(", ");
      return `<source type="${metadata[f][0].sourceType}" srcset="${srcset}" sizes="${GRID_SIZES}">`;
    })
    .join("");

  const thumb = pick("jpeg", THUMB_WIDTHS[0]) || metadata.jpeg[0];
  const large = pick("jpeg", LIGHTBOX_WIDTH) || largest("jpeg");

  // Aspect ratio drives the justified-row layout: each tile grows proportional
  // to --ar so rows fill edge-to-edge without cropping or stretching orphans.
  const ar = (large.width / large.height).toFixed(4);

  return (
    `<a class="grid-item" style="--ar:${ar}" href="${large.url}" ` +
    `data-pswp-width="${large.width}" data-pswp-height="${large.height}">` +
    `<picture>${sources}` +
    `<img src="${thumb.url}" width="${thumb.width}" height="${thumb.height}" ` +
    `alt="${alt}" loading="lazy" decoding="async">` +
    `</picture></a>`
  );
}

function prettify(name) {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Friendly camera names for the metadata pill, e.g. "SONY ILCE-7C" -> "Sony A7C".
const CAMERA_NAMES = {
  "ILCE-7C": "Sony A7C",
  "ILCE-7CM2": "Sony A7C II",
  "DSC-RX100M7": "Sony RX100 VII",
};
function prettifyCamera(camera) {
  if (!camera) return "";
  const model = camera.replace(/^sony\s+/i, "").trim();
  if (CAMERA_NAMES[model]) return CAMERA_NAMES[model];
  // Fall back to a tidy "Make Model" with the redundant SONY prefix removed.
  return camera.replace(/^SONY\s+/i, "Sony ").trim();
}

function formatDate(d) {
  if (!d || isNaN(d)) return "";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .replace(",", "");
}

// Auto-discover albums from src/albums/<name>/. Drop a folder of images in and
// it renders — no config edits. An optional album.json supplies title/
// description/location/tags; date and camera fall back to EXIF. Newest first.
//
// NOTE: this lives in the config as global data (not src/_data/photos.js) on
// purpose — a JavaScript file in _data trips an Eleventy 3 + Nunjucks async
// quirk that breaks the async image shortcode ("next is not a function").
async function discoverAlbums() {
  if (!fs.existsSync(ALBUMS_DIR)) return [];

  const dirs = fs
    .readdirSync(ALBUMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  const albums = [];
  for (const dir of dirs) {
    const folder = path.join(ALBUMS_DIR, dir.name);
    const files = fs
      .readdirSync(folder)
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort();
    if (!files.length) continue;

    let meta = {};
    const metaPath = path.join(folder, "album.json");
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      } catch (e) {
        console.warn(`[albums] bad album.json in ${dir.name}: ${e.message}`);
      }
    }

    // Fill date/camera from EXIF when album.json doesn't specify them, and
    // compute a chronological sort key from the newest capture time.
    let camera = meta.camera || "";
    let date = meta.date || "";
    let exifTime = 0;
    for (const f of files) {
      let ex = {};
      try {
        ex = (await exifr.parse(path.join(folder, f))) || {};
      } catch {
        /* unreadable EXIF — skip */
      }
      if (ex.DateTimeOriginal) {
        const t = new Date(ex.DateTimeOriginal).getTime();
        if (t > exifTime) exifTime = t;
        if (!date) date = formatDate(new Date(ex.DateTimeOriginal));
      }
      if (!camera && ex.Model) camera = `${ex.Make || ""} ${ex.Model}`.trim();
    }

    albums.push({
      title: meta.title || prettify(dir.name),
      description: meta.description || "",
      date,
      location: meta.location || "",
      camera: prettifyCamera(camera),
      tags: meta.tags || DEFAULT_TAGS,
      images: files.map((f) => `albums/${dir.name}/${f}`),
      sort: Date.parse(date) || exifTime || 0,
    });
  }

  albums.sort((a, b) => b.sort - a.sort);
  return albums;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addAsyncShortcode("galleryImage", galleryImage);
  eleventyConfig.addGlobalData("photos", discoverAlbums);

  // src/albums holds the *source* images for generated variants — not copied.
  eleventyConfig.addPassthroughCopy("src/styles");
  eleventyConfig.addPassthroughCopy("src/scripts");
  eleventyConfig.addPassthroughCopy("src/favicon");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon.png");
  eleventyConfig.addPassthroughCopy("src/og-image.jpg"); // social share preview

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
