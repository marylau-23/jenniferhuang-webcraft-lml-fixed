// style.css is loaded render-blocking via <link> in the HTML <head> (prevents dev FOUC).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  initNoiseCanvas,
  initHamburger,
  initFooterClock,
  initRibbonTrail,
  initPageTransitions,
} from './shared';
import { initGalleryCanvas, initTypewriter, initEggDrag } from './gallery';

gsap.registerPlugin(ScrollTrigger);

// ========================================
// SPLIT TEXT INTO WORDS
// ========================================

function splitTextIntoWords(container: HTMLElement): HTMLDivElement[] {
  const parent = container.querySelector('.split-parent') as HTMLElement;
  if (!parent) return [];

  const text = parent.getAttribute('aria-label') || parent.textContent || '';
  const lines = text.split('\n');
  const words: HTMLDivElement[] = [];

  parent.textContent = '';

  lines.forEach((line, lineIndex) => {
    const lineWords = line.split(' ').filter((w) => w.length > 0);
    lineWords.forEach((word, wordIndex) => {
      const wordEl = document.createElement('div');
      wordEl.className = 'split-word';
      wordEl.setAttribute('aria-hidden', 'true');
      wordEl.textContent = word;
      parent.appendChild(wordEl);
      words.push(wordEl);

      if (wordIndex < lineWords.length - 1) {
        parent.appendChild(document.createTextNode(' '));
      }
    });

    if (lineIndex < lines.length - 1) {
      parent.appendChild(document.createElement('br'));
    }
  });

  return words;
}

// ========================================
// SPLIT TEXT INTO LINES
// ========================================

function splitTextIntoLines(container: HTMLElement): HTMLDivElement[] {
  const parent = container.querySelector('.split-parent') as HTMLElement;
  if (!parent) return [];

  const text = parent.getAttribute('aria-label') || parent.textContent || '';
  const lines = text.split('\n');
  const lineEls: HTMLDivElement[] = [];

  parent.textContent = '';

  lines.forEach((line) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'split-line';
    lineEl.setAttribute('aria-hidden', 'true');
    lineEl.style.position = 'relative';
    lineEl.style.display = 'block';
    lineEl.style.textAlign = 'left';
    lineEl.textContent = line;
    parent.appendChild(lineEl);
    lineEls.push(lineEl);
  });

  return lineEls;
}

// ========================================
// SCROLLBAR (Lenis-based)
// ========================================

function initScrollbar(lenis: Lenis) {
  const thumb = document.getElementById('scrollbar-thumb');
  if (!thumb) return;

  function updateScrollbar() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    const progress = lenis.scroll / scrollHeight;
    const trackHeight = window.innerHeight;
    const thumbHeight = Math.max(44, (window.innerHeight / document.documentElement.scrollHeight) * trackHeight);
    const maxTop = trackHeight - thumbHeight;
    thumb!.style.height = `${thumbHeight}px`;
    thumb!.style.transform = `translateY(${progress * maxTop}px)`;
  }

  lenis.on('scroll', updateScrollbar);
  updateScrollbar();
}

// ========================================
// WECHAT QR POPUP
// ========================================

function initWechatPopup() {
  const trigger = document.querySelector('.contact-wechat-trigger');
  const popup = document.querySelector('.contact-wechat-popup') as HTMLElement;
  if (!trigger || !popup) return;

  trigger.addEventListener('mouseenter', () => {
    popup.classList.add('visible');
  });

  trigger.addEventListener('mouseleave', () => {
    popup.classList.remove('visible');
  });

  trigger.addEventListener('click', () => {
    popup.classList.toggle('visible');
  });
}

// ========================================
// CONTACT GALLERY — IMAGE TRAIL (OG exact: contact page chunk page-379a022360a1e895)
// threshold 80px, appearInterval 80ms, fadeOutDuration 0.4s, cacheMousePos lerp 0.1
// ========================================

