/**
 * ASCII Loading Screen — faithful port of the OG LML loading screen.
 *
 * Architecture:
 *   TextCanvas  – renders Chinese text onto a 2D canvas with noise
 *   AsciiFilter – converts a WebGL renderer's output to ASCII chars in a <pre>
 *   Mat4        – minimal 4x4 matrix math (perspective, lookAt, rotate)
 *   CanvAscii   – ties everything together: WebGL plane + text texture + ASCII filter
 */

// ---------------------------------------------------------------------------
// Device pixel ratio constant (OG: `let l = window.devicePixelRatio`)
// ---------------------------------------------------------------------------
const DPR: number = window.devicePixelRatio;

// ---------------------------------------------------------------------------
// Mat4 — 4x4 matrix (OG: class c)
// ---------------------------------------------------------------------------
class Mat4 {
  elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }

  identity(): this {
    const e = this.elements;
    e[0] = 1; e[4] = 0; e[8] = 0;  e[12] = 0;
    e[1] = 0; e[5] = 1; e[9] = 0;  e[13] = 0;
    e[2] = 0; e[6] = 0; e[10] = 1; e[14] = 0;
    e[3] = 0; e[7] = 0; e[11] = 0; e[15] = 1;
    return this;
  }

  perspective(fov: number, aspect: number, near: number, far: number): this {
    const f = 1 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    const a = this.elements;
    a[0] = f / aspect; a[4] = 0; a[8] = 0;              a[12] = 0;
    a[1] = 0;          a[5] = f; a[9] = 0;              a[13] = 0;
    a[2] = 0;          a[6] = 0; a[10] = (far + near) * nf; a[14] = 2 * far * near * nf;
    a[3] = 0;          a[7] = 0; a[11] = -1;            a[15] = 0;
    return this;
  }

  lookAt(
    eye: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    up: { x: number; y: number; z: number },
  ): this {
    let zx = eye.x - target.x;
    let zy = eye.y - target.y;
    let zz = eye.z - target.z;
    let len = 1 / Math.sqrt(zx * zx + zy * zy + zz * zz);
    zx *= len; zy *= len; zz *= len;

    let xx = up.y * zz - up.z * zy;
    let xy = up.z * zx - up.x * zz;
    let xz = up.x * zy - up.y * zx;
    len = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (len) { len = 1 / len; xx *= len; xy *= len; xz *= len; }
    else { xx = 0; xy = 0; xz = 0; }

    let yx = zy * xz - zz * xy;
    let yy = zz * xx - zx * xz;
    let yz = zx * xy - zy * xx;
    len = Math.sqrt(yx * yx + yy * yy + yz * yz);
    if (len) { len = 1 / len; yx *= len; yy *= len; yz *= len; }
    else { yx = 0; yy = 0; yz = 0; }

    const e = this.elements;
    e[0] = xx; e[4] = yx; e[8] = zx;  e[12] = 0;
    e[1] = xy; e[5] = yy; e[9] = zy;  e[13] = 0;
    e[2] = xz; e[6] = yz; e[10] = zz; e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
    this.translate(-eye.x, -eye.y, -eye.z);
    return this;
  }

  translate(x: number, y: number, z: number): this {
    const e = this.elements;
    e[12] = e[0] * x + e[4] * y + e[8] * z + e[12];
    e[13] = e[1] * x + e[5] * y + e[9] * z + e[13];
    e[14] = e[2] * x + e[6] * y + e[10] * z + e[14];
    e[15] = e[3] * x + e[7] * y + e[11] * z + e[15];
    return this;
  }

  rotateX(angle: number): this {
    const t = this.elements;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const a10 = t[4], a11 = t[5], a12 = t[6], a13 = t[7];
    const a20 = t[8], a21 = t[9], a22 = t[10], a23 = t[11];
    t[4] = a10 * c + a20 * s;
    t[5] = a11 * c + a21 * s;
    t[6] = a12 * c + a22 * s;
    t[7] = a13 * c + a23 * s;
    t[8] = a20 * c - a10 * s;
    t[9] = a21 * c - a11 * s;
    t[10] = a22 * c - a12 * s;
    t[11] = a23 * c - a13 * s;
    return this;
  }

  rotateY(angle: number): this {
    const t = this.elements;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const a00 = t[0], a01 = t[1], a02 = t[2], a03 = t[3];
    const a20 = t[8], a21 = t[9], a22 = t[10], a23 = t[11];
    t[0] = a00 * c - a20 * s;
    t[1] = a01 * c - a21 * s;
    t[2] = a02 * c - a22 * s;
    t[3] = a03 * c - a23 * s;
    t[8] = a00 * s + a20 * c;
    t[9] = a01 * s + a21 * c;
    t[10] = a02 * s + a22 * c;
    t[11] = a03 * s + a23 * c;
    return this;
  }
}

