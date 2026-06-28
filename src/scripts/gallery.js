// Initialize a PhotoSwipe (v4) lightbox per <section>. Image dimensions are
// emitted at build time as data-pswp-width/height on each <a>, so there's no
// need to preload images to measure them.
document.querySelectorAll('section').forEach((section) => {
  const anchors = Array.from(section.querySelectorAll('.gallery-grid a'));
  if (!anchors.length) return;

  const items = anchors.map((a) => ({
    src: a.href,
    w: parseInt(a.dataset.pswpWidth, 10),
    h: parseInt(a.dataset.pswpHeight, 10),
  }));

  section.addEventListener('click', (event) => {
    const clicked = event.target.closest('a');
    if (!clicked) return;
    event.preventDefault();

    const options = {
      index: anchors.indexOf(clicked),
      bgOpacity: 0.85,
      showHideOpacity: true,
    };

    new PhotoSwipe(
      document.querySelector('.pswp'),
      PhotoSwipeUI_Default,
      items,
      options
    ).init();
  });
});
