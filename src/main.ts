// style.css is loaded render-blocking via <link> in the HTML <head> (prevents dev FOUC).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initAsciiLoadingScreen } from './ascii-loading';
import {
  initNoiseCanvas,
  initHamburger,
  initFooterClock,
  initCustomScrollbar,
  initHoverSound,
  initLenis,
  initRibbonTrail,
  initHeaderLogoShrink,
  initEntranceAnimations,
  initPageTransitions,
} from './shared';
import { initGalleryCanvas, initTypewriter, initEggDrag } from './gallery';
import { initWorkHorizontalScroll } from './project-showcase';

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

  // Clear container but keep aria-label for accessibility
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

      // Add space between words (not after last word in line)
      if (wordIndex < lineWords.length - 1) {
        parent.appendChild(document.createTextNode(' '));
      }
    });

    // Add line break between lines (not after last line)
    if (lineIndex < lines.length - 1) {
      parent.appendChild(document.createElement('br'));
    }
  });

  return words;
}

// ========================================
// GSAP WORD ANIMATION
// ========================================

function animateWords(words: HTMLDivElement[], delay = 0): void {
  gsap.set(words, {
    opacity: 0,
    y: 20,
  });

  gsap.to(words, {
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.05,
    ease: 'power2.out',
    delay,
  });
}

// ========================================
// SPLIT TEXT INTO CHARACTERS (for scroll-driven reveal)
// ========================================

function splitTextIntoChars(element: HTMLElement): HTMLSpanElement[] {
  const text = element.textContent || '';
  element.textContent = '';
  const chars: HTMLSpanElement[] = [];

  const characters = [...text];
  for (const char of characters) {
    const span = document.createElement('span');
    span.className = 'char';
    span.style.display = 'inline-block';

    if (char === ' ' || char === ' ') {
      span.innerHTML = '&nbsp;';
    } else if (char === '\n') {
      element.appendChild(document.createElement('br'));
      continue;
    } else {
      span.textContent = char;
    }

    element.appendChild(span);
    chars.push(span);
  }

  return chars;
}

// ========================================
// SCROLL-DRIVEN CHARACTER REVEAL (About Section)
// ========================================

function initAboutScrollReveal(): void {
  const aboutText = document.getElementById('about-text');
  if (!aboutText) return;

  const chars = splitTextIntoChars(aboutText);
  if (chars.length === 0) return;

  gsap.fromTo(
    chars,
    {
      opacity: 0,
      yPercent: 60,
      scaleY: 1.2,
    },
    {
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      stagger: 0.03,
      ease: 'back.inOut(2)',
      scrollTrigger: {
        trigger: '#about',
        start: 'center bottom+=50%',
        end: 'bottom bottom-=40%',
        scrub: true,
      },
    }
  );
}

// ========================================
// SCROLL FLOAT TEXT ANIMATION (Clients, Work intro)
// ========================================

function initScrollFloatText(elementId: string, triggerSelector: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;

  const chars = splitTextIntoChars(el);
  if (chars.length === 0) return;

  gsap.fromTo(
    chars,
    {
      opacity: 0,
      yPercent: 60,
      scaleY: 1.2,
    },
    {
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      stagger: 0.02,
      ease: 'back.inOut(2)',
      scrollTrigger: {
        trigger: triggerSelector,
        start: 'center bottom+=50%',
        end: 'bottom bottom-=40%',
        scrub: true,
      },
    }
  );
}

// ========================================
// BUSINESS & ART SCROLL FLOAT
// ========================================

function splitTextPreservingSpans(element: HTMLElement): HTMLSpanElement[] {
  const chars: HTMLSpanElement[] = [];
  const childNodes = Array.from(element.childNodes);
  element.textContent = '';

  for (const node of childNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.id === 'rotating-word') {
        // Preserve the rotating-word span as-is
        el.style.display = 'inline-block';
        element.appendChild(el);
        chars.push(el as HTMLSpanElement);
      } else {
        element.appendChild(el);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const characters = [...text];
      for (const char of characters) {
        if (char === '\n') {
          element.appendChild(document.createElement('br'));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'char';
        span.style.display = 'inline-block';
        if (char === ' ') {
          span.innerHTML = '&nbsp;';
        } else {
          span.textContent = char;
        }
        element.appendChild(span);
        chars.push(span);
      }
    }
  }
  return chars;
}