// ---------------------------------------------------------------------------
// compileShader — helper (OG: function u)
// ---------------------------------------------------------------------------
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }
  gl.deleteProgram(prog);
  return null;
}

// ---------------------------------------------------------------------------
// TextCanvas — renders text onto a canvas with noise (OG: class m)
// ---------------------------------------------------------------------------
class TextCanvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;
  txt: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  font: string;

  constructor(
    text: string,
    opts: { fontSize?: number; fontFamily?: string; color?: string } = {},
  ) {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.txt = text;
    this.fontSize = opts.fontSize ?? 200;
    this.fontFamily = opts.fontFamily ?? 'IBM Plex Mono';
    this.color = opts.color ?? '#fdf9f3';
    this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
  }

  resize(): void {
    if (!this.context) return;
    this.context.font = this.font;
    const lines = this.txt.split(/\r?\n/);
    let maxW = 0;
    let lineH = Math.ceil(1.2 * this.fontSize);
    for (let r = 0; r < lines.length; r++) {
      const metrics = this.context.measureText(lines[r]);
      const w = Math.ceil(metrics.width);
      if (w > maxW) maxW = w;
      if (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent) {
        lineH = Math.ceil(
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
        );
      }
    }
    this.canvas.width = maxW + 20;
    this.canvas.height = lines.length * lineH + 20;
  }

  async render(): Promise<void> {
    if (!this.context) return;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Temp canvas for text rendering + noise
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.canvas.width;
    tmpCanvas.height = this.canvas.height;
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    if (!tmpCtx) return;

    tmpCtx.fillStyle = this.color;
    tmpCtx.font = this.font;

    const lines = this.txt.split(/\r?\n/);
    let lineH = Math.ceil(1.2 * this.fontSize);
    const firstMetrics = tmpCtx.measureText(lines[0] || '');
    if (
      firstMetrics.actualBoundingBoxAscent &&
      firstMetrics.actualBoundingBoxDescent
    ) {
      lineH = Math.ceil(
        firstMetrics.actualBoundingBoxAscent +
          firstMetrics.actualBoundingBoxDescent,
      );
    }

    for (let i = 0; i < lines.length; i++) {
      const m = tmpCtx.measureText(lines[i]);
      const y = 10 + i * lineH + (m.actualBoundingBoxAscent || 0.8 * this.fontSize);
      tmpCtx.fillText(lines[i], 10, y);
    }

    // Apply sine/cosine noise to pixel colors
    const imgData = tmpCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] > 128) {
        const noise = 1 + (Math.sin(0.001 * i) + Math.cos(0.002 * i)) * 0.1;
        data[i] = Math.max(0, Math.min(255, r * noise));
        data[i + 1] = Math.max(0, Math.min(255, g * noise));
        data[i + 2] = Math.max(0, Math.min(255, b * noise));
      }
    }
    this.context.putImageData(imgData, 0, 0);
  }

  get width(): number {
    return this.canvas.width;
  }
  get height(): number {
    return this.canvas.height;
  }
  get texture(): HTMLCanvasElement {
    return this.canvas;
  }
}

// ---------------------------------------------------------------------------
// Renderer interface — duck-types what AsciiFilter expects
// ---------------------------------------------------------------------------
interface RendererLike {
  domElement: HTMLCanvasElement;
  render: () => void;
  setSize: (w: number, h: number) => void;
}

// ---------------------------------------------------------------------------
// AsciiFilter — converts WebGL output to ASCII characters (OG: class d)
// ---------------------------------------------------------------------------
class AsciiFilter {
  width = 0;
  height = 0;
  center = { x: 0, y: 0 };
  mouse = { x: 0, y: 0 };
  cols = 0;
  rows = 0;
  deg = 0;
  invert: boolean;
  fontSize: number;
  fontFamily: string;
  charset: string;
  asciiColor: string;

