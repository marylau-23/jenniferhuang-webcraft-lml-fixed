// Ported from OG chunk 443-bac26a48e1fd933c.js
// WebGL image renderer with keystone perspective, scroll bend, RGB shift, cursor displacement

const VERT_SHADER = `
attribute vec2 a_position;
attribute vec2 a_uv;
uniform float uScroll;
uniform vec2 uEntranceOffset;
varying vec2 vUv;
void main() {
  vUv = a_uv;
  vec2 position = a_position + uEntranceOffset;
  float xNorm = (position.x + 1.0) * 0.5;
  float bend = uScroll * 0.15;
  float offset = sin((xNorm - 0.5) * 3.14159265) * bend;
  gl_Position = vec4(position.x, position.y + offset, 0.0, 1.0);
}
`;

const FRAG_SHADER = `
precision mediump float;
uniform sampler2D uTexture;
uniform sampler2D uDataTexture;
uniform vec2 uCursor;
uniform float uStrength;
uniform float uRgbShift;
uniform vec2 uMagnetOffset;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec4 d = texture2D(uDataTexture, vUv);
  vec2 displacedUv = vUv - 0.02 * d.rg;
  float shift = uRgbShift * 0.005;
  vec2 shiftDir = vec2(shift * d.r, shift * d.g);
  vec4 tex = texture2D(uTexture, displacedUv);
  vec4 texR = texture2D(uTexture, displacedUv + shiftDir);
  vec4 texC = texture2D(uTexture, displacedUv - shiftDir);
  float a = tex.a * uOpacity;
  vec3 rgb = vec3(texR.r, texC.g, texC.b) * a;
  gl_FragColor = vec4(rgb, a);
}
`;

interface WorkCanvasOptions {
  anchorEl: HTMLElement;
  selector: string;
  strength?: number;
  rgbShift?: number;
  maxTiltAngle?: number;
  multiCanvas?: boolean;
  insertBeforeNode?: Node | null;
  insertAfter?: boolean;
  zIndex?: string;
  titleSelector?: string;
  fadeInDuration?: number;
  entranceDelay?: number;
  entranceDirection?: string;
  entranceDistance?: number;
}