function initBusinessArtScrollFloat(): void {
  const el = document.getElementById('business-art-text');
  if (!el) return;

  const chars = splitTextPreservingSpans(el);
  if (chars.length === 0) return;

  gsap.fromTo(
    chars,
    {
      opacity: 0,
      yPercent: 80,
      scaleY: 1.4,
    },
    {
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      stagger: 0.02,
      ease: 'back.inOut(2)',
      scrollTrigger: {
        trigger: '#business-art',
        start: 'top 70%',
        end: 'center center',
        scrub: true,
      },
    }
  );
}

// ========================================
// 3D BACKGROUND PLACEHOLDER
// ========================================

function initSplineBackground(): void {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  // Mark as loaded so the shared lazy-loader (initHamburger) won't inject a 2nd time.
  if (canvas.dataset.splineInit) return;
  canvas.dataset.splineInit = '1';

  // Load Spline scene — expose dragon on window for scroll handler
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
        try {
          dragon = spline.findObjectById(DRAGON_ID);
        } catch(e) {}
        if (!dragon) {
          try {
            dragon = spline.findObjectByName('long');
          } catch(e) {}
        }
        if (!dragon) {
          try {
            dragon = spline.findObjectByName(DRAGON_ID)
              || spline.findObjectByName('model');
          } catch(e) {}
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
        // Log 亮 parts info
        try {
          const allObjs = spline.getAllObjects();
          const liangParts = allObjs.filter(o => o && o.position && Math.abs(o.position.y - (-267)) < 5);
          console.log('[Spline] 亮 parts:', liangParts.length, 'First:', liangParts[0]?.name, 'type:', liangParts[0]?.type, 'scale:', liangParts[0]?.scale?.x);
          // Check camera
          const cam = allObjs.find(o => o && o.name === 'Camera');
          if (cam) {
            console.log('[Spline] Camera pos:', cam.position.x.toFixed(0), cam.position.y.toFixed(0), cam.position.z.toFixed(0),
              'rot:', cam.rotation?.x?.toFixed(2), cam.rotation?.y?.toFixed(2), cam.rotation?.z?.toFixed(2));
          }
        } catch(e) {}
        if (dragon) {
          console.log('[Spline] Found dragon:', dragon.name);
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

  // Wait for dragon to be ready, then set up scroll-driven rotation
  window.addEventListener('spline-dragon-ready', () => {
    const dragon = (window as any).__splineDragon;
    if (!dragon) return;

    // OG exact: read model's ACTUAL initial rotation (not zeros)
    const initRot = { x: dragon.rotation.x, y: dragon.rotation.y, z: dragon.rotation.z };
    // Scroll-driven base rotation (mouse offset is layered on top in the render loop).
    const baseRot = { x: initRot.x, y: initRot.y, z: initRot.z };
    const deg = (d: number) => d * Math.PI / 180;

    // OG exact keyframes — positions WITHOUT mobileOffset baked in
    const q  = { x: -275.79, y: 88.98,  z: 43.6 };
    const Y  = { x: -275.79, y: 90.98,  z: 43.6 };
    const G  = { x: -275.79, y: 90.98,  z: 43.6 };
    const Q  = { x: -133.79, y: 90.98,  z: 43.6 };
    const ee = { x: Q.x, y: Q.y - 500, z: Q.z };

    // Rotations
    const V = { x: -0.733,  y: 2.285,  z: -0.072 };
    const K = { x: deg(-42), y: deg(241.05), z: deg(-4.15) };
    const $ = { x: deg(4),   y: deg(323.05), z: deg(-7.15) };

    // Scales
    const U = { x: 1, y: 1, z: 1 };
    const X = { x: 1, y: 1, z: 1 };
    const Z = { x: 1.4, y: 1.4, z: 1.4 };
    const J = { x: 1.4, y: 1.4, z: 1.4 };

    // Set initial position
    const mobileOff = 40 * (window.innerWidth < 768 ? 1 : 0);
    dragon.position.x = q.x + mobileOff;
    dragon.position.y = q.y;
    dragon.position.z = q.z;
    if (dragon.scale) {
      dragon.scale.x = U.x;
      dragon.scale.y = U.y;
      dragon.scale.z = U.z;
    }

    // OG exact interpolation — applies mobileOffset during interpolation, uses model's initRot
    function applyProgress(progress: number) {
      const e = Math.max(0, Math.min(1, progress));
      const t = 40 * (window.innerWidth < 768 ? 1 : 0);
      const ip = gsap.utils.interpolate;
      let pos = { x: 0, y: 0, z: 0 };
      let rot = { x: 0, y: 0, z: 0 };
      let scl = { x: 1, y: 1, z: 1 };

      if (e <= 1/6) {
        const n = e / (1/6);
        pos = { x: ip(q.x + t, Y.x + t, n), y: ip(q.y, Y.y, n), z: ip(q.z, Y.z, n) };
        rot = { x: ip(initRot.x, V.x, n), y: ip(initRot.y, V.y, n), z: ip(initRot.z, V.z, n) };
        scl = { x: ip(U.x, X.x, n), y: ip(U.y, X.y, n), z: ip(U.z, X.z, n) };
      } else if (e <= 2/6) {
        const r = (e - 1/6) / (2/6 - 1/6);
        pos = { x: ip(Y.x + t, G.x + t, r), y: ip(Y.y, G.y, r), z: ip(Y.z, G.z, r) };
        rot = { x: ip(V.x, K.x, r), y: ip(V.y, K.y, r), z: ip(V.z, K.z, r) };
        scl = { x: ip(X.x, Z.x, r), y: ip(X.y, Z.y, r), z: ip(X.z, Z.z, r) };
      } else if (e <= 0.5) {
        const i = (e - 2/6) / (0.5 - 2/6);
        pos = { x: ip(G.x + t, Q.x + t, i), y: ip(G.y, Q.y, i), z: ip(G.z, Q.z, i) };
        rot = { x: ip(K.x, $.x, i), y: ip(K.y, $.y, i), z: ip(K.z, $.z, i) };
        scl = { x: J.x, y: J.y, z: J.z };
      } else if (e <= 5/6) {
        pos = { x: Q.x + t, y: Q.y, z: Q.z };
        rot = { x: $.x, y: $.y, z: $.z };
        scl = { x: J.x, y: J.y, z: J.z };
      } else {
        const o = (e - 5/6) / (1 - 5/6);
        pos = { x: ip(Q.x + t, ee.x + t, o), y: ip(Q.y, ee.y, o), z: ip(Q.z, ee.z, o) };
        rot = { x: $.x, y: $.y, z: $.z };
        scl = { x: J.x, y: J.y, z: J.z };
      }

      dragon.position.x = pos.x;
      dragon.position.y = pos.y;
      dragon.position.z = pos.z;
      // Scroll sets the BASE rotation; the mouse offset is added in the render loop below.
      baseRot.x = rot.x;
      baseRot.y = rot.y;
      baseRot.z = rot.z;
      if (dragon.scale) {
        dragon.scale.x = scl.x;
        dragon.scale.y = scl.y;
        dragon.scale.z = scl.z;
      }
    }

    // OG exact: start:0, end:6*vh, no trigger
    const splineST = ScrollTrigger.create({
      start: 0,
      end: () => 6 * window.innerHeight,
      scrub: true,
      onUpdate: (self) => applyProgress(self.progress),
    });

    // Apply current scroll progress (Spline may load after user has scrolled)
    applyProgress(splineST.progress);
    ScrollTrigger.refresh();

    // --- Mouse-driven rotation (OG: the dragon turns toward the cursor) ---
    // Subtle tilt layered on top of the scroll base. Horizontal yaw is the main motion;
    // vertical pitch is only a slight tilt (avoid big vertical displacement).
    const MAX_YAW = 0.26;   // radians (~15°) — horizontal turn
    const MAX_PITCH = 0.09; // radians (~5°) — slight vertical tilt
    const mouseTarget = { x: 0, y: 0 };
    const mouseCur = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
      mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
      mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2; // -1..1
    }, { passive: true });

    function rotateLoop(): void {
      mouseCur.x += (mouseTarget.x - mouseCur.x) * 0.06;
      mouseCur.y += (mouseTarget.y - mouseCur.y) * 0.06;
      dragon.rotation.x = baseRot.x + mouseCur.y * MAX_PITCH;
      dragon.rotation.y = baseRot.y + mouseCur.x * MAX_YAW;
      dragon.rotation.z = baseRot.z;
      requestAnimationFrame(rotateLoop);
    }
    rotateLoop();
  });
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

// ========================================
// CLIENT NAME HOVER EFFECT
// ========================================

const CLIENT_IMAGES: Record<string, string> = {
  'Warhorse': '/images/clients/1765349501131-675197513.webp',
  'XPeng': '/images/clients/1765349716395-851142275.webp',
  'Yangshengtang': '/images/clients/1765350032946-30003974.webp',
  'Leaf': '/images/clients/1765377047589-453632077.webp',
  'AHL Legal': '/images/clients/1765350322570-186488199.webp',
  'MONSA': '/images/clients/1765350444373-121175076.webp',
  'Angel': '/images/clients/1765350612262-353356053.webp',
  'ChatDOC': '/images/clients/1765507252829-524298976.webp',
  'Li Qiuming': '/images/clients/1765377179834-261642294.webp',
  'KOKOROBAE': '/images/clients/1765377295372-754881140.webp',
  'EWD': '/images/clients/1765377535575-689121986.webp',
  'DBB': '/images/clients/1765351087387-767287733.webp',
  'JOJOMADE': '/images/clients/1765377602728-215903315.webp',
  'DecentralGPT': '/images/clients/1765351214542-897261469.webp',
  'LeetonPet': '/images/clients/1765288976329-438744988.webp',
  'KataWorld': '/images/clients/1765350795676-617002111.webp',
  '≥9': '/images/clients/1765377689878-667639748.webp',
  'Superimage': '/images/clients/1765351425208-270269083.webp',
  'SELDON': '/images/clients/1765351709492-389723511.webp',
  'Aulis Ventures': '/images/clients/1765351772792-710714766.webp',
  'XAIAgent': '/images/clients/1765351922611-221537105.webp',
  'DRCPad': '/images/clients/1765352135518-654018541.webp',
  'Yuchudongshan': '/images/clients/1765352234018-211793487.webp',
  'ZAOWUJUN': '/images/clients/1765377774417-458172985.webp',
  'Morphy Richards': '/images/clients/1765352301247-507993542.webp',
  'Angelpalace': '/images/clients/1765352873410-988837157.webp',
  'GIDEA': '/images/clients/1765377844230-275178981.webp',
  'Huihuang': '/images/clients/1765352919264-645229322.webp',
  'Barsetto': '/images/clients/1765352982781-801674555.webp',
  'SONY': '/images/clients/1765353051255-641399240.webp',
  'XIAOMI': '/images/clients/1765353249410-830407708.webp',
  'Mingzhan': '/images/clients/1765354178776-202791722.webp',
  'klclear': '/images/clients/1765354378236-66994346.webp',
  'Mr.Bin': '/images/clients/1765354450000-64653926.webp',
  'Whirlpool': '/images/clients/1765354619913-224622753.webp',
  'Jplus': '/images/clients/1765354809846-149286516.webp',
  'Baidu': '/images/clients/1765355045231-434420280.webp',
  'Huawei': '/images/clients/1765355171445-956049888.webp',
  'WinSing': '/images/clients/1765355372320-40218421.webp',
  'JND': '/images/clients/1765355847418-36391659.webp',
  'TAILG': '/images/clients/1765356193421-342217565.webp',
  'Yuexinyi': '/images/clients/1765356287300-731843578.webp',
};

function initClientHover(): void {
  const clients = document.querySelectorAll('.client-name');
  const hoverImg = document.getElementById('client-hover-img');
  const hoverImgEl = document.getElementById('client-hover-img-el') as HTMLImageElement;
  if (!clients.length) return;

  // A client is always selected (defaults to the first, Warhorse); hovering another
  // switches it. The preview image's visibility is tied to the clients section being
  // in view — it appears when scrolled into the section and hides when scrolled away
  // (in either direction).
  let inView = false;

  function setActive(client: Element): void {
    clients.forEach((c) => c.classList.remove('active'));
    client.classList.add('active');
    const name = (client as HTMLElement).textContent?.trim() || '';
    const imgSrc = CLIENT_IMAGES[name];
    if (imgSrc && hoverImgEl) hoverImgEl.src = imgSrc;
  }

  function syncVisibility(): void {
    if (!hoverImg) return;
    if (inView) hoverImg.classList.add('visible');
    else hoverImg.classList.remove('visible');
  }

  setActive(clients[0]); // default selection (image src ready, shown only when in view)

  clients.forEach((client) => {
    client.addEventListener('mouseenter', () => {
      setActive(client);
      if (inView && hoverImg) hoverImg.classList.add('visible');
    });
  });

  // Tie visibility to the client NAMES grid being in view — not the whole
  // #clients section, which starts far higher up the page and made the preview
  // appear well before the user reaches the names.
  const section = document.querySelector('.clients-grid-outer') || document.getElementById('clients');
  if (section) {
    const obs = new IntersectionObserver(
      (entries) => {
        inView = entries[0].isIntersecting;
        syncVisibility();
      },
      { threshold: 0.2 }
    );
    obs.observe(section);
  }
}

// ========================================
// ROTATING WORD (Business & Art section)
// ========================================

function initRotatingWord(): void {
  const el = document.getElementById('rotating-word');
  if (!el) return;

  // OG exact words with emojis, cycling every 1 second
  const words = ['UI/UX\u{1F5B1}️', 'Graphic\u{1F4D2}️', 'AI+✨️', '3D\u{1F440}', 'Motion\u{1F4BF}'];
  let index = 0;

  setInterval(() => {
    index = (index + 1) % words.length;
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => {
      el.textContent = words[index];
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 150);
  }, 1000);
}

// ========================================
// VIDEO SECTION PIN
// ========================================

function initVideoPin(): void {
  const videoSection = document.getElementById('video');
  if (!videoSection) return;

  const videoEl = videoSection.querySelector('video');

  // Start video scaled down, scale up as user scrolls to it (matching OG)
  if (videoEl) {
    gsap.set(videoEl, {
      scale: 0.35,
      transformOrigin: 'center center',
    });
  }

  ScrollTrigger.matchMedia({
    // Desktop
    '(min-width: 768px)': () => {
      // Pin the video section
      ScrollTrigger.create({
        trigger: videoSection,
        start: 'top top',
        end: '+=600',
        pin: true,
        pinSpacing: false,
      });

      // Scale video from 0.35 to 1 while scrolling
      if (videoEl) {
        gsap.to(videoEl, {
          scale: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: videoSection,
            start: 'top center',
            end: '+=500 center',
            scrub: true,
          },
        });
      }
    },
    // Mobile (no pin, just scale)
    '(max-width: 767px)': () => {
      if (videoEl) {
        gsap.to(videoEl, {
          scale: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: videoSection,
            start: 'top bottom',
            end: 'top center',
            scrub: true,
          },
        });
      }
    },
  });
}