  renderer: RendererLike;
  domElement: HTMLDivElement;
  pre: HTMLPreElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null;

  constructor(
    renderer: RendererLike,
    opts: {
      fontSize?: number;
      fontFamily?: string;
      charset?: string;
      invert?: boolean;
      asciiColor?: string;
    } = {},
  ) {
    this.renderer = renderer;

    this.domElement = document.createElement('div');
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0';
    this.domElement.style.left = '0';
    this.domElement.style.width = '100%';
    this.domElement.style.height = '100%';
    this.domElement.style.pointerEvents = 'auto';

    this.pre = document.createElement('pre');
    this.domElement.appendChild(this.pre);

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.pointerEvents = 'none';
    this.domElement.appendChild(this.canvas);

    this.invert = opts.invert ?? false;
    this.fontSize = opts.fontSize ?? 12;
    this.fontFamily =
      opts.fontFamily ??
      "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace, sans-serif";
    this.charset =
      opts.charset ??
      " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkmlm*#ML&8%L@$";
    this.asciiColor = opts.asciiColor ?? '#ffffff';

    if (this.context) {
      this.context.imageSmoothingEnabled = false;
    }

    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h);
    this.reset();
    this.center = { x: w / 2, y: h / 2 };
    this.mouse = { x: this.center.x, y: this.center.y };
  }

  reset(): void {
    if (!this.context) return;
    this.context.font = `${this.fontSize}px ${this.fontFamily}`;
    const charW = this.context.measureText('A').width;
    this.cols = Math.floor(this.width / (this.fontSize * (charW / this.fontSize)));
    this.rows = Math.floor(this.height / this.fontSize);
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;

    const s = this.pre.style;
    s.fontFamily = this.fontFamily;
    s.fontVariantLigatures = 'none';
    s.fontFeatureSettings = '"liga" 0, "calt" 0';
    s.setProperty('font-family', this.fontFamily, 'important');
    s.setProperty('font-size', `${this.fontSize}px`, 'important');
    s.margin = '0';
    s.padding = '0';
    s.lineHeight = '1em';
    s.position = 'absolute';
    s.left = '0';
    s.top = '0';
    s.zIndex = '9';
    s.backgroundAttachment = 'fixed';
    s.mixBlendMode = 'difference';
    s.color = this.asciiColor;
    s.pointerEvents = 'none';
    // Force style flush (OG does this)
    this.pre.setAttribute('style', this.pre.getAttribute('style') + ';');
  }

  render(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!this.context) return;
    this.context.clearRect(0, 0, w, h);
    this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    this.asciify(this.context, w, h);
    this.hue();
  }

  onMouseMove(e: MouseEvent): void {
    this.mouse = { x: e.clientX * DPR, y: e.clientY * DPR };
  }

  get dx(): number {
    return this.mouse.x - this.center.x;
  }
  get dy(): number {
    return this.mouse.y - this.center.y;
  }

  hue(): void {
    const angle = (180 * Math.atan2(this.dy, this.dx)) / Math.PI;
    this.deg += (angle - this.deg) * 0.075;
    this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
  }

  asciify(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const pixels = ctx.getImageData(0, 0, w, h).data;
    let result = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = 4 * x + 4 * y * w;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];
        if (a === 0) {
          result += ' ';
          continue;
        }
        let brightness = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
        if (a > 0) {
          brightness = Math.max(
            0,
            Math.min(1, brightness + (Math.sin(0.1 * x) + Math.cos(0.1 * y)) * 0.1),
          );
        }
        let charIdx = Math.floor((1 - brightness) * (this.charset.length - 1));
        if (this.invert) {
          charIdx = this.charset.length - charIdx - 1;
        }
        result += this.charset[charIdx];
      }
      result += '\n';
    }
    this.pre.innerHTML = result;
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}

