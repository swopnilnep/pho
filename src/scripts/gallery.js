const galleryElements = document.querySelectorAll('.gallery-grid a');
const galleries = {};

galleryElements.forEach(el => {
  const section = el.closest('section');
  const sectionId = section.id || section.getAttribute('data-section-id');

  if (!galleries[sectionId]) {
    galleries[sectionId] = { items: [], initialized: false };
  }

  const img = new Image();
  img.src = el.href;

  img.onload = () => {
    galleries[sectionId].items.push({
      src: el.href,
      w: img.naturalWidth,
      h: img.naturalHeight
    });

    // Initialize Photoswipe only once per section, after all images have loaded
    if (!galleries[sectionId].initialized && galleries[sectionId].items.length === section.querySelectorAll('.gallery-grid a').length) { 
      initPhotoSwipe(section, sectionId);
      galleries[sectionId].initialized = true;
    }
  };
});

function initPhotoSwipe(section, sectionId) {
  // Attach click listener to the section to handle clicks on all images
  section.addEventListener('click', (event) => { 
    const clickedImage = event.target.closest('a'); 

    if (clickedImage) {
      event.preventDefault();

      const gallery = galleries[sectionId];

      if (gallery && gallery.items.length > 0) {
        const options = {
          // Find the index of the clicked image
          index: gallery.items.findIndex(item => item.src === clickedImage.href), 
          bgOpacity: 0.85,
          showHideOpacity: true
        };

        new PhotoSwipe(document.querySelector('.pswp'), PhotoSwipeUI_Default, gallery.items, options).init();
      } else {
        console.error('Photoswipe gallery not found or no items in gallery:', sectionId);
      }
    }
  });
}