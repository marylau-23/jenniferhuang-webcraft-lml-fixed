// style.css is loaded render-blocking via <link> in the HTML <head> (prevents dev FOUC).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWorkHorizontalScroll } from './project-showcase';
import {
  initNoiseCanvas,
  initHamburger,
  initFooterClock,
  initCustomScrollbar,
  initHoverSound,
  initLenis,
  initRibbonTrail,
  initPageTransitions,
} from './shared';
import { initGalleryCanvas, initTypewriter, initEggDrag } from './gallery';

gsap.registerPlugin(ScrollTrigger);


// ========================================
// TAB SWITCHING (Overview / Index)
// ========================================

function initTabSwitching(): void {
  const tabs = document.querySelectorAll<HTMLElement>('.work-tab');
  const overviewSection = document.getElementById('work-showcase');
  const indexSection = document.getElementById('work-index');

  console.log('[Tabs] tabs:', tabs.length, 'overview:', !!overviewSection, 'index:', !!indexSection);
  if (!tabs.length || !overviewSection || !indexSection) return;

  // The page defaults to the Index tab, so the Overview horizontal scroll is
  // initialized lazily the first time Overview is opened. Initializing it up
  // front while the section is display:none makes GSAP mis-measure the pin and
  // leaves the canvas/pin-spacer visible over the index list.
  let overviewInited = false;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');

      // Update active tab
      tabs.forEach((t) => t.classList.remove('work-tab--active'));
      tab.classList.add('work-tab--active');

      if (tabName === 'overview') {
        overviewSection.style.display = '';
        indexSection.style.display = 'none';
        if (!overviewInited) {
          initWorkHorizontalScroll();
          overviewInited = true;
        }
        const titleOverlay = overviewSection.querySelector('.work-titles-overlay') as HTMLElement;
        if (titleOverlay) { titleOverlay.style.display = 'block'; titleOverlay.style.opacity = '1'; }
        const pinSpacer = overviewSection.closest('.pin-spacer') as HTMLElement;
        if (pinSpacer) pinSpacer.style.display = '';
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
      } else if (tabName === 'index') {
        overviewSection.style.display = 'none';
        const pinSpacer = overviewSection.closest('.pin-spacer') as HTMLElement;
        if (pinSpacer) pinSpacer.style.display = 'none';
        indexSection.style.display = '';
        window.scrollTo(0, 0);
      }
    });
  });
}


// ========================================
// INDEX VIEW — HOVER IMAGE PREVIEW
// ========================================

function initIndexHover(): void {
  const names = document.querySelectorAll<HTMLElement>('.work-index-name');
  const preview = document.getElementById('work-index-preview') as HTMLElement;
  const previewImg = document.getElementById('work-index-preview-img') as HTMLImageElement;
  const preview2 = document.getElementById('work-index-preview-2') as HTMLElement;
  const previewImg2 = document.getElementById('work-index-preview-img-2') as HTMLImageElement;
  if (!names.length || !preview || !previewImg) return;

  let active = false;

  names.forEach((name) => {
    name.addEventListener('mouseenter', () => {
      const imgPrimary = name.getAttribute('data-img');
      const imgSecondary = name.getAttribute('data-img2');
      if (!imgPrimary) return;
      active = true;

      // Secondary → top-right, Primary → bottom-left (OG positioning)
      if (imgSecondary) {
        previewImg.src = imgSecondary;
      } else {
        previewImg.src = imgPrimary;
      }
      preview.style.display = 'block';
      preview.style.opacity = '0';
      preview.style.transform = 'scale(0.95)';
      requestAnimationFrame(() => {
        preview.style.opacity = '1';
        preview.style.transform = 'scale(1)';
      });

      if (preview2 && previewImg2) {
        previewImg2.src = imgPrimary;
        preview2.style.display = 'block';
        preview2.style.opacity = '0';
        preview2.style.transform = 'scale(0.95)';
        requestAnimationFrame(() => {
          preview2.style.opacity = '1';
          preview2.style.transform = 'scale(1)';
        });
      }
    });

    name.addEventListener('mouseleave', () => {
      active = false;
      preview.style.opacity = '0';
      preview.style.transform = 'scale(0.95)';
      setTimeout(() => { if (!active) preview.style.display = 'none'; }, 300);
      if (preview2) {
        preview2.style.opacity = '0';
        preview2.style.transform = 'scale(0.95)';
        setTimeout(() => { if (!active) preview2.style.display = 'none'; }, 300);
      }
    });
  });
}

// ========================================
// ENTRANCE ANIMATIONS (work page version)
// ========================================

function initWorkEntranceAnimations(): void {
  const logoWrap = document.querySelector('.header-logo-wrap') as HTMLElement;
  if (logoWrap) {
    gsap.from(logoWrap, { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out' });
  }

  const navLinks = document.querySelectorAll<HTMLElement>('.nav-link-wrap');
  if (navLinks.length) {
    gsap.from(navLinks, { y: 30, opacity: 0, duration: 1.2, stagger: 0.15, delay: 0.2, ease: 'power3.out' });
  }

  const contactBtn = document.querySelector('.contact-fixed') as HTMLElement;
  if (contactBtn) {
    gsap.from(contactBtn, { y: 20, opacity: 0, duration: 0.6, delay: 0.5, ease: 'power3.out' });
  }

  // Animate the tabs entrance
  const tabsInner = document.querySelector('.work-page-tabs-inner') as HTMLElement;
  if (tabsInner) {
    gsap.from(tabsInner, { y: 20, opacity: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
  }
}

// ========================================
// INIT
// ========================================

function init(): void {
  console.log('[work-main] init() called');
  try {
  initHamburger();
  initNoiseCanvas();
  initFooterClock();
  initCustomScrollbar();
  initHoverSound();
  initLenis();
  initRibbonTrail();
  initWorkEntranceAnimations();
  initPageTransitions();
  initTabSwitching();
  initIndexHover();
  initGalleryCanvas();
  initTypewriter();
  initEggDrag();
  } catch(e) { console.error('[work-main] init error:', e); }
  console.log('[work-main] init() complete');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
