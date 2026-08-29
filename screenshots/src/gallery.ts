/**
 * Gallery section module — metallic paint shader for 亮, typewriter, egg drag.
 * Extracted from main.ts (homepage only).
 */

import { initMetallicPaint, loadSvgAsImageData } from './metallic-paint';

// ========================================
// GALLERY CANVAS (metallic chrome shader for 亮)
// ========================================

export function initGalleryCanvas(): void {
  const canvas = document.getElementById('gallery-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  // OG renders logo3.svg with metallic chrome WebGL shader (the 亮 character)
  loadSvgAsImageData('/logo3.svg').then((imageData) => {
    if (!imageData) return;
    initMetallicPaint(canvas, imageData, {
      edge: 0,
      patternBlur: 0.005,
      patternScale: 2,
      refraction: 0.015,
      speed: 0.3,
      liquid: 0.07,
    });
  });
}

// ========================================
// TYPEWRITER EFFECT (Section 8)
// ========================================

export function initTypewriter(): void {
  const contentEl = document.getElementById('typewriter-content');
  if (!contentEl) return;

  const quotes = [
    'Code belongs to the language of design',
    'Walk your own path—let them talk',
    'Fear not the future. Dwell not on the past',
    'Do not fear change',
    'Mindset shapes how you see the world',
    'I want to make some noise in the universe',
    'No proper seat, no sitting',
  ];

  let quoteIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 60;

  function type(): void {
    if (!contentEl) return;

    const currentQuote = quotes[quoteIndex];

    if (!isDeleting) {
      // Typing
      contentEl.textContent = currentQuote.substring(0, charIndex + 1);
      charIndex++;

      if (charIndex === currentQuote.length) {
        // Pause at end, then start deleting
        isDeleting = true;
        typeSpeed = 2000; // pause before deleting
      } else {
        typeSpeed = 50 + Math.random() * 50;
      }
    } else {
      // Deleting
      contentEl.textContent = currentQuote.substring(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        isDeleting = false;
        quoteIndex = (quoteIndex + 1) % quotes.length;
        typeSpeed = 500; // pause before next quote
      } else {
        typeSpeed = 30;
      }
    }

    setTimeout(type, typeSpeed);
  }

  // Start typing
  setTimeout(type, 1000);
}

// ========================================
// EASTER EGG DRAG INTERACTION
// ========================================

export function initEggDrag(): void {
  const eggs = document.querySelectorAll<HTMLElement>('.egg-item');
  const container = document.querySelector<HTMLElement>('.gallery-eggs-overlay');
  if (!eggs.length || !container) return;

  // State per egg
  interface EggState {
    x: number;
    y: number;
    zIndex: number;
  }

  const eggStates = new Map<string, EggState>();
  let zIndexCounter = 6006;

  // Drag state
  let activeEgg: HTMLElement | null = null;
  let activeId: string | null = null;
  let offsetX = 0;
  let offsetY = 0;

  // Velocity tracking for inertia
  let lastPointer = { x: 0, y: 0, time: 0 };
  let velocity = { vx: 0, vy: 0 };
  let inertiaRaf: number | null = null;

  // Initialize egg positions (spread across container)
  function initPositions(): void {
    const cw = container!.clientWidth;
    const ch = container!.clientHeight;

    const positions = [
      { x: Math.max(0, cw - 80), y: Math.max(0, ch * 0.18 - 27) },
      { x: Math.max(0, cw - 80), y: Math.max(0, ch * 0.35 - 27) },
      { x: Math.max(0, cw - 80), y: Math.max(0, ch * 0.50 - 27) },
    ];

    eggs.forEach((egg, i) => {
      const id = egg.getAttribute('data-egg-id') || String(i);
      const pos = positions[i] || { x: cw * 0.5, y: ch * 0.5 };
      eggStates.set(id, { x: pos.x, y: pos.y, zIndex: 6005 });
      egg.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      egg.style.zIndex = '6005';
    });
  }

  initPositions();

  // Reposition on resize
  window.addEventListener('resize', () => {
    const cw = container!.clientWidth;
    const ch = container!.clientHeight;
    const maxW = Math.max(0, cw - 54);
    const maxH = Math.max(0, ch - 54);

    eggStates.forEach((state, id) => {
      state.x = Math.min(state.x, maxW);
      state.y = Math.min(state.y, maxH);
      const el = container!.querySelector(`[data-egg-id="${id}"]`) as HTMLElement;
      if (el) {
        el.style.transition = 'transform 1200ms cubic-bezier(0.22, 0.8, 0.2, 1)';
        el.style.transform = `translate(${state.x}px, ${state.y}px)`;
      }
    });
  });

  function onPointerDown(e: PointerEvent): void {
    // Cancel any running inertia
    if (inertiaRaf !== null) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = null;
    }

    const eggEl = (e.target as HTMLElement).closest<HTMLElement>('.egg-item');
    if (!eggEl || !container) return;

    const id = eggEl.getAttribute('data-egg-id');
    if (!id) return;

    const state = eggStates.get(id);
    if (!state) return;

    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    offsetX = pointerX - state.x;
    offsetY = pointerY - state.y;
    activeEgg = eggEl;
    activeId = id;

    // Remove transition for immediate dragging
    eggEl.style.transition = 'none';

    // Bump z-index
    zIndexCounter += 1;
    state.zIndex = zIndexCounter;
    eggEl.style.zIndex = String(zIndexCounter);

    // Init velocity tracking
    lastPointer = { x: e.clientX, y: e.clientY, time: e.timeStamp };
    velocity = { vx: 0, vy: 0 };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!activeEgg || !activeId || !container) return;

    const rect = container.getBoundingClientRect();
    const maxX = Math.max(0, container.clientWidth - 54);
    const maxY = Math.max(0, container.clientHeight - 54);

    const newX = Math.min(Math.max(e.clientX - rect.left - offsetX, 0), maxX);
    const newY = Math.min(Math.max(e.clientY - rect.top - offsetY, 0), maxY);

    activeEgg.style.transform = `translate(${newX}px, ${newY}px)`;

    // Track velocity
    const dt = Math.max(1, e.timeStamp - lastPointer.time);
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    velocity = { vx: (dx / dt) * 16, vy: (dy / dt) * 16 };
    lastPointer = { x: e.clientX, y: e.clientY, time: e.timeStamp };

    // Update state
    const state = eggStates.get(activeId);
    if (state) {
      state.x = newX;
      state.y = newY;
    }
  }

  function onPointerUp(): void {
    if (activeEgg) {
      // Re-enable transition for spring release
      activeEgg.style.transition = 'transform 1200ms cubic-bezier(0.22, 0.8, 0.2, 1)';
    }

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);

    // Apply inertia
    if (activeId && (Math.abs(velocity.vx) > 0.35 || Math.abs(velocity.vy) > 0.35)) {
      applyInertia(activeId, velocity.vx, velocity.vy);
    }

    activeEgg = null;
    activeId = null;
  }

  function applyInertia(id: string, vx: number, vy: number): void {
    const state = eggStates.get(id);
    if (!state || !container) return;

    const maxX = Math.max(0, container.clientWidth - 54);
    const maxY = Math.max(0, container.clientHeight - 54);

    const el = container.querySelector(`[data-egg-id="${id}"]`) as HTMLElement;
    if (el) {
      el.style.transition = 'none';
    }

    const step = (): void => {
      if (Math.abs(vx) < 0.35 && Math.abs(vy) < 0.35) {
        inertiaRaf = null;
        // Final spring settle
        if (el) {
          el.style.transition = 'transform 1200ms cubic-bezier(0.22, 0.8, 0.2, 1)';
        }
        return;
      }

      let newX = state.x + vx;
      let newY = state.y + vy;

      // Bounce off boundaries
      if (newX < 0) { newX = 0; vx = -(0.5 * vx); }
      else if (newX > maxX) { newX = maxX; vx = -(0.5 * vx); }
      if (newY < 0) { newY = 0; vy = -(0.5 * vy); }
      else if (newY > maxY) { newY = maxY; vy = -(0.5 * vy); }

      // Friction
      vx *= 0.92;
      vy *= 0.92;

      state.x = newX;
      state.y = newY;

      if (el) {
        el.style.transform = `translate(${newX}px, ${newY}px)`;
      }

      inertiaRaf = requestAnimationFrame(step);
    };

    inertiaRaf = requestAnimationFrame(step);
  }

  // ---- Egg double-click (OG): egglink → open/navigate; else content → modal ----
  function decodeEntities(s: string): string {
    const map: Record<string, string> = {
      '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"',
      '&#39;': "'", '&#x27;': "'", '&#x2F;': '/', '&#x60;': '`',
      '&#x3D;': '=', '&nbsp;': ' ',
    };
    return String(s).replace(/&[a-zA-Z0-9#]+;/g, (m) => map[m] || m);
  }

  function openEggModal(title: string, contentHtml: string): void {
    // OG content-modal: backdrop (bg-black/80) + card with a macOS-style header bar
    // (#1F2020) holding a red close circle (left) and the centered title, then the body.
    const backdrop = document.createElement('div');
    backdrop.className = 'content-modal';
    backdrop.innerHTML = `
      <div class="content-modal-card">
        <div class="content-modal-header">
          <div class="content-modal-dots">
            <button class="content-modal-close" type="button" aria-label="Close"></button>
          </div>
          <div class="content-modal-titlewrap"><h3 class="content-modal-title">${title}</h3></div>
        </div>
        <div class="content-modal-body">
          <div class="content-modal-text">${decodeEntities(contentHtml)}</div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    const close = (): void => {
      backdrop.classList.remove('visible');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => backdrop.remove(), 300);
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close(); };

    // Backdrop click closes; card click does not
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    const card = backdrop.querySelector('.content-modal-card') as HTMLElement;
    card?.addEventListener('click', (e) => e.stopPropagation());
    backdrop.querySelector('.content-modal-close')?.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  // Attach pointer down + double-click to each egg
  eggs.forEach((egg) => {
    egg.addEventListener('pointerdown', onPointerDown);
    egg.addEventListener('dblclick', () => {
      const egglink = egg.getAttribute('data-egglink');
      const content = egg.getAttribute('data-content');
      if (egglink) {
        if (egglink.startsWith('http')) {
          window.open(egglink, '_blank', 'noreferrer');
        } else {
          window.location.href = egglink;
        }
      } else if (content && content.replace(/<[^>]*>/g, '').trim()) {
        openEggModal(egg.getAttribute('data-egg-title') || '', content);
      }
    });
  });
}
