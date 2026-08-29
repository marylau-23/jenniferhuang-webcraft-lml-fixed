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
  initHoverSound,
} from './shared';
import { initGalleryCanvas, initEggDrag } from './gallery';
import { initFallingText } from './falling-text';
import { initWorkCanvas } from './work-canvas';

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
// SPLIT TEXT INTO CHARS (for scroll-float)
// ========================================

function splitTextIntoChars(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent || '';
  el.textContent = '';
  const chars: HTMLSpanElement[] = [];

  // Spread iterates by code point, so emoji (surrogate pairs like 🤘 🔖) stay intact.
  const characters = [...text];

  // OG: about text indents its first word via a margin-left:35vw wrapper on desktop.
  // First word ends at the first space OR non-breaking space (text uses &nbsp;).
  const isAboutText = el.classList.contains('studio-about-text');
  let startIndex = 0;
  if (isAboutText && window.innerWidth >= 768) {
    let wordEnd = characters.findIndex((c) => c === ' ' || c.charCodeAt(0) === 0x00a0);
    if (wordEnd === -1) wordEnd = characters.length;
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-block';
    wrapper.style.whiteSpace = 'nowrap';
    wrapper.style.marginLeft = '35vw';
    for (let j = 0; j < wordEnd; j++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.display = 'inline-block';
      const cj = characters[j];
      if (cj === ' ' || cj.charCodeAt(0) === 0x00a0) span.innerHTML = '&nbsp;';
      else span.textContent = cj;
      wrapper.appendChild(span);
      chars.push(span);
    }
    el.appendChild(wrapper);
    startIndex = wordEnd;
  }

  for (let i = startIndex; i < characters.length; i++) {
    const char = characters[i];
    if (char === '\n') {
      el.appendChild(document.createElement('br'));
      continue;
    }

    const span = document.createElement('span');
    span.className = 'char';
    span.style.display = 'inline-block';

    if (char === ' ' || char === ' ') {
      span.innerHTML = '&nbsp;';
    } else {
      span.textContent = char;
    }

    el.appendChild(span);
    chars.push(span);
  }

  return chars;
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
// TYPEWRITER
// ========================================

function initTypewriter() {
  const content = document.getElementById('typewriter-content');
  if (!content) return;

  // OG typewriter phrases (same set across all pages)
  const phrases = [
    'Code belongs to the language of design',
    'Walk your own path—let them talk',
    'Fear not the future. Dwell not on the past',
    'Do not fear change',
    'Mindset shapes how you see the world',
    'I want to make some noise in the universe',
    'No proper seat, no sitting',
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let timeout: number;

  function type() {
    const current = phrases[phraseIndex];

    if (isDeleting) {
      content!.textContent = current.substring(0, charIndex - 1);
      charIndex--;
    } else {
      content!.textContent = current.substring(0, charIndex + 1);
      charIndex++;
    }

    let delay = isDeleting ? 30 : 60;

    if (!isDeleting && charIndex === current.length) {
      delay = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 500;
    }

    timeout = window.setTimeout(type, delay);
  }

  type();

  return () => clearTimeout(timeout);
}

// ========================================
// STUDIO HERO — MAGNETIC 3D TILT (OG magnet-wrapper)
// ========================================

function initStudioHeroMagnet() {
  // OG Magnet (component chunk 4986) as instantiated on the studio page
  // (page-27963e146e1085f3): the studio overrides the component defaults with
  // padding 160, magnetStrength 60, maxTiltAngle 2, is3d=true.
  // translate = -d/strength, so the larger strength keeps the portrait movement
  // subtle; maxTilt 2° keeps the parallax gentle (the defaults of 2 / 15 felt
  // ~30× / ~7.5× too sensitive).
  // While active: transition 'none' (instant follow). On leave: 'transform 0.5s ease-in-out'.
  const box = document.querySelector('.studio-hero-image') as HTMLElement;
  const inner = document.querySelector('.studio-hero-image-inner') as HTMLElement;
  if (!box || !inner) return;

  const padding = 160;
  const strength = 60;
  const maxTilt = 2;
  const inactiveTransition = 'transform 0.5s ease-in-out';

  let bounds: { centerX: number; centerY: number; width: number; height: number } | null = null;
  let active = false;
  let raf: number | null = null;
  let lastTs = 0;

  function measure() {
    const r = box.getBoundingClientRect();
    bounds = {
      centerX: r.left + r.width / 2,
      centerY: r.top + r.height / 2,
      width: r.width,
      height: r.height,
    };
  }
  measure();
  // Portrait moves via scroll parallax, so bounds must be re-measured on scroll/resize.
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('scroll', measure, { passive: true });

  window.addEventListener(
    'mousemove',
    (e: MouseEvent) => {
      if (!bounds) return;
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const ts = performance.now();
        if (active && ts - lastTs < 16) return; // OG ~16ms throttle while active
        lastTs = ts;
        const b = bounds!;
        const dx = e.clientX - b.centerX;
        const dy = e.clientY - b.centerY;
        if (Math.abs(dx) < b.width / 2 + padding && Math.abs(dy) < b.height / 2 + padding) {
          const mx = -dx / strength;
          const my = -dy / strength;
          const rotY = (dx / (b.width / 2)) * maxTilt;
          const rotX = -(dy / (b.height / 2)) * maxTilt;
          active = true;
          inner.style.transition = 'none';
          inner.style.transform = `translate3d(${mx}px, ${my}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        } else if (active) {
          active = false;
          inner.style.transition = inactiveTransition;
          inner.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
        }
      });
    },
    { passive: true }
  );
}

// ========================================
// STUDIO HERO — WebGL liquid-displacement hover (same pipeline as the projects section)
// ========================================

function initPortraitGL() {
  const inner = document.querySelector('.studio-hero-image-inner') as HTMLElement;
  const glAnchor = inner?.querySelector('.studio-portrait-gl') as HTMLElement;
  const img = inner?.querySelector('img') as HTMLImageElement;
  if (!inner || !glAnchor) return;

  // Reuse the proven work-canvas renderer: cursor-driven displacement + RGB shift,
  // scoped to the portrait container (anchorEl). Returns null on mobile / no WebGL2.
  const cleanup = initWorkCanvas({
    anchorEl: inner,
    selector: '.studio-portrait-gl',
    titleSelector: '', // no title → cursor maps to the element's own bounds
    zIndex: '9',
    // OG portrait GL renders a flat quad (no keystone perspective) — the tilt comes only
    // from the magnet, which the canvas already inherits via the inner element's transform.
    // Keystone here would double the tilt and feel too aggressive.
    maxTiltAngle: 0,
    // OG portrait uses default fluid params: strength 0.18, rgbShift 1.2 (work-canvas defaults).
    entranceDistance: 0,
    entranceDelay: 0,
  });

  // When the GL canvas is active it renders the portrait on top — hide the base <img>
  // to avoid a double image. If WebGL is unavailable, keep the <img> as fallback.
  if (cleanup && img) img.style.opacity = '0';
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
  initHoverSound();

  // Init page-specific components
  initScrollbar(lenis);
  initTypewriter();
  initPageTransitions();
  initStudioHeroMagnet();
  initPortraitGL();
  initGalleryCanvas();
  initEggDrag();

  // ---- Animate hero title ----
  const titleContainer = document.querySelector('.studio-title') as HTMLElement;
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

  // ---- Animate subtitle ----
  const subtitle = document.querySelector('.studio-subtitle') as HTMLElement;
  if (subtitle) {
    gsap.from(subtitle, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
      delay: 0.6,
    });
  }

  // ---- Profile photo parallax (OG exact, studio page chunk page-27963e146e1085f3) ----
  // The portrait (e) drifts down until its document-center aligns with the tagline
  // block's (t) document-center. scrub 0.6 desktop / 0.9 mobile (smooth lag).
  const portraitWrap = document.querySelector('.studio-hero-image-wrap') as HTMLElement;
  const taglineWrap = document.querySelector('.studio-tagline-wrap') as HTMLElement;
  if (portraitWrap && taglineWrap) {
    const absTop = (el: HTMLElement): number => {
      let top = 0;
      let node: HTMLElement | null = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return top;
    };
    const isMobile = window.innerWidth <= 768;
    const scrubVal = isMobile ? 0.9 : 0.6;

    gsap.set(portraitWrap, { y: 0 });
    gsap.fromTo(
      portraitWrap,
      { y: 0 },
      {
        y: () => {
          const eCenter = absTop(portraitWrap) + portraitWrap.offsetHeight / 2;
          return absTop(taglineWrap) + taglineWrap.offsetHeight / 2 - eCenter;
        },
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: portraitWrap,
          start: () => 'top top',
          end: () =>
            `${absTop(taglineWrap) + taglineWrap.offsetHeight / 2 - window.innerHeight / 2}px center`,
          scrub: scrubVal,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  // ---- Scroll-float char reveal (matches homepage initScrollFloatText / OG ScrollFloat) ----
  function scrollFloatReveal(el: HTMLElement | null, trigger: string, stagger: number) {
    if (!el) return;
    const chars = splitTextIntoChars(el);
    if (chars.length === 0) return;
    gsap.fromTo(
      chars,
      { opacity: 0, yPercent: 60, scaleY: 1.2 },
      {
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        stagger,
        ease: 'back.inOut(2)',
        scrollTrigger: {
          trigger,
          start: 'center bottom+=50%',
          end: 'bottom bottom-=40%',
          scrub: true,
        },
      }
    );
  }

  scrollFloatReveal(document.querySelector('.studio-about-text'), '.studio-about-wrap', 0.03);
  scrollFloatReveal(document.querySelector('.studio-tagline'), '.studio-tagline-wrap', 0.02);

  // ---- Animate section heading (Honner & Awards) ----
  const sectionHeadings = document.querySelectorAll('.studio-section-heading');
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

  // ---- Animate awards list ----
  const awardItems = document.querySelectorAll('.studio-award-item');
  gsap.from(awardItems, {
    y: 20,
    opacity: 0,
    duration: 0.4,
    stagger: 0.05,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.studio-awards-list',
      start: 'top 85%',
    },
  });

  // ---- Skills: physics falling text (OG matter-js) ----
  const fallingContainer = document.querySelector('.falling-text-container') as HTMLElement;
  if (fallingContainer) {
    initFallingText(fallingContainer, { trigger: 'click', gravity: 1, mouseConstraintStiffness: 0.2 });
  }

  // ---- Bio text: scroll-scrubbed reveal (OG: opacity + translateY tied to scroll) ----
  const bioText = document.querySelector('.studio-bio-text') as HTMLElement;
  if (bioText) {
    gsap.fromTo(
      bioText,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: bioText,
          start: 'top bottom',
          end: 'bottom center',
          scrub: true,
        },
      }
    );
  }
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
