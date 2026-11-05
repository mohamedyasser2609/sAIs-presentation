// sAIs Presentation - Reveal.js Initialization & Lifecycle Controller

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Reveal !== 'undefined') {
    Reveal.initialize({
      // 16:9 Presentation Canvas Proportions (Projector & Monitor standard)
      width: 1440,
      height: 900,
      margin: 0.04, // Reduced margin maximizes active projection viewing area
      minScale: 0.2,
      maxScale: 2.5,

      // Navigation & Presentation Controls
      controls: true,
      progress: true,
      center: false,
      hash: true,
      history: true,
      keyboard: true,
      overview: true,
      touch: true,
      loop: false,

      // Transition Configuration
      transition: 'fade',
      transitionSpeed: 'default',
      backgroundTransition: 'fade',

      // Slide numbering
      slideNumber: 'c/t'
    }).then(() => {
      console.log('[sAIs] Presentation initialized with high-legibility display scale.');
      syncDeckMetadata();
    });

    Reveal.on('slidechanged', (event) => {
      syncDeckMetadata(event.currentSlide);
    });
  }
});

/**
 * Synchronizes persistent header breadcrumb and footer counter with the active slide
 */
function syncDeckMetadata(activeSlide) {
  const currentSlide = activeSlide || Reveal.getCurrentSlide();
  if (!currentSlide) return;

  const currentSlideIndex = Reveal.getState().indexh + 1;
  const totalSlides = Reveal.getTotalSlides();

  // Update slide counter
  const counterEl = document.getElementById('footer-slide-counter');
  if (counterEl) {
    counterEl.innerText = `SLIDE ${String(currentSlideIndex).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }

  // Update section category in header if available
  const categoryAttr = currentSlide.getAttribute('data-category');
  const sectionHeaderEl = document.getElementById('deck-header-section');
  if (sectionHeaderEl && categoryAttr) {
    sectionHeaderEl.innerText = categoryAttr.toUpperCase();
  } else if (sectionHeaderEl) {
    sectionHeaderEl.innerText = 'ENGINEERING SYSTEM PROPOSAL';
  }
}