// ---------------------------------------------------------------------------
// Shaders (OG: embedded in class h / initWebGL)
// ---------------------------------------------------------------------------
const VERT_SHADER = `
precision mediump float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main() {
    vUv = uv;
    float time = uTime * 5.;
    float waveFactor = uEnableWaves;
    vec3 transformed = position;
    transformed.x += sin(time + position.y) * 0.5 * waveFactor;
    transformed.y += cos(time + position.z) * 0.15 * waveFactor;
    transformed.z += sin(time + position.x) * waveFactor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const FRAG_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    vec2 pos = vUv;
    pos.y = 1.0 - pos.y;
    vec4 originalColor = texture2D(uTexture, pos);
    gl_FragColor = originalColor;
}
`;

// ---------------------------------------------------------------------------
// CanvAscii — the full WebGL+ASCII pipeline (OG: class h)
// ---------------------------------------------------------------------------

interface BoundsCache {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

class CanvAscii {
  // Config
  textString: string;
  asciiFontSize: number;
  asciiFontFamily: string;
  textFontSize: number;
  textFontFamily: string;
  textColor: string;
  asciiColor: string;
  planeBaseHeight: number;
  enableWaves: boolean;

  // State
  container: HTMLElement;
  width: number;
  height: number;
  mouse = { x: 0, y: 0 };
  center = { x: 0, y: 0 };
  isActive = false;
  boundsCache: BoundsCache | null = null;
  rafId: number | null = null;
  lastUpdateTime = 0;
  interactionPadding = 200;
  maxRotationAngle = 45;
  rotationX = 0;
  rotationY = 0;
  isInitialized = false;
  isDestroyed = false;
  animationFrameId = 0;

  // WebGL
  canvas!: HTMLCanvasElement;
  gl!: WebGLRenderingContext;
  program!: WebGLProgram;
  vertexBuffer!: WebGLBuffer;
  indexBuffer!: WebGLBuffer;
  texture!: WebGLTexture;

  // Sub-objects
  textCanvas!: TextCanvas;
  filter!: AsciiFilter;
  projectionMatrix: Mat4;
  modelViewMatrix: Mat4;

  // Bound handlers
  handleMouseMove: (e: MouseEvent | TouchEvent) => void;
  handleResize: () => void;

