/**
 * Shared utilities used across multiple pages.
 * Extracted from main.ts to avoid duplication in work-main.ts, work-detail.ts,
 * studio-main.ts, and contact-main.ts.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

// ========================================
// WORK PROJECTS WITH A BUILT DETAIL PAGE
// ========================================
// Only these slugs have a real detail page under en/work/<slug>/. The work grid
// lists all 16 projects, but the rest were never captured from the OG, so their
// clicks are gated (non-navigating) instead of falling back to the homepage.
export const WORK_DETAIL_SLUGS = new Set<string>([
  'leetonpet',
  'leafbiotech',
  'decentralgpt',
  'zaowujun',
]);

export function hasWorkDetail(slug: string | null | undefined): boolean {
  return !!slug && WORK_DETAIL_SLUGS.has(slug);
}

// ========================================
// NOISE OVERLAY CANVAS
// ========================================

export function initNoiseCanvas(): void {
  const canvas = document.getElementById('noise-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const patternSize = 250;
  const patternAlpha = 15;

  // Create an offscreen canvas for the noise pattern
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = patternSize;
  patternCanvas.height = patternSize;
  const patternCtx = patternCanvas.getContext('2d');
  if (!patternCtx) return;

  function generateNoise(): void {
    if (!patternCtx || !ctx) return;

    const imageData = patternCtx.createImageData(patternSize, patternSize);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = patternAlpha; // A
    }

    patternCtx.putImageData(imageData, 0, 0);

    // Tile the pattern across the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Generate initial noise
  generateNoise();

  // Refresh the noise pattern periodically (every 2 frames for subtle animation)
  let frameCount = 0;
  function loop(): void {
    frameCount++;
    if (frameCount % 2 === 0) {
      generateNoise();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ========================================
// HAMBURGER TOGGLE
// ========================================

// ========================================
// SPLINE DRAGON BACKGROUND (global — loads on every page so the dragon is the
// site-wide background AND powers the mobile-menu dragon frame). The homepage
// additionally drives a scroll-based rotation (see main.ts initDragonScrollRotation).
// ========================================

export function initSplineBackground(): void {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  // Idempotent: never inject the Spline runtime twice for the same canvas (the
  // homepage loads it eagerly via main.ts; inner pages lazy-load it on menu open).
  if (canvas.dataset.splineInit) return;
  canvas.dataset.splineInit = '1';

  // Load Spline scene — expose dragon on window for the scroll handler / menu spin.
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import { Application } from '/spline-runtime.js';
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
      const spline = new Application(canvas);
      spline.load('/models/scene.splinecode').then(() => {
        const DRAGON_ID = '2a44450f-a2e5-418b-aa37-f8718c39bb3c';
        let dragon = null;
        try { dragon = spline.findObjectById(DRAGON_ID); } catch(e) {}
        if (!dragon) { try { dragon = spline.findObjectByName('long'); } catch(e) {} }
        if (!dragon) {
          try { dragon = spline.findObjectByName(DRAGON_ID) || spline.findObjectByName('model'); } catch(e) {}
        }
        if (!dragon) {
          try {
            const objs = spline.getAllObjects();
            if (objs && objs.length > 0) {
              dragon = objs.find(o => o && o.name === 'long')
                || objs.find(o => o && o.position && o.rotation && o.name !== 'Spot Light' && o.name !== 'Directional Light' && o.name !== 'Camera')
                || null;
            }
          } catch(e) {}
        }
        if (dragon) {
          window.__splineDragon = dragon;
          window.dispatchEvent(new Event('spline-dragon-ready'));
        }
      }).catch(() => {
        canvas.dispatchEvent(new Event('spline-error'));
      });
    }
  `;
  canvas.addEventListener('spline-error', () => initFallbackBackground(canvas));
  document.head.appendChild(script);
}

function initFallbackBackground(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resize(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let time = 0;
  function draw(): void {
    if (!ctx) return;
    time += 0.003;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const cx1 = w * (0.3 + 0.1 * Math.sin(time * 0.7));
    const cy1 = h * (0.4 + 0.1 * Math.cos(time * 0.5));
    const grad1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.min(w, h) * 0.6);
    grad1.addColorStop(0, 'rgba(30, 10, 10, 0.5)');
    grad1.addColorStop(0.5, 'rgba(15, 5, 15, 0.3)');
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

export function initHamburger(): void {
  const btn = document.getElementById('hamburger-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  let isOpen = false;

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    btn.setAttribute('aria-expanded', String(isOpen));

    if (isOpen) {
      menu.classList.add('open');
      document.body.classList.add('mobile-menu-open');
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if ((window as any).lenis && typeof (window as any).lenis.stop === 'function') {
        (window as any).lenis.stop();
      }
      // Lazy-load the dragon on first menu open (inner pages don't load Spline on
      // page load — perf). Then spin it one full turn into the framed menu pose,
      // either now (already loaded) or once it becomes ready.
      initSplineBackground();
      const spin = (d: any) => {
        if (!d || !d.rotation) return;
        gsap.killTweensOf(d.rotation);
        const restY = d.rotation.y;
        gsap.fromTo(d.rotation, { y: restY - Math.PI * 2 }, { y: restY, duration: 1.2, ease: 'power3.out' });
      };
      const existing = (window as any).__splineDragon;
      if (existing && existing.rotation) {
        spin(existing);
      } else {
        const onReady = () => {
          window.removeEventListener('spline-dragon-ready', onReady);
          if (isOpen) spin((window as any).__splineDragon);
        };
        window.addEventListener('spline-dragon-ready', onReady);
      }
    } else {
      menu.classList.remove('open');
      document.body.classList.remove('mobile-menu-open');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if ((window as any).lenis && typeof (window as any).lenis.start === 'function') {
        (window as any).lenis.start();
      }
    }
  });

  // Close menu on link click
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
      document.body.classList.remove('mobile-menu-open');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if ((window as any).lenis && typeof (window as any).lenis.start === 'function') {
        (window as any).lenis.start();
      }
    });
  });
}

// ========================================
// FOOTER CLOCK
// ========================================

export function initFooterClock(): void {
  const clockEl = document.getElementById('footer-clock');
  if (!clockEl) return;

  function updateClock(): void {
    if (!clockEl) return;

    // China Standard Time (UTC+8)
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const cst = new Date(utc + 8 * 3600000);

    let hours = cst.getHours();
    const minutes = cst.getMinutes();
    const seconds = cst.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) hours = 12;

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    clockEl.textContent = timeStr;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// ========================================
// CUSTOM SCROLLBAR
// ========================================

export function initCustomScrollbar(): void {
  const thumb = document.getElementById('scrollbar-thumb');
  if (!thumb) return;

  function updateThumb() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
    const trackHeight = window.innerHeight;
    const thumbHeight = Math.max(30, (window.innerHeight / document.documentElement.scrollHeight) * trackHeight);
    const maxTop = trackHeight - thumbHeight;

    thumb!.style.height = thumbHeight + 'px';
    thumb!.style.transform = `translateY(${scrollProgress * maxTop}px)`;
  }

  window.addEventListener('scroll', updateThumb, { passive: true });
  window.addEventListener('resize', updateThumb);
  updateThumb();

  // Draggable thumb
  let isDragging = false;
  let startY = 0;
  let startScroll = 0;

  thumb.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startScroll = window.scrollY;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const trackHeight = window.innerHeight;
    const scrollDelta = (deltaY / trackHeight) * scrollHeight;
    const targetScroll = startScroll + scrollDelta;
    // Use Lenis if available, otherwise native scroll
    const lenis = (window as unknown as Record<string, unknown>).lenis as { scrollTo?: (target: number, opts?: Record<string, unknown>) => void } | undefined;
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(targetScroll, { immediate: true });
    } else {
      window.scrollTo(0, targetScroll);
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// ========================================
// HOVER CLICK SOUND
// ========================================

export function initHoverSound(): void {
  const hoverAudio = new Audio('/hover.mp3');
  const clickAudio = new Audio('/click.mp3');
  hoverAudio.preload = 'auto';
  clickAudio.preload = 'auto';
  hoverAudio.volume = 0.85;
  clickAudio.volume = 0.9;

  let audioUnlocked = false;

  function playHover(): void {
    if (!audioUnlocked) return;
    try {
      hoverAudio.currentTime = 0;
      hoverAudio.play().catch(() => {});
    } catch (_e) { /* ignore */ }
  }

  function playClick(): void {
    if (!audioUnlocked) return;
    try {
      clickAudio.currentTime = 0;
      clickAudio.play().catch(() => {});
    } catch (_e) { /* ignore */ }
  }

  // Unlock audio on first user interaction
  const unlock = () => {
    audioUnlocked = true;
    try {
      hoverAudio.currentTime = 0;
      hoverAudio.play().then(() => {
        hoverAudio.pause();
        hoverAudio.currentTime = 0;
      }).catch(() => {});
    } catch (_e) { /* ignore */ }
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('pointermove', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('pointermove', unlock);

  // Hover sound on interactive elements (matching OG behavior)
  document.addEventListener('pointerover', (e) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Skip elements with data-no-sound or data-no-hover-sound
    if (target.getAttribute('data-no-sound') === 'true' ||
        target.getAttribute('data-no-hover-sound') === 'true' ||
        target.classList.contains('no-hover-sound')) return;

    // Play on links, buttons, work titles, client names
    if (target.closest('a') || target.closest('button') ||
        target.closest('.work-title') || target.closest('.client-name') ||
        target.closest('.work-index-item') ||
        target.closest('.nav-link') || target.closest('.contact-btn')) {
      playHover();
    }
  });

  // Click sound on clicks
  document.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target?.closest('a') || target?.closest('button')) {
      playClick();
    }
  });
}

