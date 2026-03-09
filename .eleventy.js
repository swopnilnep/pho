// .eleventy.js
module.exports = function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/images");
    eleventyConfig.addPassthroughCopy("src/styles");
    eleventyConfig.addPassthroughCopy("src/scripts"); 
    eleventyConfig.addPassthroughCopy("src/favicon");
    return {
      dir: {
        input: "src",
        output: "dist"
      }
    };
  };