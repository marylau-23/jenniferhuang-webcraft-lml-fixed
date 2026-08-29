/**
 * Sketchboard (涂鸦板) — a self-contained drawing app.
 * Recreates the OG sketch.lml.cc tool: full-screen canvas drawing with brush/eraser/line,
 * size + opacity, color swatches, undo/redo, clear, PNG export, and zoom.
 */
import './style.css';

const BG = 'rgb(20, 20, 20)';
const SWATCHES = ['#ffffff', '#000000', '#FA0E0B', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

function init(): void {
  const canvas = document.getElementById('sketch-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ---- State ----
  let tool: 'brush' | 'eraser' | 'line' = 'brush';
  let color = '#ffffff';
  let size = 6;
  let opacity = 1;
  let zoom = 1;
  let drawing = false;
  let last = { x: 0, y: 0 };
  let lineStart = { x: 0, y: 0 };
  let snapshotBeforeStroke: ImageData | null = null;

  // Undo/redo stacks (ImageData snapshots)
  const undoStack: ImageData[] = [];
  const redoStack: ImageData[] = [];
  const MAX_HISTORY = 40;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function fillBackground(): void {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas!.width, canvas!.height);
    ctx.restore();
  }

  // Resize while preserving the drawing
  function resize(): void {
    if (!ctx) return;
    const prev = canvas!.width && canvas!.height
      ? ctx.getImageData(0, 0, canvas!.width, canvas!.height) : null;
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas!.width = w;
    canvas!.height = h;
    canvas!.style.width = window.innerWidth + 'px';
    canvas!.style.height = window.innerHeight + 'px';
    fillBackground();
    if (prev) ctx.putImageData(prev, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function pushUndo(): void {
    if (!ctx) return;
    undoStack.push(ctx.getImageData(0, 0, canvas!.width, canvas!.height));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
  }

  function pointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = canvas!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas!.height,
    };
  }

  function applyStroke(ctx2: CanvasRenderingContext2D): void {
    ctx2.lineCap = 'round';
    ctx2.lineJoin = 'round';
    ctx2.lineWidth = size * dpr;
    if (tool === 'eraser') {
      ctx2.globalCompositeOperation = 'source-over';
      ctx2.globalAlpha = 1;
      ctx2.strokeStyle = BG;
    } else {
      ctx2.globalCompositeOperation = 'source-over';
      ctx2.globalAlpha = opacity;
      ctx2.strokeStyle = color;
    }
  }

  function onDown(e: PointerEvent): void {
    if (!ctx) return;
    drawing = true;
    canvas!.setPointerCapture(e.pointerId);
    pushUndo();
    const p = pointerPos(e);
    last = p;
    lineStart = p;
    snapshotBeforeStroke = tool === 'line'
      ? ctx.getImageData(0, 0, canvas!.width, canvas!.height) : null;
    // dot on click
    if (tool !== 'line') {
      applyStroke(ctx);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 0.01, p.y + 0.01);
      ctx.stroke();
    }
  }

  function onMove(e: PointerEvent): void {
    if (!drawing || !ctx) return;
    const p = pointerPos(e);
    if (tool === 'line') {
      // preview from snapshot
      if (snapshotBeforeStroke) ctx.putImageData(snapshotBeforeStroke, 0, 0);
      applyStroke(ctx);
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      applyStroke(ctx);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    }
  }

  function onUp(): void {
    drawing = false;
    snapshotBeforeStroke = null;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ---- Undo / Redo ----
  function undo(): void {
    if (!ctx || undoStack.length === 0) return;
    redoStack.push(ctx.getImageData(0, 0, canvas!.width, canvas!.height));
    const img = undoStack.pop()!;
    ctx.putImageData(img, 0, 0);
  }
  function redo(): void {
    if (!ctx || redoStack.length === 0) return;
    undoStack.push(ctx.getImageData(0, 0, canvas!.width, canvas!.height));
    const img = redoStack.pop()!;
    ctx.putImageData(img, 0, 0);
  }
  document.getElementById('sketch-undo')?.addEventListener('click', undo);
  document.getElementById('sketch-redo')?.addEventListener('click', redo);
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  });

  // ---- Clear ----
  document.getElementById('sketch-clear')?.addEventListener('click', () => {
    pushUndo();
    fillBackground();
  });

  // ---- Export PNG ----
  document.getElementById('sketch-export')?.addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lml-sketch.png';
    a.click();
  });

  // ---- Zoom (visual scale of the canvas element) ----
  const zoomText = document.getElementById('sketch-zoom-text');
  function applyZoom(): void {
    canvas!.style.transform = `scale(${zoom})`;
    canvas!.style.transformOrigin = 'center center';
    if (zoomText) zoomText.textContent = Math.round(zoom * 100) + '%';
  }
  document.getElementById('sketch-zoom')?.addEventListener('click', () => {
    const steps = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const idx = steps.indexOf(zoom);
    zoom = steps[(idx + 1) % steps.length];
    applyZoom();
  });

  // ---- Tools ----
  const toolBtns = Array.from(document.querySelectorAll<HTMLElement>('.sketch-tool'));
  toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tool = (btn.getAttribute('data-tool') as typeof tool) || 'brush';
      toolBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    });
  });

  // ---- Brush settings ----
  const sizeInput = document.getElementById('sketch-size') as HTMLInputElement | null;
  const sizeVal = document.getElementById('sketch-size-val');
  sizeInput?.addEventListener('input', () => {
    size = Number(sizeInput.value);
    if (sizeVal) sizeVal.textContent = String(size);
  });

  const opacityInput = document.getElementById('sketch-opacity') as HTMLInputElement | null;
  const opacityVal = document.getElementById('sketch-opacity-val');
  opacityInput?.addEventListener('input', () => {
    opacity = Number(opacityInput.value) / 100;
    if (opacityVal) opacityVal.textContent = opacityInput.value + '%';
  });

  const dockColor = document.getElementById('sketch-dock-color');
  function setColor(c: string): void {
    color = c;
    if (dockColor) dockColor.style.background = c;
    const picker = document.getElementById('sketch-color') as HTMLInputElement | null;
    if (picker) picker.value = c;
  }

  // Swatches
  const swatchWrap = document.getElementById('sketch-swatches');
  if (swatchWrap) {
    SWATCHES.forEach((c) => {
      const sw = document.createElement('button');
      sw.className = 'sketch-swatch';
      sw.style.background = c;
      sw.addEventListener('click', () => {
        setColor(c);
        tool = 'brush';
        toolBtns.forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tool') === 'brush'));
      });
      swatchWrap.appendChild(sw);
    });
  }
  (document.getElementById('sketch-color') as HTMLInputElement | null)?.addEventListener('input', (e) => {
    setColor((e.target as HTMLInputElement).value);
  });

  setColor(color);

  // ---- Brush panel toggle ----
  const panel = document.getElementById('sketch-panel');
  document.getElementById('sketch-brush-toggle')?.addEventListener('click', () => {
    panel?.classList.toggle('open');
  });
  document.getElementById('sketch-panel-close')?.addEventListener('click', () => {
    panel?.classList.remove('open');
  });
  panel?.classList.add('open');

  canvas.style.cursor = 'crosshair';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
