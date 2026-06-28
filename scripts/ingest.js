#!/usr/bin/env node
// Ingest a folder of photos into the gallery.
//
//   npm run ingest -- <folder> [--title "Album Title"] [--tags travel,landscape]
//
// For each image it reads EXIF (camera, capture date, GPS), copies the file
// into src/images/ under an album slug, and prepends a new album entry to
// src/_data/photos.json. Camera and date are auto-filled from EXIF; location
// is reverse-geocoded from GPS when present. You only fill in title (if not
// passed) and description afterwards.
//
// Note: the EXIF stays on the *source* copy only — eleventy-img strips metadata
// from every variant it serves, so nothing public leaks capture coordinates.

const fs = require("fs");
const path = require("path");
const exifr = require("exifr");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const IMAGES_DIR = path.join(__dirname, "..", "src", "images");
const PHOTOS_JSON = path.join(__dirname, "..", "src", "_data", "photos.json");
const DEFAULT_TAGS = ["travel", "landscape"];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      args[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(d) {
  if (!d || isNaN(d)) return "";
  // Match the existing "Mon D YYYY" style in photos.json (no comma).
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .replace(",", "");
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "pho-gallery-ingest/1.0 (personal photo site)" },
    });
    if (!res.ok) return "";
    const data = await res.json();
    const a = data.address || {};
    const city = a.city || a.town || a.village || a.county || "";
    const region = a.state || a.country || "";
    return [city, region].filter(Boolean).join(", ");
  } catch {
    return ""; // best-effort: offline or rate-limited -> fill in by hand
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const folder = args._[0];

  if (!folder) {
    console.error("Usage: npm run ingest -- <folder> [--title \"...\"] [--tags a,b]");
    process.exit(1);
  }
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    console.error(`Not a directory: ${folder}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(folder)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(folder, f));

  if (!files.length) {
    console.error(`No images (${[...IMAGE_EXTS].join(", ")}) found in ${folder}`);
    process.exit(1);
  }

  const title = args.title || path.basename(path.resolve(folder));
  const slug = slugify(title);
  const tags = args.tags ? args.tags.split(",").map((t) => t.trim()) : DEFAULT_TAGS;

  // Read EXIF for each file, then order by capture time.
  const entries = [];
  for (const file of files) {
    let exif = {};
    try {
      exif = (await exifr.parse(file, { gps: true })) || {};
    } catch {
      /* unreadable EXIF — still ingest the file */
    }
    entries.push({ file, exif, date: exif.DateTimeOriginal });
  }
  entries.sort((a, b) => (a.date || 0) - (b.date || 0));

  // Camera + date from the first image that has them.
  const withCamera = entries.find((e) => e.exif.Model);
  const camera = withCamera
    ? `${withCamera.exif.Make || ""} ${withCamera.exif.Model}`.trim()
    : "";
  const withDate = entries.find((e) => e.date);
  const date = withDate ? formatDate(new Date(withDate.date)) : "";

  // Location from the first image with GPS (best-effort reverse geocode).
  let location = args.location || "";
  if (!location) {
    const withGps = entries.find(
      (e) => e.exif.latitude != null && e.exif.longitude != null
    );
    if (withGps) {
      location = await reverseGeocode(withGps.exif.latitude, withGps.exif.longitude);
    }
  }

  // Copy files into src/images/ as <slug>-<n>.<ext> and collect web paths.
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const images = entries.map((e, i) => {
    const ext = path.extname(e.file).toLowerCase();
    const name = `${slug}-${i + 1}${ext}`;
    fs.copyFileSync(e.file, path.join(IMAGES_DIR, name));
    return `images/${name}`;
  });

  const album = {
    title,
    description: "",
    date,
    location,
    camera,
    tags,
    images,
  };

  // Prepend as the newest album.
  const all = JSON.parse(fs.readFileSync(PHOTOS_JSON, "utf8"));
  all.unshift(album);
  fs.writeFileSync(PHOTOS_JSON, JSON.stringify(all, null, 4) + "\n");

  console.log(`Ingested ${images.length} image(s) into album "${title}"`);
  console.log(`  date:     ${date || "(none — fill in)"}`);
  console.log(`  camera:   ${camera || "(none — fill in)"}`);
  console.log(`  location: ${location || "(none — fill in)"}`);
  console.log("");
  console.log("Now edit src/_data/photos.json: set the title (if needed) and description.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