function initContactGallery() {
  const container = document.querySelector('.content') as HTMLElement | null;
  if (!container) return;
  const imgEls = Array.from(container.querySelectorAll<HTMLElement>('.content__img'));
  if (!imgEls.length) return;

  const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const fadeOutDuration = 0.4;
  const threshold = 80;
  const appearInterval = 80;

  const images = imgEls.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  const total = images.length;
  let imgPosition = 0;
  let zIndexVal = 1;
  let activeCount = 0;
  let isIdle = true;

  let mousePos = { x: 0, y: 0 };
  let lastMousePos = { x: 0, y: 0 };
  let cacheMousePos = { x: 0, y: 0 };
  let lastAppearTime = 0;

  function rel(e: MouseEvent | Touch, r: DOMRect): { x: number; y: number } {
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  container!.addEventListener('mousemove', (e) => {
    mousePos = rel(e, container!.getBoundingClientRect());
  });
  container!.addEventListener('touchmove', (e) => {
    if (e.touches[0]) mousePos = rel(e.touches[0], container!.getBoundingClientRect());
  }, { passive: true });
  container!.addEventListener('mouseenter', (e) => {
    mousePos = rel(e, container!.getBoundingClientRect());
    cacheMousePos = { ...mousePos };
  });

  window.addEventListener('resize', () => {
    images.forEach((im) => { im.rect = im.el.getBoundingClientRect(); });
  });

  function showNextImage(): void {
    zIndexVal++;
    imgPosition = imgPosition < total - 1 ? imgPosition + 1 : 0;
    const img = images[imgPosition];
    const w = img.rect.width || 190;
    const h = img.rect.height || 173;
    gsap.killTweensOf(img.el);
    gsap.timeline({
      onStart: () => { activeCount++; isIdle = false; },
      onComplete: () => { activeCount--; if (activeCount === 0) isIdle = true; },
    })
      .fromTo(img.el,
        { opacity: 1, scale: 1, zIndex: zIndexVal, x: cacheMousePos.x - w / 2, y: cacheMousePos.y - h / 2 },
        { duration: fadeOutDuration, ease: 'power1', x: mousePos.x - w / 2, y: mousePos.y - h / 2 },
        0)
      .to(img.el, { duration: fadeOutDuration, ease: 'power3', opacity: 0, scale: 0.2 }, 0.4);
  }

  function render(): void {
    const moved = dist(mousePos, lastMousePos);
    const now = Date.now();
    cacheMousePos.x = lerp(cacheMousePos.x, mousePos.x, 0.1);
    cacheMousePos.y = lerp(cacheMousePos.y, mousePos.y, 0.1);
    if (moved > threshold && now - lastAppearTime > appearInterval) {
      showNextImage();
      lastMousePos = { ...mousePos };
      lastAppearTime = now;
    }
    if (isIdle && zIndexVal !== 1) zIndexVal = 1;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// ========================================
// MAIN INITIALIZATION
// ========================================

function init() {
  // Smooth scrolling
  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  function raf(time: number) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Connect Lenis to GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Init shared components
  initNoiseCanvas();
  initFooterClock();
  initHamburger();
  initRibbonTrail();

  // Init page-specific components
  initScrollbar(lenis);
  initWechatPopup();
  initContactGallery();
  initPageTransitions();

  // Creative gallery (亮 metallic paint, typewriter, draggable + double-clickable eggs)
  initGalleryCanvas();
  initTypewriter();
  initEggDrag();

  // ---- Animate hero title (split chars) ----
  const titleContainer = document.querySelector('.contact-title') as HTMLElement;
  if (titleContainer) {
    const parent = titleContainer.querySelector('.split-parent') as HTMLElement;
    if (parent) {
      const text = parent.getAttribute('aria-label') || parent.textContent || '';
      parent.textContent = '';
      const chars: HTMLDivElement[] = [];
      for (const char of text) {
        const el = document.createElement('div');
        el.className = 'split-char';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = char;
        el.style.position = 'relative';
        el.style.display = 'inline-block';
        parent.appendChild(el);
        chars.push(el);
      }
      gsap.from(chars, {
        y: 80,
        opacity: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: 'power3.out',
        delay: 0.2,
      });
    }
  }

  // ---- Animate tagline (split lines) ----
  const tagline = document.querySelector('.contact-tagline') as HTMLElement;
  if (tagline) {
    const lines = splitTextIntoLines(tagline);
    gsap.from(lines, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: tagline,
        start: 'top 85%',
      },
    });
  }

  // ---- Animate "Social Info" heading ----
  const sectionHeadings = document.querySelectorAll('.contact-section-heading');
  sectionHeadings.forEach((heading) => {
    const words = splitTextIntoWords(heading as HTMLElement);
    gsap.from(words, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
      },
    });
  });

  // ---- Animate contact details ----
  const details = document.querySelector('.contact-details') as HTMLElement;
  if (details) {
    gsap.from(details, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: details,
        start: 'top 90%',
      },
    });
  }

  // ---- Animate social links ----
  const socialLinks = document.querySelectorAll('.contact-social-icon');
  gsap.from(socialLinks, {
    y: 20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.contact-social-links',
      start: 'top 90%',
    },
  });

  // ---- Animate action links ----
  const actionLinks = document.querySelectorAll('.contact-action-link');
  gsap.from(actionLinks, {
    y: 20,
    opacity: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.contact-action-links',
      start: 'top 90%',
    },
  });
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