export function initWorkCanvas(opts: WorkCanvasOptions): (() => void) | null {
  const {
    anchorEl,
    selector = '.work-img-slow-outer',
    strength = 0.18,
    rgbShift = 1.2,
    maxTiltAngle = 8,
    insertBeforeNode = null,
    insertAfter = false,
    zIndex,
    titleSelector = '.work-title',
    fadeInDuration = 800,
    entranceDelay = 300,
    entranceDistance = 50,
  } = opts;

  if (window.innerWidth <= 768) return null;

  // Create canvas overlay
  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-shared-gl-canvas', '1');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  if (zIndex) canvas.style.zIndex = zIndex;

  const parentStyle = window.getComputedStyle(anchorEl);
  if (parentStyle.position === 'static') {
    anchorEl.style.position = 'relative';
  }

  if (insertBeforeNode) {
    if (insertAfter) {
      if (insertBeforeNode.nextSibling) {
        anchorEl.insertBefore(canvas, insertBeforeNode.nextSibling);
      } else {
        anchorEl.appendChild(canvas);
      }
    } else {
      anchorEl.insertBefore(canvas, insertBeforeNode);
    }
  } else {
    anchorEl.appendChild(canvas);
  }

  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    canvas.remove();
    console.warn('WebGL2 not available for work canvas');
    return null;
  }

  gl.enable(gl.BLEND);
  try {
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  } catch { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }

  // Compile shaders + program
  function compileShader(type: number, src: string): WebGLShader | null {
    const s = gl!.createShader(type);
    if (!s) return null;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    return s;
  }
  const vs = compileShader(gl.VERTEX_SHADER, VERT_SHADER);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SHADER);
  if (!vs || !fs) { canvas.remove(); return null; }
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const posBuf = gl.createBuffer();
  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]), gl.STATIC_DRAW);

  // Texture cache
  const textures = new Map<string, WebGLTexture>();
  const images = new Map<string, HTMLImageElement>();
  const dataTextures = new Map<string, { tex: WebGLTexture; data: Float32Array }>();
  const opacities = new Map<string, number>();
  const offsets = new Map<string, { x: number; y: number }>();
  const loadedSet = new Set<string>();
  let entranceRaf: number | null = null;

  function loadTexture(src: string): WebGLTexture | null {
    if (textures.has(src)) return textures.get(src)!;
    const tex = gl!.createTexture();
    if (!tex) return null;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 1, 1, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      try {
        gl!.bindTexture(gl!.TEXTURE_2D, tex);
        gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, 1);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
      } catch {}
      loadedSet.add(src);

      // Entrance animation
      const delay = (loadedSet.size - 1) * entranceDelay;
      opacities.set(src, 0);
      offsets.set(src, { x: 0, y: entranceDistance });

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { entranceRaf = requestAnimationFrame(animate); return; }
        const progress = Math.min((now - startTime) / fadeInDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        opacities.set(src, eased);
        offsets.set(src, { x: 0, y: entranceDistance * (1 - eased) });
        if (progress < 1) entranceRaf = requestAnimationFrame(animate);
        else { opacities.set(src, 1); offsets.set(src, { x: 0, y: 0 }); }
      };
      animate();
    };
    images.set(src, img);
    textures.set(src, tex);

    // Data texture for displacement (22×22 grid)
    const dtex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, dtex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
    try {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, (gl as WebGL2RenderingContext).RGBA32F, 22, 22, 0, gl!.RGBA, gl!.FLOAT, new Float32Array(1936));
    } catch {
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 22, 22, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    }
    dataTextures.set(src, { tex: dtex, data: new Float32Array(1936) });

    return tex;
  }

  // Cursor tracking
  const cursor = { x: 0.5, y: 0.5 };
  const prevCursor = { x: 0, y: 0 };
  const onMouseMove = (e: MouseEvent) => {
    (window as any).__workCanvasCursorX = e.clientX;
    (window as any).__workCanvasCursorY = e.clientY;
    prevCursor.x = cursor.x;
    prevCursor.y = cursor.y;
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  };
  anchorEl.addEventListener('mousemove', onMouseMove, { passive: true });
  anchorEl.addEventListener('mouseenter', onMouseMove, { passive: true });

  // Resize
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = anchorEl.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    gl!.viewport(0, 0, w, h);
  }
  resize();
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(anchorEl);
  resizeObs.observe(canvas);

  // Render loop
  let rafId: number | null = null;

  function render() {
    rafId = requestAnimationFrame(render);
    if (!gl) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const canvasRect = canvas.getBoundingClientRect();
    const els = anchorEl.querySelectorAll<HTMLElement>(selector);
    const titles = titleSelector ? Array.from(anchorEl.querySelectorAll<HTMLElement>(titleSelector)) : [];

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const src = el.dataset.src || el.getAttribute('data-src') || '';
      if (!src) continue;

      const tex = loadTexture(src);
      if (!tex) continue;

      const elRect = el.getBoundingClientRect();
      const elW = elRect.width || 1;
      const elH = elRect.height || 1;

      const imgEl = images.get(src);
      const natAR = imgEl && imgEl.naturalWidth && imgEl.naturalHeight
        ? imgEl.naturalWidth / imgEl.naturalHeight : 1;
      const contAR = elW / elH;

      // Contain-fit logic (OG exact)
      let drawW: number, drawH: number;
      if (contAR > natAR) {
        drawH = elH;
        drawW = natAR * drawH;
      } else {
        drawW = elW;
        drawH = drawW / natAR;
      }

      // Center within container
      const drawX = elRect.left + (elW - drawW) * 0.5 - canvasRect.left;
      const drawY = elRect.top + (elH - drawH) * 0.5 - canvasRect.top;
      const drawR = drawX + drawW;
      const drawB = drawY + drawH;

      // Convert to canvas pixel coords
      const cw = canvas.width;
      const ch = canvas.height;
      const crw = canvasRect.width || 1;
      const crh = canvasRect.height || 1;
      const px0 = drawX * (cw / crw);
      const px1 = drawR * (cw / crw);
      const py0 = drawY * (ch / crh);
      const py1 = drawB * (ch / crh);

      // Find title for this item (for cursor mapping)
      let cursorRef = elRect;
      const parentItem = el.closest('.work-content-item');
      if (parentItem && titles.length > 0) {
        const match = titles.filter(t => parentItem.contains(t));
        if (match.length > 0) cursorRef = match[0].getBoundingClientRect();
      }

      // Cursor normalized to title bounds
      const cx = (window as any).__workCanvasCursorX || cursor.x || 0;
      const cy = (window as any).__workCanvasCursorY || cursor.y || 0;
      const normCX = (cx - cursorRef.left) / (cursorRef.width || 1);
      const normCY = 1 - (cy - cursorRef.top) / (cursorRef.height || 1);
      const clampCX = Math.max(0, Math.min(1, normCX));
      const clampCY = Math.max(0, Math.min(1, normCY));

      // 3D perspective keystone projection (OG exact)
      const tiltX = (clampCX - 0.5) * 2;
      const tiltY = (clampCY - 0.5) * 2;
      const rotY = -tiltX * maxTiltAngle;
      const rotX = tiltY * maxTiltAngle;

      const midX = (px0 + px1) * 0.5;
      const midY = (py0 + py1) * 0.5;

      function project(px: number, py: number): { ndcX: number; ndcY: number } {
        const dx = px - midX;
        const dy = py - midY;
        const radX = rotX * Math.PI / 180;
        const radY = rotY * Math.PI / 180;
        const cosY = Math.cos(radY), sinY = Math.sin(radY);
        const cosX = Math.cos(radX), sinX = Math.sin(radX);
        const rx = dx * cosY;
        const rz = -dx * sinY;
        const ry = dy * cosX - rz * sinX;
        const rz2 = dy * sinX + rz * cosX;
        const perspective = 800;
        const scale = perspective - rz2 !== 0 ? perspective / (perspective - rz2) : 1;
        const sx = rx * scale + midX;
        const sy = ry * scale + midY;
        return { ndcX: (sx / cw) * 2 - 1, ndcY: 1 - (sy / ch) * 2 };
      }

      const bl = project(px0, py1);
      const br = project(px1, py1);
      const tl = project(px0, py0);
      const tr = project(px1, py0);

      const verts = new Float32Array([
        bl.ndcX, bl.ndcY, br.ndcX, br.ndcY, tl.ndcX, tl.ndcY,
        tl.ndcX, tl.ndcY, br.ndcX, br.ndcY, tr.ndcX, tr.ndcY,
      ]);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);

      gl.useProgram(program);

      // Uniforms
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const uTex = gl.getUniformLocation(program, 'uTexture');
      if (uTex) gl.uniform1i(uTex, 0);

      const uCursor = gl.getUniformLocation(program, 'uCursor');
      const canvasCX = (cx - canvasRect.left) / crw;
      const canvasCY = 1 - (cy - canvasRect.top) / crh;
      if (uCursor) gl.uniform2f(uCursor, canvasCX, canvasCY);

      const uStr = gl.getUniformLocation(program, 'uStrength');
      if (uStr) gl.uniform1f(uStr, strength);

      const uRgb = gl.getUniformLocation(program, 'uRgbShift');
      if (uRgb) gl.uniform1f(uRgb, rgbShift);

      const opacity = opacities.get(src) || 0;
      const uOpac = gl.getUniformLocation(program, 'uOpacity');
      if (uOpac) gl.uniform1f(uOpac, opacity);

      const offset = offsets.get(src) || { x: 0, y: 0 };
      const uEntrance = gl.getUniformLocation(program, 'uEntranceOffset');
      if (uEntrance) gl.uniform2f(uEntrance, offset.x / cw * 2, -(offset.y / ch * 2));

      // Scroll velocity
      let scrollVel = 0;
      try {
        const velStr = window.getComputedStyle(el).getPropertyValue('--scroll-vel') || '0';
        scrollVel = parseFloat(velStr) || 0;
      } catch {}
      const uScroll = gl.getUniformLocation(program, 'uScroll');
      if (uScroll) gl.uniform1f(uScroll, scrollVel);

      const uMagnet = gl.getUniformLocation(program, 'uMagnetOffset');
      if (uMagnet) gl.uniform2f(uMagnet, 0, 0);

      // Data texture (displacement map)
      const dt = dataTextures.get(src);
      const uDataTex = gl.getUniformLocation(program, 'uDataTexture');
      if (dt && uDataTex) {
        const data = dt.data;
        for (let j = 0; j < data.length; j++) data[j] *= 0.92; // decay

        const eRect = el.getBoundingClientRect();
        const cxLocal = (cx - eRect.left) / (eRect.width || 1);
        const cyLocal = 1 - (cy - eRect.top) / (eRect.height || 1);

        if (cxLocal >= 0 && cxLocal <= 1 && cyLocal >= 0 && cyLocal <= 1) {
          const pcx = (prevCursor.x - eRect.left) / (eRect.width || 1);
          const pcy = 1 - (prevCursor.y - eRect.top) / (eRect.height || 1);
          const ddx = cxLocal - pcx;
          const ddy = cyLocal - pcy;
          const gx = 22 * cxLocal;
          const gy = 22 * cyLocal;
          for (let ty = 0; ty < 22; ty++) {
            for (let tx = 0; tx < 22; tx++) {
              const dist2 = (gx - tx) ** 2 + (gy - ty) ** 2;
              if (dist2 < 6.97) {
                const idx = 4 * (tx + 22 * ty);
                const falloff = Math.min(2.64 / Math.sqrt(Math.max(dist2, 1e-4)), 10);
                data[idx] = Math.min(1, data[idx] + 100 * strength * ddx * falloff);
                data[idx + 1] = Math.min(1, data[idx + 1] - 100 * strength * ddy * falloff);
              }
            }
          }
        }

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, dt.tex);
        gl.uniform1i(uDataTex, 1);
        try {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 22, 22, gl.RGBA, gl.FLOAT, data);
        } catch {
          const u8 = new Uint8Array(1936);
          for (let j = 0; j < 1936; j++) u8[j] = Math.max(0, Math.min(255, Math.floor(255 * data[j])));
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 22, 22, gl.RGBA, gl.UNSIGNED_BYTE, u8);
        }
      }

      // Draw
      const aPos = gl.getAttribLocation(program, 'a_position');
      const aUv = gl.getAttribLocation(program, 'a_uv');
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Consume the cursor delta once per frame (after all images): the displacement
    // force tracks ACTUAL movement, and the fluid decays to rest when the cursor stops
    // or leaves. Without this, the last delta keeps pumping every frame and the
    // displacement never clears (lingering "scramble" after exiting).
    prevCursor.x = cursor.x;
    prevCursor.y = cursor.y;
  }

  rafId = requestAnimationFrame(render);

  // Cleanup
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (entranceRaf) cancelAnimationFrame(entranceRaf);
    resizeObs.disconnect();
    anchorEl.removeEventListener('mousemove', onMouseMove);
    anchorEl.removeEventListener('mouseenter', onMouseMove);
    try {
      const ext = gl!.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } catch {}
    canvas.remove();
  };
}
