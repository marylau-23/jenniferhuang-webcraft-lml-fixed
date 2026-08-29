/**
 * Project showcase module — horizontal scroll with images, titles, parallax,
 * tooltip, magnetic tilt, snap scroll.
 * Extracted from main.ts (homepage only).
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWorkCanvas } from './work-canvas';
import { hasWorkDetail } from './shared';

gsap.registerPlugin(ScrollTrigger);

// ========================================
// WORK SECTION HORIZONTAL SCROLL
// ========================================

export function initWorkHorizontalScroll(): void {
  const wrapper = document.getElementById('work-showcase');
  const workContent = wrapper?.querySelector('.work-content') as HTMLElement;
  const titleOverlay = wrapper?.querySelector('.work-titles-overlay') as HTMLElement;
  if (!wrapper || !workContent || !titleOverlay) return;

  const items = Array.from(workContent.querySelectorAll<HTMLElement>('.work-content-item'));
  const numItems = items.length;
  if (!numItems) return;

  // Apply inline styles to image containers (OG exact: JS-driven, not CSS media queries)
  const isMobileInit = window.innerWidth <= 768;
  const workImgEls = workContent.querySelectorAll<HTMLElement>('.work-img-slow-outer');
  workImgEls.forEach((imgOuter) => {
    const layer = (imgOuter.getAttribute('data-layer') || '').toLowerCase();
    imgOuter.style.position = 'absolute';

    if (layer === 'primary') {
      if (isMobileInit) {
        imgOuter.style.width = '25vw';
        imgOuter.style.bottom = 'clamp(-180px, -40vw, -90px)';
        imgOuter.style.right = 'clamp(-200px, -15vw, -20px)';
        imgOuter.style.zIndex = '5';
      } else {
        imgOuter.style.width = 'clamp(320px, 50vw, 820px)';
        imgOuter.style.height = 'clamp(320px, 50vw, 820px)';
        imgOuter.style.bottom = 'clamp(-120px, -20vw, -40px)';
        imgOuter.style.right = 'clamp(-420px, -28vw, -40px)';
        imgOuter.style.zIndex = '50';
      }
    } else if (layer === 'secondary') {
      if (isMobileInit) {
        imgOuter.style.width = '20vw';
        imgOuter.style.top = 'clamp(-330px, -22vw, -40px)';
        imgOuter.style.left = 'clamp(-150px, -15vw, 100px)';
        imgOuter.style.zIndex = '5';
      } else {
        imgOuter.style.width = 'clamp(240px, 42vw, 640px)';
        imgOuter.style.height = 'clamp(240px, 42vw, 640px)';
        imgOuter.style.top = 'clamp(-330px, -22vw, -40px)';
        imgOuter.style.left = 'clamp(-100px, -6vw, 10px)';
        imgOuter.style.zIndex = '10';
      }
    }

    // OG: <img> only on mobile (J=true). Desktop containers stay empty — canvas handles it.
    if (isMobileInit) {
      const src = imgOuter.getAttribute('data-src');
      if (!src || imgOuter.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.width = layer === 'primary' ? 200 : 160;
      img.height = 0;
      img.className = 'work-img-slow';
      img.draggable = false;
      imgOuter.appendChild(img);
    }
  });
  if (!isMobileInit) {
    // Desktop: WebGL canvas overlays (OG exact: two canvases, secondary z-40, primary z-60)
    initWorkCanvas({
        anchorEl: wrapper,
        selector: '.work-img-slow-outer[data-layer="secondary"]',
        multiCanvas: true,
        insertBeforeNode: titleOverlay,
        insertAfter: false,
        zIndex: '40',
        titleSelector: '.work-title',
      });
      initWorkCanvas({
        anchorEl: wrapper,
        selector: '.work-img-slow-outer[data-layer="primary"]',
        multiCanvas: true,
        insertBeforeNode: titleOverlay,
        insertAfter: true,
        zIndex: '60',
        titleSelector: '.work-title',
      });
  }

  // OG exact font-size function based on character count
  function getWorkTitleFontSize(title: string, isMobile: boolean): string {
    const charCount = title.replace(/\s+/g, '').length || 1;
    if (isMobile) {
      return charCount <= 16
        ? 'clamp(2.5rem, 12vw, 9rem)'
        : 'clamp(2rem, 9vw, 7.375rem)';
    }
    if (charCount <= 6) return 'clamp(3rem, 15vw, 11rem)';
    if (charCount <= 16) return 'clamp(2.5rem, 12vw, 9rem)';
    return 'clamp(2rem, 9vw, 7.375rem)';
  }

  // Set up dynamic font sizes on title sizers (invisible h2 in work-content)
  const isMobile = window.innerWidth <= 768;
  const titleSizers = Array.from(workContent.querySelectorAll<HTMLElement>('.work-title-sizer'));
  titleSizers.forEach((sizer) => {
    const titleText = sizer.getAttribute('data-title') || sizer.textContent || '';
    sizer.style.fontSize = getWorkTitleFontSize(titleText, isMobile);
    sizer.style.lineHeight = '1';
    sizer.style.wordBreak = 'keep-all';
    sizer.style.overflowWrap = 'normal';
    sizer.style.hyphens = 'none';
    sizer.style.opacity = '0';
    sizer.style.pointerEvents = 'none';
  });

  // Set up dynamic font sizes on overlay titles (OG exact: inline style font-size)
  const overlayTitles = Array.from(titleOverlay.querySelectorAll<HTMLElement>('.work-title'));
  overlayTitles.forEach((title) => {
    const text = title.getAttribute('data-title') || title.textContent || '';
    const charCount = text.replace(/\s+/g, '').length || 1;
    if (charCount <= 6) {
      title.setAttribute('data-size', 'short');
    } else if (charCount > 16) {
      title.setAttribute('data-size', 'long');
    }
    // OG sets inline style fontSize via x() function
    title.style.fontSize = getWorkTitleFontSize(text, isMobile);
    title.style.lineHeight = '1';
    title.style.wordBreak = 'keep-all';
    title.style.overflowWrap = 'normal';
    title.style.hyphens = 'none';
    title.style.textAlign = 'center';
  });

  // OG exact totalWidth: sum of all item widths minus one viewport
  const totalWidth = (): number =>
    Math.max(0, items.reduce((acc, item) => acc + item.offsetWidth, 0) - window.innerWidth);

  // Scroll velocity tracking (OG exact)
  let prevVel = 0;
  let lastProgress = 0;

  // Track pinned section top for title overlay show/hide
  let sectionTopY: number | null = null;

  // Layers 1 & 2 share ONE pinning ScrollTrigger timeline so the horizontal
  // content scroll and the vertical title-overlay scroll always scrub together.
  // (Two separate ScrollTriggers on the same pinned trigger can leave the
  // non-pinning title one mis-measured against the pin-spacer, so the titles
  // stay frozen while the images still scroll — exactly the /work bug.)
  const horizontalTween = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: () => '+=' + totalWidth(),
      scrub: true,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  horizontalTween.fromTo(
    workContent,
    { x: 0 },
    { x: () => -totalWidth(), ease: 'none', duration: 1 },
    0
  );

  // Scroll velocity tracking via separate ScrollTrigger (OG exact)
  ScrollTrigger.create({
    trigger: wrapper,
    start: 'top top',
    end: () => '+=' + totalWidth(),
    onUpdate: (self) => {
      const progress = typeof self.progress === 'number' ? self.progress : 0;
      const deltaProgress = progress - (lastProgress || 0);
      lastProgress = progress;
      const scrollVel = 0.86 * (prevVel || 0) + 50 * deltaProgress * 0.14;
      prevVel = scrollVel;
      const clamped = gsap.utils.clamp(-1, 1, scrollVel);
      wrapper?.style.setProperty('--scroll-vel', String(clamped));
    },
  });

  // Snap-to-project on scroll stop (OG exact)
  let snapTimeout: ReturnType<typeof setTimeout> | null = null;
  let touchActive = false;
  function snapToNearestProject(): void {
    const st = horizontalTween.scrollTrigger;
    if (!st || !st.isActive || touchActive) return;
    if (snapTimeout) clearTimeout(snapTimeout);
    const delay = window.innerWidth <= 768 ? 420 : 600;
    snapTimeout = setTimeout(() => {
      const st2 = horizontalTween.scrollTrigger;
      if (!st2 || !st2.isActive) return;
      const progress = st2.progress;
      const count = Math.max(1, numItems);
      const nearest = Math.round(progress * (count - 1));
      const start = st2.start;
      const end = st2.end;
      if (typeof start === 'number' && typeof end === 'number') {
        window.scrollTo({ top: start + (end - start) * (count === 1 ? 0 : nearest / (count - 1)), behavior: 'smooth' });
      }
    }, delay);
  }
  window.addEventListener('scroll', snapToNearestProject, { passive: true });
  window.addEventListener('touchstart', () => { touchActive = true; if (snapTimeout) clearTimeout(snapTimeout); }, { passive: true });
  window.addEventListener('touchend', () => { touchActive = false; snapToNearestProject(); }, { passive: true });

  // Layer 2: Vertical scroll of title overlay — added to the SAME timeline as the
  // horizontal scroll (position 0, equal duration) so it is always perfectly synced.
  horizontalTween.fromTo(
    titleOverlay,
    { y: 0 },
    { y: () => '-' + (100 * Math.max(0, numItems - 1)) + 'vh', ease: 'none', duration: 1 },
    0
  );

  // Title overlay show/hide logic (OG exact)
  // Starts hidden, becomes visible when scroll reaches within 600px of section top
  titleOverlay.style.display = 'none';
  titleOverlay.style.opacity = '0';
  titleOverlay.style.transition = 'opacity 200ms ease-out';

  function checkTitleOverlayVisibility(): void {
    if (!titleOverlay || !wrapper) return;
    const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
    if (sectionTopY === null) sectionTopY = wrapperTop;
    const scrollY = window.scrollY || window.pageYOffset;

    if (scrollY >= wrapperTop - 600) {
      titleOverlay.style.display = 'block';
      requestAnimationFrame(() => {
        titleOverlay.style.opacity = '1';
        // Also update blur/scale effects when visible
        try { updateAllEffects(); } catch (_e) { /* ignore */ }
      });
    } else {
      titleOverlay.style.opacity = '0';
      setTimeout(() => {
        if (titleOverlay) titleOverlay.style.display = 'none';
      }, 220);
    }
  }

  checkTitleOverlayVisibility();
  window.addEventListener('scroll', checkTitleOverlayVisibility, { passive: true });
  window.addEventListener('resize', checkTitleOverlayVisibility);

  // Title effects update function (called on every scroll tick)
  function updateAllEffects(): void {
    const vw = window.visualViewport?.width || window.innerWidth || 1;
    const vh = window.visualViewport?.height || window.innerHeight || 1;
    const isMobileNow = vw <= 768;

    // Update title blur/scale (OG exact: based on viewport position, not progress)
    if (titleOverlay) {
      const titleVhThreshold = 0.15 * vh;
      const wrapperTopY = sectionTopY ?? (wrapper ? wrapper.getBoundingClientRect().top + window.scrollY : 0);
      const scrollY = window.scrollY || window.pageYOffset;
      const isAtStart = scrollY <= wrapperTopY + 10;

      overlayTitles.forEach((title, i) => {
        const rect = title.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        // OG: scale based on vertical position (0=top, 1=bottom of viewport)
        const verticalRatio = gsap.utils.clamp(0, 1, centerY / vh);
        let scale = gsap.utils.interpolate(0.6, 1.4, verticalRatio);

        // OG: blur based on distance from vertical center
        const distFromVertCenter = Math.max(0, Math.min(centerY, vh - centerY));
        const blurIntensity = Math.pow(gsap.utils.clamp(0, 1, (titleVhThreshold - distFromVertCenter) / titleVhThreshold), 1.6);
        let blur = gsap.utils.interpolate(0, 8, blurIntensity);

        // First title at start: no scale/blur
        if (i === 0 && isAtStart) {
          scale = 1;
          blur = 0;
        }

        // Last title at end (progress >= 0.999): no scale/blur
        try {
          if (i === numItems - 1 && typeof lastProgress === 'number' && lastProgress >= 0.999) {
            scale = 1;
            blur = 0;
          }
        } catch (_e) { /* ignore */ }

        const roundedScale = Math.round(100 * scale) / 100;
        const roundedBlur = Math.round(10 * blur) / 10;

        // OG: uses gsap.to with short duration for smooth interpolation
        gsap.to(title, {
          transformOrigin: 'center center',
          scale: roundedScale,
          filter: 'blur(' + roundedBlur + 'px)',
          duration: isMobileNow ? 0.12 : 0.06,
          ease: 'power1.out',
          overwrite: true,
          force3D: true,
        });

        // Accessibility: titles that are sharp and visible should be interactive
        if (blur < 2 && scale > 0.7) {
          titleOverlay.removeAttribute('inert');
          titleOverlay.removeAttribute('aria-hidden');
        } else {
          titleOverlay.setAttribute('aria-hidden', 'true');
        }
      });
    }
  }

  // Hook updateAllEffects into scroll
  ScrollTrigger.create({
    trigger: wrapper,
    start: 'top top',
    end: () => '+=' + totalWidth(),
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: () => { updateAllEffects(); },
    onRefresh: () => { updateAllEffects(); },
  });

  // Initial call
  updateAllEffects();

  // Image parallax (OG exact: containerAnimation-based per-image offsets)
  function getParallaxSpeed(el: HTMLElement): number {
    const speed = Number(el.dataset.speed);
    if (Number.isFinite(speed)) return speed;
    const layer = (el.dataset.layer || '').toLowerCase();
    if (layer === 'primary') return 0.22;
    if (layer === 'secondary') return 0.06;
    return 0.12;
  }

  items.forEach((item) => {
    try {
      const primaryImg = item.querySelector<HTMLElement>('.work-img-slow-outer[data-layer="primary"]');
      const secondaryImg = item.querySelector<HTMLElement>('.work-img-slow-outer[data-layer="secondary"]');

      if (primaryImg) {
        const speed = getParallaxSpeed(primaryImg);
        const offset = 0.56 * (primaryImg.offsetWidth || 0) + totalWidth() * speed * 0.18;
        ScrollTrigger.create({
          trigger: item,
          containerAnimation: horizontalTween,
          start: 'center center',
          end: 'right center',
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = typeof self.progress === 'number' ? self.progress : 0;
            const clamped = gsap.utils.clamp(0, 1, progress);
            gsap.set(primaryImg, { x: -offset * clamped });
          },
        });
      }

      if (secondaryImg) {
        const speed = getParallaxSpeed(secondaryImg);
        const adjustedSpeed = Math.max(0.03, 0.6 * speed);
        const offset = 0.18 * (secondaryImg.offsetWidth || 0) + totalWidth() * adjustedSpeed * 0.02;
        ScrollTrigger.create({
          trigger: item,
          containerAnimation: horizontalTween,
          start: 'center center',
          end: 'right center',
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = typeof self.progress === 'number' ? self.progress : 0;
            const clamped = gsap.utils.clamp(0, 1, progress);
            gsap.set(secondaryImg, { x: 5 * offset * clamped });
          },
        });
      }
    } catch (_e) { /* ignore */ }
  });

  // Magnetic 3D tilt on title hover + tooltip (OG exact: two separate fixed divs)
  const tooltipTitle = document.getElementById('work-hover-title');
  const tooltipTags = document.getElementById('work-hover-tags');
  let activeHoverIdx: number | null = null;
  const magnetPadding = 160;
  const magnetStrength = 60;
  const maxTilt = 8;

  // OG exact: smooth cursor lerp for tooltip
  const targetPos = { x: 0, y: 0 };
  const currentPos = { x: 0, y: 0 };
  let tooltipRaf: number | null = null;

  function lerpTooltip(): void {
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) {
      currentPos.x = targetPos.x;
      currentPos.y = targetPos.y;
    } else {
      const factor = Math.min(0.15, Math.max(0.08, 0.001 * dist));
      currentPos.x += dx * factor;
      currentPos.y += dy * factor;
    }
    if (activeHoverIdx !== null) {
      const data = projectData[activeHoverIdx];
      const hasTags = data && data.tags.length > 0;
      const titleOffset = hasTags ? 78 : 26;
      if (tooltipTitle) {
        tooltipTitle.style.left = currentPos.x + 'px';
        tooltipTitle.style.top = (currentPos.y - titleOffset) + 'px';
      }
      if (tooltipTags && hasTags) {
        tooltipTags.style.left = currentPos.x + 'px';
        tooltipTags.style.top = (currentPos.y - 40) + 'px';
      }
      tooltipRaf = requestAnimationFrame(lerpTooltip);
    }
  }

  // Get the project data from work-content-items for tags
  const workDataItems = Array.from(workContent.querySelectorAll<HTMLElement>('.work-content-item'));
  const projectData = workDataItems.map((item) => ({
    title: item.querySelector('.work-title-sizer')?.getAttribute('data-title') || '',
    tags: (item.getAttribute('data-tags') || '').split(',').filter(Boolean),
    slug: item.getAttribute('data-slug') || '',
  }));

  function showTooltips(idx: number, scale: number): void {
    const data = projectData[idx];
    if (!data) return;
    if (tooltipTitle) {
      tooltipTitle.textContent = data.title.replace(/\n/g, ' ');
      tooltipTitle.style.display = 'block';
      tooltipTitle.style.opacity = String(scale);
      tooltipTitle.style.transform = `translateX(-50%) scale(${scale})`;
    }
    if (tooltipTags && data.tags.length > 0) {
      tooltipTags.innerHTML = '';
      data.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        tooltipTags!.appendChild(span);
      });
      tooltipTags.style.display = 'flex';
      tooltipTags.style.opacity = String(scale);
      tooltipTags.style.transform = `translateX(-50%) scale(${scale})`;
    }
  }

  function hideTooltips(): void {
    if (tooltipTitle) {
      tooltipTitle.style.opacity = '0';
      tooltipTitle.style.transform = 'translateX(-50%) scale(0.9)';
      setTimeout(() => { if (activeHoverIdx === null && tooltipTitle) tooltipTitle.style.display = 'none'; }, 250);
    }
    if (tooltipTags) {
      tooltipTags.style.opacity = '0';
      tooltipTags.style.transform = 'translateX(-50%) scale(0.9)';
      setTimeout(() => { if (activeHoverIdx === null && tooltipTags) tooltipTags.style.display = 'none'; }, 250);
    }
  }

  overlayTitles.forEach((title, idx) => {
    const screen = title.closest('.work-title-screen') as HTMLElement;
    if (!screen) return;

    let magnetRaf: number | null = null;
    let bounds: { left: number; top: number; width: number; height: number; centerX: number; centerY: number } | null = null;

    function updateBounds(): void {
      const rect = title.getBoundingClientRect();
      bounds = {
        left: rect.left, top: rect.top,
        width: rect.width, height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    }

    function applyMagnet(e: MouseEvent): void {
      if (!bounds) return;
      const dx = e.clientX - bounds.centerX;
      const dy = e.clientY - bounds.centerY;
      const mx = -dx / magnetStrength;
      const my = -dy / magnetStrength;
      const rotY = (dx / (bounds.width / 2)) * maxTilt;
      const rotX = -(dy / (bounds.height / 2)) * maxTilt;
      title.style.transition = 'none';
      title.style.transform = `translate3d(${mx}px, ${my}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }

    function resetMagnet(): void {
      title.style.transition = 'transform 0.5s ease-in-out';
      title.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
    }

    screen.addEventListener('mouseenter', (e: MouseEvent) => {
      updateBounds();
      activeHoverIdx = idx;
      targetPos.x = e.clientX;
      targetPos.y = e.clientY;
      currentPos.x = e.clientX;
      currentPos.y = e.clientY;
      showTooltips(idx, 0.9);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { showTooltips(idx, 1); });
      });
      if (tooltipRaf) cancelAnimationFrame(tooltipRaf);
      tooltipRaf = requestAnimationFrame(lerpTooltip);
    });

    screen.addEventListener('mousemove', (e: MouseEvent) => {
      if (!bounds) updateBounds();
      const absX = Math.abs(bounds!.centerX - e.clientX);
      const absY = Math.abs(bounds!.centerY - e.clientY);
      if (absX < bounds!.width / 2 + magnetPadding && absY < bounds!.height / 2 + magnetPadding) {
        if (magnetRaf !== null) cancelAnimationFrame(magnetRaf);
        magnetRaf = requestAnimationFrame(() => applyMagnet(e));
      }
      targetPos.x = e.clientX;
      targetPos.y = e.clientY;
    });

    screen.addEventListener('mouseleave', () => {
      resetMagnet();
      if (magnetRaf !== null) { cancelAnimationFrame(magnetRaf); magnetRaf = null; }
      activeHoverIdx = null;
      hideTooltips();
      if (tooltipRaf) { cancelAnimationFrame(tooltipRaf); tooltipRaf = null; }
    });

    // Only projects with a built detail page are navigable (the rest were never
    // captured from the OG); show the pointer cursor only for those.
    screen.style.cursor = hasWorkDetail(projectData[idx]?.slug) ? 'pointer' : 'default';
    screen.addEventListener('click', () => {
      const data = projectData[idx];
      if (hasWorkDetail(data?.slug)) window.location.href = `/en/work/${data.slug}`;
    });
  });

  // Also handle clicks on work-content-item-title (the image area)
  items.forEach((item) => {
    const titleArea = item.querySelector<HTMLElement>('.work-content-item-title');
    if (!titleArea) return;
    const slug = item.getAttribute('data-slug');
    titleArea.style.cursor = hasWorkDetail(slug) ? 'pointer' : 'default';
    titleArea.addEventListener('click', () => {
      if (hasWorkDetail(slug)) window.location.href = `/en/work/${slug}`;
    });
  });
}