// ========================================
// LENIS SMOOTH SCROLL
// ========================================

export function initLenis(): Lenis {
  const lenis = new Lenis({
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1,
    wheelMultiplier: 1,
    autoResize: true,
  });

  // Connect Lenis to GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Hook Lenis into GSAP's ticker (requestAnimationFrame)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000); // Lenis expects ms, GSAP ticker provides seconds
  });

  // Disable GSAP's built-in lag smoothing so Lenis stays in control
  gsap.ticker.lagSmoothing(0);

  // Expose on window for custom scrollbar integration
  (window as unknown as Record<string, unknown>).lenis = lenis;

  return lenis;
}

// ========================================
// RIBBON CURSOR TRAIL (OG exact: module 5647)
// ========================================

export function initRibbonTrail(): void {
  const container = document.querySelector('.ribbons-container') as HTMLElement;
  const canvas = document.getElementById('ribbons-canvas') as HTMLCanvasElement;
  if (!container || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  let w = container.clientWidth;
  let h = container.clientHeight;

  function resize(): void {
    w = container.clientWidth;
    h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx!.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const color = '#C51110';
  const thickness = 1.4;
  const pointCount = 6;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < pointCount; i++) points.push({ x: w / 2, y: h / 2 });

  let opacity = 0;
  const cursor = { x: w / 2, y: h / 2 };
  let lastMove = performance.now();
  let active = false;

  function onMove(e: MouseEvent | TouchEvent): void {
    const rect = container.getBoundingClientRect();
    if ('touches' in e && e.touches.length) {
      cursor.x = e.touches[0].clientX - rect.left;
      cursor.y = e.touches[0].clientY - rect.top;
    } else if (e instanceof MouseEvent) {
      cursor.x = e.clientX - rect.left;
      cursor.y = e.clientY - rect.top;
    }
    lastMove = performance.now();
    active = true;
  }
  function onLeave(): void { active = false; }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchstart', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  container.addEventListener('mouseleave', onLeave);

  let lastTime = performance.now();
  function draw(): void {
    requestAnimationFrame(draw);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 16.67, 2);
    lastTime = now;

    const idle = !active || now - lastMove > 500;
    if (idle) { opacity = Math.max(0, opacity - 0.02 * dt); }
    else { opacity = Math.min(1, opacity + 0.05 * dt); }

    if (opacity <= 0) { ctx!.clearRect(0, 0, w, h); return; }

    points[0].x += (cursor.x - points[0].x) * 0.6;
    points[0].y += (cursor.y - points[0].y) * 0.6;
    for (let i = 1; i < points.length; i++) {
      points[i].x += (points[i - 1].x - points[i].x) * 0.35;
      points[i].y += (points[i - 1].y - points[i].y) * 0.35;
    }

    ctx!.clearRect(0, 0, w, h);
    ctx!.save();
    ctx!.globalAlpha = opacity;
    ctx!.strokeStyle = color;
    ctx!.lineWidth = thickness;
    ctx!.lineCap = 'round';
    ctx!.lineJoin = 'round';
    ctx!.beginPath();
    if (points.length > 1) {
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mx = (points[i].x + points[i + 1].x) / 2;
        const my = (points[i].y + points[i + 1].y) / 2;
        ctx!.quadraticCurveTo(points[i].x, points[i].y, mx, my);
      }
      ctx!.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    ctx!.stroke();
    ctx!.restore();
  }
  requestAnimationFrame(draw);
}

