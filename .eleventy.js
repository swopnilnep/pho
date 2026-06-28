// .eleventy.js
const Image = require("@11ty/eleventy-img");

// Grid thumbnails are displayed small; the lightbox needs a large variant.
const THUMB_WIDTHS = [400, 800];
const LIGHTBOX_WIDTH = 2000;
const FORMATS = ["avif", "webp", "jpeg"];
const GRID_SIZES = "(min-width: 700px) 30vw, 100vw";

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

  return (
    `<a href="${large.url}" data-pswp-width="${large.width}" data-pswp-height="${large.height}">` +
    `<picture>${sources}` +
    `<img src="${thumb.url}" width="${thumb.width}" height="${thumb.height}" ` +
    `alt="${alt}" loading="lazy" decoding="async">` +
    `</picture></a>`
  );
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addAsyncShortcode("galleryImage", galleryImage);

  // src/images is the *source* for generated variants — no longer copied as-is.
  eleventyConfig.addPassthroughCopy("src/styles");
  eleventyConfig.addPassthroughCopy("src/scripts");
  eleventyConfig.addPassthroughCopy("src/favicon");

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
