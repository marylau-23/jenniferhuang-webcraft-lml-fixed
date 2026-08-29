/**
 * Work Detail Page — Minimal JS
 * Handles: noise overlay, scroll progress bar, footer clock, hamburger menu, scrollbar
 */

// style.css is loaded render-blocking via <link> in the HTML <head> (prevents dev FOUC).
import {
  initNoiseCanvas,
  initHamburger,
  initFooterClock,
  initCustomScrollbar,
  initRibbonTrail,
  initPageTransitions,
} from './shared';
import { initGalleryCanvas, initTypewriter, initEggDrag } from './gallery';

// ========== FULL-SCREEN IMAGE CAROUSEL (OG: click-through, one image at a time) ==========
// The OG detail page shows ONE full-viewport image at a time; clicking the left/right
// half steps to the previous/next image, and the bottom bar shows position. (Our old
// version stacked every image vertically — wrong.)
function initWorkDetailCarousel() {
  const page = document.querySelector('.work-detail-page');
  if (!page) return;

  // Collect media in DOM order: hero image(s) + the DESKTOP gallery (skip #mobile-gallery).
  const heroMedia = Array.from(page.querySelectorAll<HTMLElement>('.work-detail-hero img, .work-detail-hero video'));
  const desktopGallery = page.querySelector('.work-detail-gallery:not(#mobile-gallery)');
  const galleryMedia = desktopGallery
    ? Array.from(desktopGallery.querySelectorAll<HTMLElement>('img, video'))
    : [];
  const sourceMedia = [...heroMedia, ...galleryMedia].filter((el) => el.getAttribute('src'));
  if (sourceMedia.length === 0) return;

  // Build the carousel from clones (preserves <img>/<video>), then hide the originals.
  const carousel = document.createElement('section');
  carousel.className = 'work-detail-carousel';

  const slides = sourceMedia.map((el) => {
    const slide = document.createElement('div');
    slide.className = 'work-detail-slide';

    const node = el.cloneNode(true) as HTMLElement;
    node.className = 'work-detail-slide-media';
    node.removeAttribute('width');
    node.removeAttribute('height');
    node.removeAttribute('loading');
    node.removeAttribute('style');
    slide.appendChild(node);
    carousel.appendChild(slide);

    // Tall (portrait) image: in the OG these are not cropped to fit — the frame
    // stays fixed and you scroll *through* the image. Mark it so CSS lets it
    // overflow and the wheel handler can pan it.
    if (node instanceof HTMLImageElement) {
      const markTall = () => {
        if (!node.naturalWidth || !node.naturalHeight) return;
        const imgAspect = node.naturalHeight / node.naturalWidth;
        const frameAspect = window.innerHeight / window.innerWidth;
        if (imgAspect > frameAspect * 1.15) slide.classList.add('work-detail-slide--tall');
      };
      if (node.complete) markTall();
      else node.addEventListener('load', markTall);
    }
    return slide;
  });

  const prevZone = document.createElement('button');
  prevZone.type = 'button';
  prevZone.className = 'work-detail-zone work-detail-zone--prev';
  prevZone.setAttribute('aria-label', 'Previous image');
  const nextZone = document.createElement('button');
  nextZone.type = 'button';
  nextZone.className = 'work-detail-zone work-detail-zone--next';
  nextZone.setAttribute('aria-label', 'Next image');
  carousel.appendChild(prevZone);
  carousel.appendChild(nextZone);

  // Custom cursor label that follows the mouse and reads "Prev" on the left half,
  // "Next" on the right half (OG hides the native cursor and shows this).
  const cursorLabel = document.createElement('div');
  cursorLabel.className = 'work-detail-cursor';
  carousel.appendChild(cursorLabel);

  carousel.addEventListener('mousemove', (e) => {
    const rect = carousel.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorLabel.style.left = `${x}px`;
    cursorLabel.style.top = `${y}px`;
    cursorLabel.textContent = x < rect.width / 2 ? 'Prev' : 'Next';
  });
  carousel.addEventListener('mouseenter', () => cursorLabel.classList.add('is-visible'));
  carousel.addEventListener('mouseleave', () => cursorLabel.classList.remove('is-visible'));

  // Mouse-wheel hint shown over tall slides to signal they can be scrolled.
  const scrollHint = document.createElement('div');
  scrollHint.className = 'work-detail-scroll-hint';
  scrollHint.setAttribute('aria-hidden', 'true');
  scrollHint.innerHTML =
    '<span class="work-detail-mouse"><span class="work-detail-mouse-wheel"></span></span>' +
    '<span class="work-detail-scroll-label">Scroll</span>';
  carousel.appendChild(scrollHint);

  // Hide the original stacked hero + galleries; insert the carousel at the top.
  page.querySelectorAll<HTMLElement>('.work-detail-hero, .work-detail-gallery').forEach((s) => {
    s.style.display = 'none';
  });
  page.insertBefore(carousel, page.firstChild);

  const bar = document.getElementById('progress-bar');
  let index = 0;
  function show(n: number) {
    index = (n + slides.length) % slides.length; // loop within the project
    slides.forEach((s, i) => {
      const on = i === index;
      s.classList.toggle('is-active', on);
      if (on) s.scrollTop = 0; // tall slides start at the top
    });
    const tall = slides[index].classList.contains('work-detail-slide--tall');
    scrollHint.classList.toggle('is-visible', tall);
    scrollHint.classList.remove('is-dismissed');
    if (bar) bar.style.width = `${((index + 1) / slides.length) * 100}%`;
  }
  show(0);

  // On tall slides the wheel pans the image through the fixed frame (and the
  // page doesn't scroll); the hint fades once the user starts scrolling.
  carousel.addEventListener(
    'wheel',
    (e) => {
      const active = slides[index];
      if (!active.classList.contains('work-detail-slide--tall')) return;
      active.scrollTop += e.deltaY;
      scrollHint.classList.add('is-dismissed');
      e.preventDefault();
    },
    { passive: false }
  );

  prevZone.addEventListener('click', () => show(index - 1));
  nextZone.addEventListener('click', () => show(index + 1));
  // Keyboard arrows for accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  initNoiseCanvas();
  initWorkDetailCarousel();
  initFooterClock();
  initHamburger();
  initCustomScrollbar();
  initRibbonTrail();
  initPageTransitions();

  // Creative gallery (亮 metallic paint, typewriter, draggable + double-clickable eggs)
  initGalleryCanvas();
  initTypewriter();
  initEggDrag();
});