  constructor(
    opts: {
      text: string;
      asciiFontSize: number;
      asciiFontFamily?: string;
      textFontSize: number;
      textFontFamily?: string;
      textColor: string;
      asciiColor?: string;
      planeBaseHeight: number;
      enableWaves: boolean;
    },
    container: HTMLElement,
    width: number,
    height: number,
  ) {
    this.textString = opts.text;
    this.asciiFontSize = opts.asciiFontSize;
    this.asciiFontFamily = opts.asciiFontFamily ?? 'monospace';
    this.textFontSize = opts.textFontSize;
    this.textFontFamily = opts.textFontFamily ?? 'IBM Plex Mono';
    this.textColor = opts.textColor;
    this.asciiColor = opts.asciiColor ?? '#ffffff';
    this.planeBaseHeight = opts.planeBaseHeight;
    this.enableWaves = opts.enableWaves;
    this.container = container;
    this.width = width;
    this.height = height;

    this.projectionMatrix = new Mat4();
    this.modelViewMatrix = new Mat4();

    this.updateBounds = this.updateBounds.bind(this);

    this.handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.boundsCache) return;
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        const bounds = this.boundsCache!;
        const pointer = 'touches' in e ? e.touches[0] : (e as MouseEvent);
        const dx = Math.abs(bounds.centerX - pointer.clientX);
        const dy = Math.abs(bounds.centerY - pointer.clientY);
        if (
          dx < bounds.width / 2 + this.interactionPadding &&
          dy < bounds.height / 2 + this.interactionPadding
        ) {
          if (this.isActive) {
            this.mouse = {
              x: pointer.clientX - bounds.left,
              y: pointer.clientY - bounds.top,
            };
          } else {
            this.isActive = true;
            this.updateBounds();
            if (this.boundsCache) {
              const b2 = this.boundsCache;
              const dx2 = Math.abs(b2.centerX - pointer.clientX);
              const dy2 = Math.abs(b2.centerY - pointer.clientY);
              if (
                dx2 < b2.width / 2 + this.interactionPadding &&
                dy2 < b2.height / 2 + this.interactionPadding
              ) {
                this.mouse = {
                  x: pointer.clientX - b2.left,
                  y: pointer.clientY - b2.top,
                };
              }
            }
          }
        } else if (this.isActive) {
          this.isActive = false;
          this.mouse = { x: bounds.width / 2, y: bounds.height / 2 };
        }
      });
    };

    this.handleResize = () => {
      this.updateBounds();
    };

    this.init();
  }

  updateBounds(): void {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.boundsCache = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
  }

  async init(): Promise<void> {
    await this.initTextCanvas();
    this.initWebGL();
    this.setRenderer();
    this.isInitialized = true;
  }

  async initTextCanvas(): Promise<void> {
    this.textCanvas = new TextCanvas(this.textString, {
      fontSize: this.textFontSize,
      fontFamily: this.textFontFamily,
      color: this.textColor,
    });
    this.textCanvas.resize();
    await this.textCanvas.render();
  }

  initWebGL(): void {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const gl = canvas.getContext('webgl', { antialias: false, alpha: true });
    if (!gl) throw new Error('WebGL not supported');
    this.canvas = canvas;
    this.gl = gl;

    const program = createProgram(gl, VERT_SHADER, FRAG_SHADER);
    if (!program) throw new Error('Failed to create shader program');
    this.program = program;
    gl.useProgram(this.program);

    // Build grid geometry (37x37 vertices, 36x36 quads)
    const verts: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= 36; row++) {
      for (let col = 0; col <= 36; col++) {
        const u = col / 36;
        const v = row / 36;
        verts.push(2 * u - 1, 2 * v - 1, 0, u, v);
      }
    }
    for (let row = 0; row < 36; row++) {
      for (let col = 0; col < 36; col++) {
        const a = 37 * row + col;
        const b = a + 1;
        const c = (row + 1) * 37 + col;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'position');
    const uvLoc = gl.getAttribLocation(this.program, 'uv');
    gl.enableVertexAttribArray(posLoc);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);

    this.projectionMatrix.perspective(Math.PI / 4, this.width / this.height, 1, 1000);
    this.modelViewMatrix.lookAt(
      { x: 0, y: 0, z: 30 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );

    this.initWebGLTexture();
    this.updateVertexBuffer();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  initWebGLTexture(): void {
    const gl = this.gl;
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
      this.textCanvas.texture,
    );
    const texLoc = gl.getUniformLocation(this.program, 'uTexture');
    gl.uniform1i(texLoc, 0);
    const waveLoc = gl.getUniformLocation(this.program, 'uEnableWaves');
    gl.uniform1f(waveLoc, this.enableWaves ? 1 : 0);
  }

  updateVertexBuffer(): void {
    const aspect = this.textCanvas.width / this.textCanvas.height;
    const h = this.planeBaseHeight;
    const w = h * aspect;
    const verts: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= 36; row++) {
      for (let col = 0; col <= 36; col++) {
        const u = col / 36;
        const v = row / 36;
        const x = (u - 0.5) * w;
        const y = (v - 0.5) * h;
        verts.push(x, y, 0, u, v);
      }
    }
    for (let row = 0; row < 36; row++) {
      for (let col = 0; col < 36; col++) {
        const a = 37 * row + col;
        const b = a + 1;
        const c = (row + 1) * 37 + col;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }

  setRenderer(): void {
    if (this.isDestroyed || !this.container) return;

    const rendererLike: RendererLike = {
      domElement: this.gl.canvas as HTMLCanvasElement,
      render: () => {
        this.renderWebGL();
      },
      setSize: (w: number, h: number) => {
        (this.gl.canvas as HTMLCanvasElement).width = w;
        (this.gl.canvas as HTMLCanvasElement).height = h;
      },
    };

    this.filter = new AsciiFilter(rendererLike, {
      fontFamily: this.asciiFontFamily,
      fontSize: this.asciiFontSize,
      invert: true,
      asciiColor: this.asciiColor,
    });

    if (this.container && this.filter.domElement) {
      this.container.appendChild(this.filter.domElement);
      this.setSize(this.width, this.height);
      this.updateBounds();
      document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
      document.addEventListener('touchmove', this.handleMouseMove, { passive: true });
      window.addEventListener('resize', this.handleResize, { passive: true });
      window.addEventListener('scroll', this.handleResize, { passive: true });
    }
  }

  setSize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.projectionMatrix.perspective(Math.PI / 4, w / h, 1, 1000);
    if (this.filter) this.filter.setSize(w, h);
    this.center = { x: w / 2, y: h / 2 };
    if (this.textCanvas) this.updateVertexBuffer();
  }

  async load(): Promise<void> {
    if (!this.isInitialized) await this.init();
    this.animate();
  }

  animate(): void {
    if (this.isDestroyed) return;
    const loop = async () => {
      if (this.isDestroyed) return;
      this.animationFrameId = requestAnimationFrame(loop);
      await this.render();
    };
    loop();
  }

  renderWebGL(): void {
    if (!this.gl || !this.program) return;
    const gl = this.gl;
    gl.useProgram(this.program);

    // Re-render text canvas (for animated noise)
    this.textCanvas.render();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
      this.textCanvas.texture,
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    const posLoc = gl.getAttribLocation(this.program, 'position');
    const uvLoc = gl.getAttribLocation(this.program, 'uv');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
    }
    if (uvLoc >= 0) {
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 20, 12);
    }

    const time = 0.001 * new Date().getTime();
    const timeLoc = gl.getUniformLocation(this.program, 'uTime');
    const mouseLoc = gl.getUniformLocation(this.program, 'mouse');
    const projLoc = gl.getUniformLocation(this.program, 'projectionMatrix');
    const mvLoc = gl.getUniformLocation(this.program, 'modelViewMatrix');

    if (timeLoc) gl.uniform1f(timeLoc, Math.sin(time));
    if (mouseLoc) gl.uniform1f(mouseLoc, 1);

    const mv = new Mat4();
    mv.lookAt(
      { x: 0, y: 0, z: 30 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    mv.rotateX(this.rotationX);
    mv.rotateY(this.rotationY);

    if (projLoc) gl.uniformMatrix4fv(projLoc, false, this.projectionMatrix.elements);
    if (mvLoc) gl.uniformMatrix4fv(mvLoc, false, mv.elements);

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 7776, gl.UNSIGNED_SHORT, 0);
  }

  async render(): Promise<void> {
    if (this.isDestroyed) return;
    this.updateRotation();
    this.renderWebGL();
    if (this.filter) this.filter.render();
  }

  updateRotation(): void {
    let targetRotX = 0;
    let targetRotY = 0;
    if (this.isActive && this.boundsCache) {
      const b = this.boundsCache;
      const rx = ((this.mouse.x - b.width / 2) / (b.width / 2)) * this.maxRotationAngle;
      const ry = -((this.mouse.y - b.height / 2) / (b.height / 2)) * this.maxRotationAngle;
      targetRotY = (rx * Math.PI) / 180;
      targetRotX = (ry * Math.PI) / 180;
    }
    this.rotationX += (targetRotX - this.rotationX) * 0.1;
    this.rotationY += (targetRotY - this.rotationY) * 0.1;
  }

  clear(): void {
    const gl = this.gl;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);
  }

  dispose(): void {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.filter) {
      this.filter.dispose();
      if (this.filter.domElement?.parentNode) {
        this.filter.domElement.parentNode.removeChild(this.filter.domElement);
      }
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchmove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleResize);
    this.clear();
    if (this.gl && this.canvas) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — initAsciiLoadingScreen
