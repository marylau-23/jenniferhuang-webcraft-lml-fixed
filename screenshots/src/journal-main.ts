/**
 * Journal Page — shared chrome only (noise, clock, hamburger, scrollbar, ribbons, transitions).
 */
import './style.css';
import {
  initNoiseCanvas,
  initHamburger,
  initFooterClock,
  initCustomScrollbar,
  initRibbonTrail,
  initPageTransitions,
} from './shared';
import { initGalleryCanvas, initTypewriter, initEggDrag } from './gallery';

function init(): void {
  initNoiseCanvas();
  initFooterClock();
  initHamburger();
  initCustomScrollbar();
  initRibbonTrail();
  initPageTransitions();

  // Creative gallery (亮 metallic paint, typewriter, draggable + double-clickable eggs)
  initGalleryCanvas();
  initTypewriter();
  initEggDrag();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