// ========================================
// HEADER LOGO SCROLL SHRINK (OG exact)
// ========================================

export function initHeaderLogoShrink(): void {
  const logo = document.querySelector('.header-logo') as HTMLElement;
  if (!logo) return;

  const threshold = 0.8 * window.innerHeight;
  let isLarge = true;

  function check(): void {
    const scrollY = window.lenis ? (window as any).lenis.scroll : window.scrollY;
    if (scrollY >= threshold && isLarge) {
      isLarge = false;
      logo.style.width = '';
      logo.style.maxWidth = '';
    } else if (scrollY < threshold && !isLarge) {
      isLarge = true;
      if (window.innerWidth >= 768) {
        logo.style.width = '30vw';
        logo.style.maxWidth = '480px';
      }
    }
  }

  if (window.innerWidth >= 768) {
    logo.style.width = '30vw';
    logo.style.maxWidth = '480px';
  }

  window.addEventListener('scroll', check, { passive: true });
  check();
}

// ========================================
// ENTRANCE ANIMATIONS (OG: ScrollFloat on header/footer)
// ========================================

export function initEntranceAnimations(): void {
  // Header logo entrance
  const logoWrap = document.querySelector('.header-logo-wrap') as HTMLElement;
  if (logoWrap) {
    gsap.from(logoWrap, { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out' });
  }

  // Nav links entrance with stagger
  const navLinks = document.querySelectorAll<HTMLElement>('.nav-link-wrap');
  if (navLinks.length) {
    gsap.from(navLinks, { y: 30, opacity: 0, duration: 1.2, stagger: 0.15, delay: 0.2, ease: 'power3.out' });
  }

  // Footer entrance on load (it is position:fixed, so a scrollTrigger can't trigger it
  // reliably and it would stay hidden until a scroll recalculation). Animate in on load.
  const footer = document.getElementById('site-footer');
  if (footer) {
    gsap.from(footer, { y: 40, opacity: 0, duration: 0.8, delay: 0.6, ease: 'power3.out' });
  }

  // Contact button entrance
  const contactBtn = document.querySelector('.contact-fixed') as HTMLElement;
  if (contactBtn) {
    gsap.from(contactBtn, { y: 20, opacity: 0, duration: 0.6, delay: 0.5, ease: 'power3.out' });
  }
}

// ========================================
// PAGE TRANSITIONS (OG: red solid + logo overlay)
// ========================================

// sessionStorage flag set during the leave (cover) phase so the next page knows
// to play the enter (reveal) phase. Mirrors the OG single-page enter/leave split.
const TRANSITION_FLAG = 'lml-transition';

// LML wordmark (matches the OG transition overlay SVG exactly).
const LML_LOGO_SVG = `<div class="page-transition-logo-mark" aria-label="lml" role="img">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 467 179" fill="currentColor">
    <path d="M347.168 0H376.918V153.5H466.168V178.75H347.168V0Z" fill="currentColor"/>
    <path d="M139.404 178.75V0H177.904L227.904 137.5H228.404L278.154 0H316.654V178.75H287.654V43.25H287.154L239.904 178.75H216.154L168.904 43.25H168.404V178.75H139.404Z" fill="currentColor"/>
    <path d="M0 0H29.75V153.5H119V178.75H0V0Z" fill="currentColor"/>
  </svg>
</div>`;

// Strip a leading /zh or /en locale segment so a language switch on the same
// page is treated as the same path (OG skips the transition in that case).
function stripLocale(path: string): string {
  return path.replace(/^\/(zh|en)(?=\/|$)/, '') || '/';
}

export function initPageTransitions(): void {
  const solid = document.querySelector('.page-transition-solid') as HTMLElement;
  const logo = document.querySelector('.page-transition-logo') as HTMLElement;
  if (!solid || !logo) return;

  // Ensure the black overlay carries the white LML wordmark.
  if (!logo.querySelector('svg')) logo.innerHTML = LML_LOGO_SVG;

  // ---- ENTER (reveal): runs on load when we arrived via an internal nav ----
  // The .lml-transitioning class on <html> (set by an inline <head> script) keeps
  // both overlays covering the viewport before first paint, so there is no flash
  // of page content. We then slide them off the top: black+LML first, red after —
  // which is what shows the red background "again" right before the page appears.
  let arrivedViaTransition = false;
  try { arrivedViaTransition = sessionStorage.getItem(TRANSITION_FLAG) === '1'; } catch { /* ignore */ }

  if (arrivedViaTransition) {
    try { sessionStorage.removeItem(TRANSITION_FLAG); } catch { /* ignore */ }
    gsap.set([solid, logo], { y: 0 }); // both covering
    gsap.timeline({
      onComplete: () => document.documentElement.classList.remove('lml-transitioning'),
    })
      .to(logo, { y: '-100%', duration: 0.5, ease: 'circ.inOut' })
      .to(solid, { y: '-100%', duration: 0.5, ease: 'circ.inOut' }, '<50%');
  } else {
    document.documentElement.classList.remove('lml-transitioning');
  }

  // ---- LEAVE (cover): runs on click, then navigates ----
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) return;

    link.addEventListener('click', (e) => {
      // Same destination (ignoring locale) → no transition, let the browser handle it.
      const target = new URL(href, window.location.href);
      if (stripLocale(target.pathname) === stripLocale(window.location.pathname)) return;

      e.preventDefault();
      try { sessionStorage.setItem(TRANSITION_FLAG, '1'); } catch { /* ignore */ }

      gsap.timeline({ onComplete: () => { window.location.href = href; } })
        .fromTo(solid, { y: '100%' }, { y: 0, duration: 0.5, ease: 'circ.inOut' })
        .fromTo(logo, { y: '100%' }, { y: 0, duration: 0.5, ease: 'circ.inOut' }, '<50%');
    });
  });
}
