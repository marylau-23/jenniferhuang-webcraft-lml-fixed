// Ported from OG layout.js — WebGL metallic chrome paint shader
// Renders logo3.svg with liquid metallic effect (the 亮 character)

const VERT = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 vUv;
void main() {
    vUv = .5 * (a_position + 1.);
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m*m;
    m = m*m;
    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130. * dot(m, g);
}
vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    float scale_factor = 1.;
    img_uv *= scale_factor;
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}
vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;
    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));
    return ch;
}
float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}
void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;
    float diagonal = uv.x - uv.y;
    float t = .001 * u_time;
    vec2 img_uv = get_img_uv();
    vec4 img = texture(u_image_texture, img_uv);
    vec3 color = vec3(0.);
    float opacity = 1.;
    vec3 color1 = vec3(.98, 0.98, 1.);
    vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));
    float edge = img.r;
    vec2 grad_uv = uv;
    grad_uv -= .5;
    float dist = length(grad_uv + vec2(0., .2 * diagonal));
    grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);
    float bulge = pow(1.8 * dist, 1.2);
    bulge = 1. - bulge;
    bulge *= pow(uv.y, .3);
    float cycle_width = u_patternScale;
    float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
    float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
    float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);
    float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
    float thin_strip_2_width = cycle_width * thin_strip_2_ratio;
    opacity = 1. - smoothstep(.9 - .5 * u_edge, 1. - .5 * u_edge, edge);
    opacity *= get_img_frame_alpha(img_uv, 0.01);
    float noise = snoise(uv - t);
    edge += (1. - edge) * u_liquid * noise;
    float refr = 0.;
    refr += (1. - bulge);
    refr = clamp(refr, 0., 1.);
    float dir = grad_uv.x;
    dir += diagonal;
    dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));
    bulge *= clamp(pow(uv.y, .1), .3, 1.);
    dir *= (.1 + (1.1 - edge) * bulge);
    dir *= smoothstep(1., .7, edge);
    dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
    dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));
    dir *= (.5 + .5 * pow(uv.y, 2.));
    dir *= cycle_width;
    dir -= t;
    float refr_r = refr;
    refr_r += .03 * bulge * noise;
    float refr_b = 1.3 * refr;
    refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
    refr_r -= diagonal;
    refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
    refr_b -= .2 * edge;
    refr_r *= u_refraction;
    refr_b *= u_refraction;
    vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
    w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
    float stripe_r = mod(dir + refr_r, 1.);
    float r = get_color_channel(color1.r, color2.r, stripe_r, w, 0.02 + .03 * u_refraction * bulge, bulge);
    float stripe_g = mod(dir, 1.);
    float g = get_color_channel(color1.g, color2.g, stripe_g, w, 0.01 / (1. - diagonal), bulge);
    float stripe_b = mod(dir - refr_b, 1.);
    float b = get_color_channel(color1.b, color2.b, stripe_b, w, .01, bulge);
    color = vec3(r, g, b);
    color *= opacity;
    fragColor = vec4(color, opacity);
}`;

interface PaintParams {
  edge: number;
  patternBlur: number;
  patternScale: number;
  refraction: number;
  speed: number;
  liquid: number;
}

export function initMetallicPaint(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  params: PaintParams = { edge: 0, patternBlur: 0.005, patternScale: 2, refraction: 0.015, speed: 0.3, liquid: 0.07 }
): (() => void) | null {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) { console.error('[MetallicPaint] WebGL2 context failed'); return null; }
  console.log('[MetallicPaint] WebGL2 context created, imageData:', imageData.width, 'x', imageData.height);

  function compileShader(src: string, type: number): WebGLShader | null {
    const s = gl!.createShader(type);
    if (!s) return null;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      console.error('Shader error:', gl!.getShaderInfoLog(s));
      gl!.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compileShader(VERT, gl.VERTEX_SHADER);
  const fs = compileShader(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }

  gl.useProgram(prog);

  const locs = {
    u_image_texture: gl.getUniformLocation(prog, 'u_image_texture'),
    u_time: gl.getUniformLocation(prog, 'u_time'),
    u_ratio: gl.getUniformLocation(prog, 'u_ratio'),
    u_img_ratio: gl.getUniformLocation(prog, 'u_img_ratio'),
    u_patternScale: gl.getUniformLocation(prog, 'u_patternScale'),
    u_refraction: gl.getUniformLocation(prog, 'u_refraction'),
    u_edge: gl.getUniformLocation(prog, 'u_edge'),
    u_patternBlur: gl.getUniformLocation(prog, 'u_patternBlur'),
    u_liquid: gl.getUniformLocation(prog, 'u_liquid'),
  };

  // Set params
  gl.uniform1f(locs.u_edge, params.edge);
  gl.uniform1f(locs.u_patternBlur, params.patternBlur);
  gl.uniform1f(locs.u_patternScale, params.patternScale);
  gl.uniform1f(locs.u_refraction, params.refraction);
  gl.uniform1f(locs.u_liquid, params.liquid);

  // Upload image texture
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
  gl.uniform1i(locs.u_image_texture, 0);

  // Quad buffer
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Set ratio
  const imgRatio = imageData.width / imageData.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = 1000 * dpr;
  canvas.height = 1000 * dpr;
  gl.viewport(0, 0, canvas.height, canvas.height);
  gl.uniform1f(locs.u_ratio, 1);
  gl.uniform1f(locs.u_img_ratio, imgRatio);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Animation loop
  let time = 0;
  let lastFrame = performance.now();
  let rafId: number;

  function render(now: number) {
    const dt = now - lastFrame;
    lastFrame = now;
    time += dt * params.speed;
    gl!.uniform1f(locs.u_time, time);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    rafId = requestAnimationFrame(render);
  }
  rafId = requestAnimationFrame(render);

  // Handle resize
  function onResize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 1000 * d;
    canvas.height = 1000 * d;
    gl!.viewport(0, 0, canvas.height, canvas.height);
    gl!.uniform1f(locs.u_ratio, 1);
    gl!.uniform1f(locs.u_img_ratio, imgRatio);
  }
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', onResize);
    gl!.deleteTexture(tex);
    gl!.deleteProgram(prog);
    gl!.deleteBuffer(buf);
  };
}

export async function loadSvgAsImageData(url: string): Promise<ImageData | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const file = new File([blob], url, { type: blob.type });
    return await processImageToDistanceField(file);
  } catch (e) {
    console.warn('Failed to load SVG as imageData:', e);
    return null;
  }
}

function processImageToDistanceField(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (file.type === 'image/svg+xml') { img.width = 1000; img.height = 1000; }
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > 1000 || h > 1000 || w < 500 || h < 500) {
        if (w > h) { if (w > 1000) { h = Math.round(1000 * h / w); w = 1000; } else if (w < 500) { h = Math.round(500 * h / w); w = 500; } }
        else { if (h > 1000) { w = Math.round(1000 * w / h); h = 1000; } else if (h < 500) { w = Math.round(500 * w / h); h = 500; } }
      }

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w; srcCanvas.height = h;
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.drawImage(img, 0, 0, w, h);
      const srcData = srcCtx.getImageData(0, 0, w, h).data;

      // Identify filled pixels
      const filled = new Array(w * h).fill(false);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = srcData[i], g = srcData[i + 1], b = srcData[i + 2], a = srcData[i + 3];
          filled[y * w + x] = (r !== 255 || g !== 255 || b !== 255 || a !== 255) && a !== 0;
        }
      }

      // Find edge pixels
      const isEdge = new Array(w * h).fill(false);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!filled[y * w + x]) continue;
          let edge = false;
          for (let dy = -1; dy <= 1 && !edge; dy++) {
            for (let dx = -1; dx <= 1 && !edge; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h || !filled[ny * w + nx]) edge = true;
            }
          }
          if (edge) isEdge[y * w + x] = true;
        }
      }

      // Distance field diffusion (50 iterations)
      const dist = new Float32Array(w * h).fill(0);
      const temp = new Float32Array(w * h).fill(0);
      const getVal = (x: number, y: number, buf: Float32Array) =>
        x < 0 || x >= w || y < 0 || y >= h || !filled[y * w + x] ? 0 : buf[y * w + x];

      for (let iter = 0; iter < 50; iter++) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (!filled[idx] || isEdge[idx]) { temp[idx] = 0; continue; }
            const neighbors = getVal(x + 1, y, dist) + getVal(x - 1, y, dist) + getVal(x, y + 1, dist) + getVal(x, y - 1, dist);
            temp[idx] = (0.01 + neighbors) / 4;
          }
        }
        dist.set(temp);
      }

      // Find max distance
      let maxDist = 0;
      for (let i = 0; i < w * h; i++) if (dist[i] > maxDist) maxDist = dist[i];

      // Convert to imageData
      const outCanvas = document.createElement('canvas');
      outCanvas.width = w; outCanvas.height = h;
      const outCtx = outCanvas.getContext('2d')!;
      const outData = outCtx.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const pi = i * 4;
        if (filled[i]) {
          const val = 255 * (1 - Math.pow(dist[i] / maxDist, 2));
          outData.data[pi] = val;
          outData.data[pi + 1] = val;
          outData.data[pi + 2] = val;
          outData.data[pi + 3] = 255;
        } else {
          outData.data[pi] = 255;
          outData.data[pi + 1] = 255;
          outData.data[pi + 2] = 255;
          outData.data[pi + 3] = 255;
        }
      }
      resolve(outData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