// ---------------------------------------------------------------------------

export function initAsciiLoadingScreen(): Promise<void> {
  return new Promise((resolve) => {
    // Skip on repeat visits
    if (sessionStorage.getItem('lml-loaded')) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
      window.dispatchEvent(new Event('lml-loading-complete'));
      resolve();
      return;
    }

    const counterEl = document.getElementById('loading-counter');
    const progressRect = document.getElementById('logo-progress-rect');
    const loadingScreen = document.getElementById('loading-screen');
    const asciiContainer = document.getElementById('loading-ascii-container');

    if (!counterEl || !progressRect || !loadingScreen) {
      window.dispatchEvent(new Event('lml-loading-complete'));
      resolve();
      return;
    }

    // --- Initialize the ASCII text effect ---
    let asciiInstance: CanvAscii | null = null;

    if (asciiContainer) {
      const rect = asciiContainer.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;

      asciiInstance = new CanvAscii(
        {
          text: '进入中',
          asciiFontSize: 9,
          asciiFontFamily:
            "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace, sans-serif",
          textFontSize: 14,
          textFontFamily: 'IBM Plex Mono',
          textColor: '#3C3C3C',
          asciiColor: '#222',
          planeBaseHeight: window.innerWidth < 768 ? 9 : 12,
          enableWaves: true,
        },
        asciiContainer,
        w,
        h,
      );
      asciiInstance.load();

      // Handle resize
      const ro = new ResizeObserver((entries) => {
        if (!entries[0] || !asciiInstance) return;
        const { width: rw, height: rh } = entries[0].contentRect;
        if (rw > 0 && rh > 0 && asciiInstance.filter) {
          asciiInstance.setSize(rw, rh);
        }
      });
      ro.observe(asciiContainer);
    }

    // --- Loading counter & logo progress ---
    const totalLogoWidth = 467; // SVG viewBox width
    const startTime = performance.now();

    // Build an odometer: 3 columns (hundreds, tens, ones), each a vertical strip of
    // digits that rolls. The ones/tens roll continuously (fractional translate); the
    // hundreds digit flips 0→1 at the end (CSS transition).
    function buildOdometer(el: HTMLElement): HTMLElement[] {
      el.textContent = '';
      el.classList.add('odometer');
      const strips: HTMLElement[] = [];
      for (let c = 0; c < 3; c++) {
        const col = document.createElement('span');
        col.className = 'odo-col';
        const strip = document.createElement('span');
        strip.className = 'odo-strip';
        for (let d = 0; d <= 10; d++) {
          const digit = document.createElement('span');
          digit.className = 'odo-digit';
          digit.textContent = String(d % 10);
          strip.appendChild(digit);
        }
        col.appendChild(strip);
        el.appendChild(col);
        strips.push(strip);
      }
      return strips; // [hundreds, tens, ones]
    }

    const odo = buildOdometer(counterEl!);
    // Geared odometer: the ones wheel rolls continuously; the tens wheel only rolls
    // during the ones' 9→0 transition; the hundreds only during 99→100. (A plain
    // value/10 rolls the higher wheels too early, which reads as stalling near 98.)
    function setOdometer(value: number): void {
      const onesFrac = value % 10;                       // 0..10
      const tensPos = Math.floor(value / 10) + (onesFrac >= 9 ? onesFrac - 9 : 0);
      const within = value % 100;
      const hunsPos = Math.floor(value / 100) + (within >= 99 ? within - 99 : 0);
      odo[2].style.transform = `translateY(-${onesFrac}em)`;
      odo[1].style.transform = `translateY(-${tensPos}em)`;
      odo[0].style.transform = `translateY(-${hunsPos}em)`;
    }

    // Phased timing (OG-like): rise quickly to 98, hold there, then roll 98→99→100.
    const RISE = 1500;   // 0 → 98
    const HOLD = 500;    // pause at 98
    const FINISH = 600;  // 98 → 100
    const totalDur = RISE + HOLD + FINISH;
    const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

    function updateCounter(now: number): void {
      const elapsed = now - startTime;

      let value: number;
      if (elapsed < RISE) {
        value = easeOut(elapsed / RISE) * 98;
      } else if (elapsed < RISE + HOLD) {
        value = 98; // pause at 98 (OG behavior)
      } else if (elapsed < totalDur) {
        value = 98 + easeOut((elapsed - RISE - HOLD) / FINISH) * 2; // 98 → 100
      } else {
        value = 100;
      }

      setOdometer(value);
      progressRect!.setAttribute('width', String((value / 100) * totalLogoWidth));

      if (elapsed < totalDur) {
        requestAnimationFrame(updateCounter);
      } else {
        setOdometer(100);
        progressRect!.setAttribute('width', String(totalLogoWidth));

        // Wait, then dismiss
        setTimeout(() => {
          loadingScreen!.classList.add('dismissed');

          setTimeout(() => {
            loadingScreen!.style.display = 'none';
            sessionStorage.setItem('lml-loaded', '1');

            // Clean up the ASCII instance
            if (asciiInstance) {
              asciiInstance.dispose();
              asciiInstance = null;
            }

            window.dispatchEvent(new Event('lml-loading-complete'));
            resolve();
          }, 600);
        }, 300);
      }
    }

    requestAnimationFrame(updateCounter);
  });
}