// ========================================
// INIT
// ========================================

function init(): void {
  // Initialize loading screen FIRST — blocks hero animations until complete
  initAsciiLoadingScreen().then(() => {
    // Split heading text into words and animate AFTER loading completes
    const heading = document.getElementById('hero-heading');
    const services = document.getElementById('hero-services');

    if (heading) {
      const headingWords = splitTextIntoWords(heading);
      heading.style.opacity = '1'; // reveal container (CSS hides it to avoid raw-text flash)
      animateWords(headingWords, 0.3);
    }

    if (services) {
      const serviceWords = splitTextIntoWords(services);
      services.style.opacity = '1';
      animateWords(serviceWords, 0.8);
    }
  });

  // Initialize hamburger menu toggle
  initHamburger();

  // Initialize noise overlay
  initNoiseCanvas();

  // Initialize 3D background placeholder
  initSplineBackground();

  // Initialize scroll-driven animations
  initAboutScrollReveal();
  initScrollFloatText('clients-intro', '#clients');
  initBusinessArtScrollFloat();
  initScrollFloatText('work-intro', '#work-showcase');

  // Initialize typewriter effect
  initTypewriter();

  // Initialize footer clock
  initFooterClock();

  // Initialize gallery canvas
  initGalleryCanvas();

  // Initialize client hover effect
  initClientHover();

  // Initialize rotating word in Business & Art section
  initRotatingWord();

  // Initialize custom scrollbar
  initCustomScrollbar();

  // Initialize hover click sound on work titles and client names
  initHoverSound();

  // Initialize Lenis smooth scrolling
  initLenis();

  // Initialize easter egg drag interaction
  initEggDrag();

  // Initialize video section pin & scale
  initVideoPin();

  // Initialize work section horizontal scroll
  initWorkHorizontalScroll();

  // Initialize ribbon cursor trail (OG: module 5647)
  initRibbonTrail();

  // Header logo scroll-based shrink (OG: large on homepage, shrinks after 80vh scroll)
  initHeaderLogoShrink();

  // Entrance animations on header/footer elements
  initEntranceAnimations();

  // Page transition overlays
  initPageTransitions();
}

// Wait for DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
