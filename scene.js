// 2.5D island scene: painted backgrounds (bg/*.jpg) + sprite characters (sprites/N/*.png).
// Same API as before: createScene(container, { onPersonClick }) -> { setPeople, setTimeMode, getTimePhase, dispose }
// All positions are in % of the 3:2 painted world, measured from bg/day.jpg.

const ISLANDS = [
  { cx: 29, cy: 63, rx: 12.5, ry: 8.5 },  // 待聯繫島 (left) – open lawn only
  { cx: 73.5, cy: 62, rx: 10, ry: 8 },    // 本週已聯繫島 (right)
];
const SIGNS = [{ x: 26.6, y: 82.6, text: '待聯繫島' }, { x: 80.5, y: 82.6, text: '本週已聯繫島' }];
const CAMPFIRE = { x: 66, y: 47 };
const GATHER = { x: 70, y: 54, rx: 6, ry: 3 }; // where people sit around the campfire at night
const HORIZON = 13; // sky is y < 13%
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
// the painted world is composited into one canvas of this size, then shown flat or as a 3D relief
const PAINT_W = 1280, PAINT_H = 853;
// relief: plane is 15 x 10 units; depth 0 (far) .. 1 (near) maps to z = (d - 0.5) * DEPTH
const PLANE_W = 15, PLANE_H = 10, DEPTH = 2.6;
// bump when backgrounds or sprites change so browsers drop their cached copies
const ASSET_V = 4;
const PHASES = ['morning', 'day', 'dusk', 'night'];
const PREVIEW = { morning: 7.5, day: 13, dusk: 17.5, night: 22 };
const POSES = ['stand', 'walk1', 'walk2', 'wave', 'jump', 'sit', 'sleep'];
const LV = [['冷淡', '#9aa0a6'], ['禮貌', '#5b9bd5'], ['有興趣', '#5cb85c'], ['想讀經', '#f2c230'], ['固定讀經', '#f5a623']];

const CSS = `
.s-root{position:absolute;inset:0;overflow:hidden;container-type:size;background:#7fd3e0}
.s-blur{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(24px) saturate(1.1);opacity:.9}
.s-world{position:absolute;left:50%;top:50%;width:min(100cqw,150cqh);aspect-ratio:3/2;transform:translate(-50%,-50%);container-type:size;user-select:none;-webkit-user-select:none}
.s-paint{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:pan-y}
.s-paint.drag{cursor:grabbing}
.s-view{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;gap:6px}
.s-view button{border:0;border-radius:999px;padding:6px 12px;font:800 13px/1 "PingFang TC",sans-serif;background:rgba(255,250,240,.93);color:#5a3e2b;box-shadow:0 4px 12px rgba(120,80,40,.18);cursor:pointer}
.s-hint{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:3;padding:6px 14px;border-radius:999px;background:rgba(60,40,25,.72);color:#fff;font:700 13px/1.2 "PingFang TC",sans-serif;pointer-events:none;transition:opacity 1s}
.s-char{position:absolute;width:0;height:0;cursor:pointer;transition:opacity .8s}
.s-body{position:absolute;left:0;bottom:0;transform:translateX(-50%)}
.s-sprite{display:block;height:calc(22cqh * var(--d,1) * var(--ph,1) * var(--z,1));width:auto;pointer-events:auto;filter:drop-shadow(0 .3cqh .3cqh rgba(60,40,20,.18))}
.s-sprite.flip{transform:scaleX(-1)}
.s-shadow{position:absolute;left:0;bottom:-.6cqh;width:calc(7cqh * var(--d,1) * var(--z,1));height:calc(1.9cqh * var(--d,1) * var(--z,1));border-radius:50%;background:rgba(40,60,50,.28);transform:translateX(calc(-50% + var(--sx,0) * 1cqh));pointer-events:none}
.s-spin .s-sprite{animation:sSpin .8s ease-in-out}
@keyframes sSpin{50%{transform:scaleX(-1)}}
.s-hop .s-body{animation:sHop .55s ease-in-out infinite}
@keyframes sHop{50%{transform:translate(-50%,-1.8cqh)}}
.s-blink .s-sprite{animation:sBlink 1s steps(2) infinite}
@keyframes sBlink{50%{opacity:.45}}
.s-plate{position:absolute;left:0;bottom:calc(23.6cqh * var(--d,1) * var(--z,1));transform:translateX(-50%);min-width:max-content;max-width:24cqw;padding:.55cqw 1cqw .6cqw;border-radius:1.3cqw;background:rgba(255,252,245,.96);color:#4a3222;font:clamp(8px,1.12cqw,14px)/1.3 "PingFang TC","Noto Sans TC",system-ui,sans-serif;text-align:left;box-shadow:0 .3cqw .9cqw rgba(80,60,45,.25);pointer-events:auto;transition:box-shadow .6s}
.s-plate::after{content:"";position:absolute;left:50%;bottom:-.7cqw;width:1.4cqw;height:1.4cqw;background:inherit;transform:translateX(-50%) rotate(45deg);border-radius:0 0 .3cqw 0;box-shadow:.25cqw .25cqw .4cqw rgba(80,60,45,.12)}
.s-plate b{display:block;font-size:1.35em;font-weight:900;letter-spacing:.05em}
.s-plate .m{display:flex;align-items:center;gap:.3em;white-space:nowrap}
.s-plate img{width:1.25em;height:1.25em;object-fit:contain}
.s-plate .lv img{width:1.45em;height:1.45em}
.s-plate .rem{position:absolute;right:-.9em;top:-1em;width:2.1em;height:2.1em;border-radius:50%;display:grid;place-items:center;font-weight:900;font-size:1.05em;background:#ffcf33;color:#5a3a00;border:.18em solid #fff;box-shadow:0 .15em .4em rgba(0,0,0,.2)}
.s-plate .rem.red{background:#e84a3c;color:#fff}
.s-plate .zz{display:none}
.s-sleep .s-plate .zz{display:inline}
.s-gold .s-plate{animation:sGlow 1.8s ease-in-out infinite alternate}
@keyframes sGlow{to{box-shadow:0 0 1.4cqw rgba(245,166,35,.85)}}
.s-night .s-plate{box-shadow:0 0 1.2cqw rgba(255,209,139,.75)}
.s-compact .s-plate .dept{display:none}
`;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hourNow = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
const phaseOf = h => (h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'dusk' : 'night');
const orbX = t => 6 + t * 88;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// weight of each painted background at a given hour; the last 0.8h of each phase blends into the next
function weights(hour) {
  const b = [5, 10, 16, 19, 29], next = ['day', 'dusk', 'night', 'morning'];
  const h = hour < 5 ? hour + 24 : hour;
  const i = b.findIndex((v, k) => h >= v && h < b[k + 1]);
  const t = smooth(b[i + 1] - 0.8, b[i + 1], h);
  const w = { morning: 0, day: 0, dusk: 0, night: 0 };
  w[PHASES[i]] += 1 - t; w[next[i]] += t;
  return w;
}

function seeded(str) { // FNV-1a hash + mulberry32, so similar ids ("demo1", "demo2") still get unrelated sequences
  let s = 2166136261; for (const c of str) s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
}
function randomIn(island, rng, margin = 0.9) {
  const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * margin, I = ISLANDS[island];
  return { x: I.cx + Math.cos(a) * I.rx * r, y: I.cy + Math.sin(a) * I.ry * r };
}

// draws rippling water + glitter into a fixed-size offscreen canvas (W x H); the scene composites it
function createWater(canvas, bgs, W, H) {
  const ctx = canvas.getContext('2d'), dayImage = bgs.day, cols = 192, rows = 128;
  const cells = [], reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const grid = document.createElement('canvas'), mask = document.createElement('canvas');
  const ripple = document.createElement('canvas'), flare = document.createElement('canvas');
  grid.width = cols; grid.height = rows;
  flare.width = flare.height = 24;
  const gridCtx = grid.getContext('2d'), maskCtx = mask.getContext('2d');
  const rippleCtx = ripple.getContext('2d'), flareCtx = flare.getContext('2d');
  const particles = (count, min, range) => Array.from({ length: count }, () => ({
    phase: Math.random(), period: min + Math.random() * range, size: Math.random(), x: 0, y: 0,
  }));
  const dashes = particles(700, 0.25, 0.85), flares = particles(120, 0.55, 0.95);
  const width = W, height = H;
  let drawWidth = 0, drawHeight = 0, dpr = 0;
  let maskPending = true;
  let time = 0, nextRipple = 0, flareColor = -1, glitterColor = '';
  let sunX = 0, moonX = 0, ambient = 0, sunGain = 0, moonGain = 0;

  function buildMask() {
    if (!dayImage.naturalWidth) return;
    gridCtx.drawImage(dayImage, 0, 0, cols, rows);
    let pixels;
    try { pixels = gridCtx.getImageData(0, 0, cols, rows).data; } catch { return; }
    const water = new Uint8Array(cols * rows), edge = gridCtx.createImageData(cols, rows);
    for (let i = 0; i < water.length; i++) {
      const x = (i % cols + 0.5) / cols * 100, y = (Math.floor(i / cols) + 0.5) / rows * 100;
      const r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
      if (y <= HORIZON + 1 || b <= r + 25 || g <= r + 10 || g > b + 10) continue;
      if (ISLANDS.some(I => ((x - I.cx) / I.rx) ** 2 + ((y - I.cy) / I.ry) ** 2 <= 1.25 ** 2)) continue;
      water[i] = 1;
    }
    // Leave a cell of clearance so shifted water samples stay clear of the shore.
    for (let i = cols; i < water.length; i++) {
      const col = i % cols;
      if (!water[i] || !water[i - cols] || (i + cols < water.length && !water[i + cols])) continue;
      if ((col > 0 && !water[i - 1]) || (col < cols - 1 && !water[i + 1])) continue;
      edge.data[i * 4 + 3] = 255;
      cells.push(i);
    }
    gridCtx.putImageData(edge, 0, 0);
  }

  function resize(scale) {
    dpr = scale; drawWidth = width; drawHeight = height;
    canvas.width = mask.width = ripple.width = Math.round(width * dpr);
    canvas.height = mask.height = ripple.height = Math.round(height * dpr);
    if (!canvas.width || !canvas.height) return;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    maskCtx.imageSmoothingEnabled = true;
    maskCtx.drawImage(grid, 0, 0, mask.width, mask.height);
    nextRipple = 0;
  }


  function drawRipple(w) {
    const rw = ripple.width, rh = ripple.height, scale = rh / height;
    const strip = Math.max(1, Math.round(2.5 * scale));
    const start = Math.floor(height * HORIZON / 100 * scale / strip) * strip;
    const strength = scale * Math.min(1, width / 750);
    rippleCtx.clearRect(0, 0, rw, rh);
    for (let i = 0; i < PHASES.length; i++) {
      const phase = PHASES[i], img = bgs[phase], weight = w[phase];
      if (weight < 0.01 || !img.complete || !img.naturalWidth) continue;
      rippleCtx.globalAlpha = weight;
      // Match the background's cover crop and align strips to backing pixels.
      const ratio = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const sw = width / ratio, sh = height / ratio;
      const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
      for (let y = start; y < rh; y += strip) {
        const dy = y / scale, depth = (y - start) / (rh - start);
        const dx = strength * (0.6 + 2.4 * depth) * (Math.sin(dy * 0.11 + time * 1.7) + 0.6 * Math.sin(dy * 0.29 - time * 2.6));
        const band = Math.min(strip, rh - y);
        rippleCtx.drawImage(img, sx, sy + y * sh / rh, sw, band * sh / rh, dx, y, rw, band);
      }
    }
  }

  function lightAt(x, depth) {
    return sunGain / (1 + ((x - sunX) / (0.065 + 0.18 * depth)) ** 4)
      + moonGain / (1 + ((x - moonX) / (0.055 + 0.16 * depth)) ** 4);
  }

  function advance(p, dt, scatter) {
    p.phase += dt / p.period;
    if (p.y && p.phase < 1) return;
    p.phase %= 1;
    for (let attempt = 0; attempt < 16; attempt++) {
      const cell = cells[Math.floor(Math.random() * cells.length)];
      p.x = (cell % cols + Math.random()) / cols;
      p.y = (Math.floor(cell / cols) + Math.random()) / rows;
      const depth = (p.y - HORIZON / 100) / (1 - HORIZON / 100);
      if (Math.random() < (0.45 + 0.55 * depth) * (scatter + lightAt(p.x, depth))) break;
    }
  }

  function updateColor(w) {
    const r = Math.round(255 * w.morning + 235 * w.day + 255 * w.dusk + 182 * w.night);
    const g = Math.round(238 * w.morning + 253 * w.day + 181 * w.dusk + 219 * w.night);
    const b = Math.round(200 * w.morning + 255 * w.day + 82 * w.dusk + 255 * w.night);
    const color = (r << 16) | (g << 8) | b;
    if (color === flareColor) return;
    flareColor = color;
    glitterColor = `rgb(${r},${g},${b})`;
    flareCtx.clearRect(0, 0, 24, 24);
    const glow = flareCtx.createRadialGradient(12, 12, 0, 12, 12, 11);
    glow.addColorStop(0, glitterColor);
    glow.addColorStop(0.28, `rgba(${r},${g},${b},0.65)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    flareCtx.strokeStyle = flareCtx.fillStyle = glow;
    flareCtx.lineWidth = 2.5;
    flareCtx.beginPath();
    flareCtx.moveTo(1, 12); flareCtx.lineTo(23, 12);
    flareCtx.moveTo(12, 2); flareCtx.lineTo(12, 22);
    flareCtx.stroke();
    flareCtx.beginPath(); flareCtx.arc(12, 12, 5, 0, Math.PI * 2); flareCtx.fill();
  }

  function draw(dt, w, s, m) {
    if (document.hidden || !width || !height) return;
    if (maskPending && dayImage.complete) {
      maskPending = false;
      buildMask();
    }
    if (!cells.length) return;
    const scale = 1;
    if (scale !== dpr || width !== drawWidth || height !== drawHeight) resize(scale);
    if (!canvas.width || !canvas.height) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const reduced = reducedMotion.matches;
    if (reduced) {
      nextRipple = time;
    } else {
      time += dt;
      if (time >= nextRipple - 0.001) {
        drawRipple(w);
        nextRipple = Math.max(nextRipple + 1 / 30, time + 1 / 60);
      }
      ctx.drawImage(ripple, 0, 0, width, height);
    }

    sunX = orbX(Math.min(1, Math.max(0, s))) / 100;
    moonX = orbX(m <= 1 ? m : 0) / 100;
    ambient = 0.16 * w.morning + 0.23 * w.day + 0.09 * w.dusk + 0.023 * w.night;
    sunGain = 0.57 * w.morning + 0.85 * w.day + 1.22 * w.dusk;
    moonGain = 0.93 * w.night;
    updateColor(w);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glitterColor;
    const motion = reduced ? 0.35 : 1;
    for (let i = 0; i < dashes.length * motion; i++) {
      const p = dashes[i];
      advance(p, dt * motion, ambient);
      const depth = (p.y - HORIZON / 100) / (1 - HORIZON / 100);
      const pulse = Math.max(0, 1 - Math.abs(p.phase * 2 - 1) * 1.35);
      const alpha = pulse ** 3 * (ambient + lightAt(p.x, depth)) * (0.64 + 0.36 * depth);
      if (alpha < 0.02) continue;
      const length = 4 + 24 * depth * (0.24 + 0.76 * p.size);
      const thickness = 1 + 1.2 * depth * (0.5 + 0.5 * p.size);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillRect(p.x * width - length / 2, p.y * height - thickness / 2, length, thickness);
    }
    for (let i = 0; i < flares.length * motion; i++) {
      const p = flares[i];
      advance(p, dt * motion, 0);
      const depth = (p.y - HORIZON / 100) / (1 - HORIZON / 100);
      const alpha = Math.sin(Math.PI * p.phase) ** 14 * lightAt(p.x, depth);
      if (alpha < 0.04) continue;
      const size = (4 + 12 * depth) * (0.65 + 0.35 * p.size);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(flare, p.x * width - size / 2, p.y * height - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0, width, height);
  }

  return {
    draw,
    dispose() {},
  };
}

export function createScene(container, { onPersonClick } = {}) {
  if (!document.getElementById('s-style')) document.head.append(Object.assign(document.createElement('style'), { id: 's-style', textContent: CSS }));
  const root = Object.assign(document.createElement('div'), { className: 's-root' });
  root.innerHTML = `<div class="s-blur" style="background-image:url(bg/day.jpg?v=${ASSET_V})"></div><div class="s-world"><div class="s-people"></div></div>
    <div class="s-view"><button data-v="reset" title="回到正面">🎥 正面</button></div><div class="s-hint">拖曳可以轉動視角・滾輪或雙指可以縮放</div>`;
  container.append(root);
  const world = root.querySelector('.s-world'), peopleEl = root.querySelector('.s-people'), blur = root.querySelector('.s-blur');
  const loadImg = src => Object.assign(new Image(), { src });
  const bgs = Object.fromEntries(PHASES.map(p => [p, loadImg(`bg/${p}.jpg?v=${ASSET_V}`)]));
  const cloudImgs = [1, 2, 3, 4, 5].map(i => loadImg(`props/cloud${i}.webp`)), boatImg = loadImg('props/boat.webp'), skyMask = loadImg('props/skymask.png');

  // ---------- 2D paint layer: everything that belongs to the painting ----------
  const paint = Object.assign(document.createElement('canvas'), { width: PAINT_W, height: PAINT_H, className: 's-paint' });
  const pctx = paint.getContext('2d');
  const waterCanvas = document.createElement('canvas'), skyCanvas = Object.assign(document.createElement('canvas'), { width: PAINT_W, height: PAINT_H });
  const sctx = skyCanvas.getContext('2d');
  const water = createWater(waterCanvas, bgs, PAINT_W, PAINT_H);
  const canFilter = 'filter' in pctx;
  const X = v => (v / 100) * PAINT_W, Y = v => (v / 100) * PAINT_H;
  // drifting clouds (masked to open sky so they pass behind trees/hills) and a sailboat tacking on the horizon
  const clouds = cloudImgs.map((img, i) => ({ img, x: [8, 38, 64, 86, 22][i], y: [1, 4.5, 2, 6, 7.5][i], w: [17, 15, 11, 6, 10][i], v: [0.55, 0.4, 0.7, 0.9, 0.5][i] }));
  const boat = { x: 40, dir: 1, turn: 0, t: 0 };
  const BOAT = { min: 33, max: 55, y: 18.2, speed: 0.9, w: 4.6 };
  const flies = Array.from({ length: 22 }, (_, i) => { const p = randomIn(i % 2, Math.random, 1.25); return { x: p.x, y: p.y - 6 - Math.random() * 8, ph: Math.random() * 6, sp: 0.6 + Math.random() * 0.8, r: 3 + Math.random() * 3 }; });
  const birds = Array.from({ length: 4 }, (_, i) => ({ x: -6 - i * 30, y: 4 + i * 2.5 + Math.random() * 2, v: 5 + i, ph: Math.random() * 6 }));
  let paintT = 0, paintAcc = 1;

  function drawPaint(dt, w, s, m) {
    paintT += dt;
    water.draw(dt, w, s, m);
    pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.globalAlpha = 1; pctx.globalCompositeOperation = 'source-over'; if (canFilter) pctx.filter = 'none';
    // cross-fade the two strongest time-of-day paintings
    const order = PHASES.filter(p => w[p] > 0.003 && bgs[p].complete).sort((a, b) => w[b] - w[a]);
    order.forEach((p, k) => { pctx.globalAlpha = k ? w[p] : 1; pctx.drawImage(bgs[p], 0, 0, PAINT_W, PAINT_H); });
    pctx.globalAlpha = 1;
    pctx.drawImage(waterCanvas, 0, 0, PAINT_W, PAINT_H);
    // tint for clouds and boat: warm at dawn, rosy-gold at dusk, dim blue at night
    const bright = w.day + 0.97 * w.morning + 0.92 * w.dusk + 0.42 * w.night, sepia = 0.18 * w.morning + 0.5 * w.dusk;
    const tint = `brightness(${bright.toFixed(2)}) sepia(${sepia.toFixed(2)}) saturate(${(1 + 0.6 * w.dusk - 0.3 * w.night).toFixed(2)})`;
    sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0, 0, PAINT_W, PAINT_H);
    for (const c of clouds) {
      c.x += c.v * dt; if (c.x > 104) c.x = -c.w - 4;
      if (c.img.complete && c.img.naturalWidth) { const cw = X(c.w); sctx.drawImage(c.img, X(c.x), Y(c.y), cw, cw * c.img.naturalHeight / c.img.naturalWidth); }
    }
    if (skyMask.complete && skyMask.naturalWidth) { sctx.globalCompositeOperation = 'destination-in'; sctx.drawImage(skyMask, 0, 0, PAINT_W, PAINT_H); }
    if (canFilter) pctx.filter = tint;
    pctx.globalAlpha = 1 - 0.35 * w.night;
    pctx.drawImage(skyCanvas, 0, 0);
    pctx.globalAlpha = 1;
    // sailboat: glide, pause, turn around; bob and rock gently
    boat.t += dt;
    if (boat.turn > 0) { boat.turn -= dt; if (boat.turn <= 0) boat.dir *= -1; }
    else { boat.x += boat.dir * BOAT.speed * dt; if (boat.x > BOAT.max || boat.x < BOAT.min) { boat.x = Math.min(BOAT.max, Math.max(BOAT.min, boat.x)); boat.turn = 2.5; } }
    if (boatImg.complete && boatImg.naturalWidth) {
      const bw = X(BOAT.w), bh = bw * boatImg.naturalHeight / boatImg.naturalWidth, by = Y(BOAT.y + Math.sin(boat.t * 1.6) * 0.12);
      pctx.save(); pctx.translate(X(boat.x), by);
      pctx.fillStyle = 'rgba(255,255,255,0.3)'; pctx.beginPath(); pctx.ellipse(0, 1, bw * 0.42, bw * 0.07, 0, 0, Math.PI * 2); pctx.fill();
      pctx.rotate(Math.sin(boat.t * 1.1) * 0.05); pctx.scale(boat.dir, 1);
      pctx.drawImage(boatImg, -bw / 2, -bh, bw, bh);
      pctx.restore();
    }
    if (canFilter) pctx.filter = 'none';
    // sun 5→19, moon 19→5 along an arc in the sky; fade near the horizon
    const orb = (t, r, stops) => {
      if (!(t > 0 && t < 1)) return;
      const a = smooth(0, 0.08, t) * smooth(1, 0.92, t), x = X(orbX(t)), y = Y(HORIZON - Math.sin(Math.PI * t) * 9), R = X(r);
      const g = pctx.createRadialGradient(x, y, 0, x, y, R);
      stops.forEach(([o, c]) => g.addColorStop(o, c));
      pctx.globalAlpha = a; pctx.fillStyle = g; pctx.beginPath(); pctx.arc(x, y, R, 0, Math.PI * 2); pctx.fill(); pctx.globalAlpha = 1;
    };
    orb(s, 3, [[0, '#fffbe6'], [0.38, '#fffbe6'], [0.55, '#ffe7a3'], [0.72, 'rgba(255,220,140,0)'], [1, 'rgba(255,220,140,0)']]);
    orb(m, 2.2, [[0, '#fffdf2'], [0.3, '#fffdf2'], [0.46, '#f1ecd6'], [0.7, 'rgba(240,235,210,0)'], [1, 'rgba(240,235,210,0)']]);
    // island signs
    pctx.font = `900 ${Math.round(PAINT_W * 0.031)}px "PingFang TC","Noto Sans TC",sans-serif`; pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    for (const sg of SIGNS) { pctx.fillStyle = 'rgba(255,240,210,0.7)'; pctx.fillText(sg.text, X(sg.x), Y(sg.y) + 1.5); pctx.fillStyle = '#6b4426'; pctx.fillText(sg.text, X(sg.x), Y(sg.y)); }
    // fireflies at night, birds in the morning
    if (w.night > 0.05) {
      pctx.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        const t = paintT * f.sp + f.ph, x = X(f.x + Math.sin(t) * 2.5), y = Y(f.y + Math.cos(t * 0.8) * 2), a = w.night * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.7)));
        const g = pctx.createRadialGradient(x, y, 0, x, y, f.r * 2.4); g.addColorStop(0, `rgba(255,246,168,${a})`); g.addColorStop(1, 'rgba(255,240,140,0)');
        pctx.fillStyle = g; pctx.beginPath(); pctx.arc(x, y, f.r * 2.4, 0, Math.PI * 2); pctx.fill();
      }
      pctx.globalCompositeOperation = 'source-over';
    }
    if (w.morning > 0.3) {
      pctx.strokeStyle = '#4a5a6a'; pctx.lineWidth = 2.2; pctx.lineCap = 'round'; pctx.globalAlpha = w.morning;
      for (const b of birds) {
        b.x += b.v * dt; if (b.x > 106) b.x = -6;
        const x = X(b.x), y = Y(b.y), s2 = X(1.2), flap = Math.sin(paintT * 9 + b.ph) * 0.6;
        pctx.beginPath(); pctx.moveTo(x - s2, y + s2 * (0.3 - flap * 0.3)); pctx.quadraticCurveTo(x - s2 / 2, y - s2 * flap, x, y + s2 * 0.25); pctx.quadraticCurveTo(x + s2 / 2, y - s2 * flap, x + s2, y + s2 * (0.3 - flap * 0.3)); pctx.stroke();
      }
      pctx.globalAlpha = 1;
    }
  }

  // ---------- depth (for the relief and for standing characters on it) ----------
  const DW = 384, DH = 256; let depth = null;
  const depthImg = loadImg('props/depth.png');
  depthImg.onload = () => {
    const c = Object.assign(document.createElement('canvas'), { width: DW, height: DH }), x = c.getContext('2d');
    x.drawImage(depthImg, 0, 0, DW, DH);
    const px = x.getImageData(0, 0, DW, DH).data; depth = new Float32Array(DW * DH);
    for (let i = 0; i < depth.length; i++) depth[i] = px[i * 4] / 255;
    if (three) three.applyDepth();
  };
  // bilinear depth lookup at (x%, y%)
  function depthAt(xp, yp) {
    if (!depth) return 0.5;
    const fx = Math.min(DW - 1.001, Math.max(0, (xp / 100) * DW - 0.5)), fy = Math.min(DH - 1.001, Math.max(0, (yp / 100) * DH - 0.5));
    const x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0, i = y0 * DW + x0;
    return (depth[i] * (1 - tx) + depth[i + 1] * tx) * (1 - ty) + (depth[i + DW] * (1 - tx) + depth[i + DW + 1] * tx) * ty;
  }

  // ---------- view: yaw/pitch/zoom with damping; flat 2D until three.js is ready ----------
  const view = { yaw: 0, pitch: 0, zoom: 1, tx: 0, ty: 0, gy: 0, gp: 0, gz: 1, gtx: 0, gty: 0, idle: 0 };
  const LIM = { yaw: 0.32, pitchUp: 0.16, pitchDown: 0.1, zoomMax: 2.2 };
  let three = null, project = (xp, yp) => ({ x: xp, y: yp });
  world.prepend(paint);

  async function init3D() {
    let THREE;
    try { THREE = await import(THREE_URL); } catch { return; }
    if (disposed) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-PLANE_W / 2, PLANE_W / 2, PLANE_H / 2, -PLANE_H / 2, 0.1, 100);
    const tex = new THREE.CanvasTexture(paint); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
    const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 192, 128);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
    scene.add(mesh);
    const canvas = renderer.domElement; canvas.className = 's-paint';
    paint.replaceWith(canvas); bindPointer(canvas);
    const v = new THREE.Vector3(), target = new THREE.Vector3();
    three = {
      applyDepth() {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, (depthAt((pos.getX(i) / PLANE_W + 0.5) * 100, (0.5 - pos.getY(i) / PLANE_H) * 100) - 0.5) * DEPTH);
        pos.needsUpdate = true;
      },
      render(paintChanged) {
        const W = world.clientWidth, H = world.clientHeight;
        if (!W || !H) return;
        if (canvas.width !== Math.round(W * renderer.getPixelRatio()) || canvas.height !== Math.round(H * renderer.getPixelRatio())) renderer.setSize(W, H, false);
        // orbit the camera around the (zoom-shifted) target
        target.set(view.tx, view.ty, 0);
        camera.position.set(target.x + 20 * Math.sin(view.yaw) * Math.cos(view.pitch), target.y + 20 * Math.sin(view.pitch), 20 * Math.cos(view.yaw) * Math.cos(view.pitch));
        camera.lookAt(target);
        // zoom in a touch while rotated so the relief's edges never show
        camera.zoom = view.zoom * (1 + Math.abs(view.yaw) * 0.32 + Math.abs(view.pitch) * 0.4);
        camera.updateProjectionMatrix();
        if (paintChanged) tex.needsUpdate = true;
        renderer.render(scene, camera);
      },
      project(xp, yp) {
        v.set((xp / 100 - 0.5) * PLANE_W, (0.5 - yp / 100) * PLANE_H, (depthAt(xp, yp) - 0.5) * DEPTH).project(camera);
        return { x: (v.x + 1) * 50, y: (1 - v.y) * 50, z: camera.zoom };
      },
      dispose() { geo.dispose(); mesh.material.dispose(); tex.dispose(); renderer.dispose(); },
    };
    if (depth) three.applyDepth();
    project = three.project;
  }

  // drag = rotate, wheel / pinch = zoom toward the pointer, double-click or the button = back to front view
  const pointers = new Map(); let pinch0 = 0, zoom0 = 1, moved = false;
  function zoomAt(factor, clientX, clientY) {
    const r = world.getBoundingClientRect(), nz = Math.min(LIM.zoomMax, Math.max(1, view.gz * factor));
    const px = ((clientX - r.left) / r.width - 0.5) * PLANE_W / view.gz + view.gtx, py = (0.5 - (clientY - r.top) / r.height) * PLANE_H / view.gz + view.gty;
    view.gtx = px - (px - view.gtx) * view.gz / nz; view.gty = py - (py - view.gty) * view.gz / nz; view.gz = nz;
    const mx = PLANE_W / 2 * (1 - 1 / nz), my = PLANE_H / 2 * (1 - 1 / nz);
    view.gtx = Math.max(-mx, Math.min(mx, view.gtx)); view.gty = Math.max(-my, Math.min(my, view.gty));
    view.idle = 0;
  }
  function bindPointer(el) {
    el.addEventListener('pointerdown', e => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId); moved = false; if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = view.gz; } });
    el.addEventListener('pointermove', e => {
      const p = pointers.get(e.pointerId); if (!p) return;
      if (pointers.size === 2) {
        p.x = e.clientX; p.y = e.clientY; const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0) zoomAt((zoom0 * d / pinch0) / view.gz, (a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      view.gy = Math.max(-LIM.yaw, Math.min(LIM.yaw, view.gy - dx * 0.004));
      if (e.pointerType !== 'touch') view.gp = Math.max(-LIM.pitchDown, Math.min(LIM.pitchUp, view.gp + dy * 0.003));
      view.idle = 0; el.classList.add('drag'); hint.style.opacity = 0;
    });
    const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; if (!pointers.size) el.classList.remove('drag'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('dblclick', resetView);
  }
  // wheel zoom works anywhere over the scene, including over characters
  world.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); hint.style.opacity = 0; }, { passive: false });
  function resetView() { Object.assign(view, { gy: 0, gp: 0, gz: 1, gtx: 0, gty: 0, idle: 0 }); }
  root.querySelector('[data-v="reset"]').addEventListener('click', resetView);
  const hint = root.querySelector('.s-hint'); setTimeout(() => (hint.style.opacity = 0), 5000);
  bindPointer(paint);
  init3D();

  const people = new Map();
  let mode = 'auto', hourAnim = null, hour = hourNow(), phase = phaseOf(hour), raf = 0, last = performance.now(), disposed = false;

  function makePerson(p) {
    const el = document.createElement('div');
    el.className = 's-char';
    el.innerHTML = `<div class="s-shadow"></div><div class="s-body"><img class="s-sprite" alt="" draggable="false"></div><div class="s-plate"></div>`;
    el.addEventListener('click', () => onPersonClick?.(person.id));
    peopleEl.append(el);
    const rng = seeded(p.id), island = p.contacted ? 1 : 0, pos = randomIn(island, rng, 0.8);
    const person = { id: p.id, el, img: el.querySelector('.s-sprite'), plate: el.querySelector('.s-plate'), rng, island, ...pos,
      target: { ...pos }, pause: rng() * 2, pose: '', flip: false, action: null, actionT: 0, jump: null, spinT: 0, data: null, frameT: 0 };
    // preload all poses so switching never flickers
    person.sprites = POSES.map(n => Object.assign(new Image(), { src: `sprites/${p.sprite || 1}/${n}.webp?v=${ASSET_V}` }));
    el.style.opacity = 0; requestAnimationFrame(() => (el.style.opacity = ''));
    return person;
  }

  function update(person, p) {
    const was = person.data;
    person.data = p;
    if (!was || was.sprite !== p.sprite) person.sprites = POSES.map(n => Object.assign(new Image(), { src: `sprites/${p.sprite || 1}/${n}.webp?v=${ASSET_V}` }));
    const d = p.daysSince, gone = d === null || d > 30, red = !gone && d > 14, yellow = !gone && !red && d > 7;
    person.gone = gone; person.red = red;
    person.plate.innerHTML = `<b>${esc(p.name)} <span class="zz">💤</span></b><span class="m"><img src="icons/cap.webp" alt="">${esc(p.school)}</span><span class="m dept"><img src="icons/school.webp" alt="">${esc(p.dept)}</span>
      <span class="m lv">敞開程度：<img src="icons/lv${p.openness}.webp" alt="">${LV[p.openness]?.[0] || ''}</span>${gone || red ? '<span class="rem red">!!</span>' : yellow ? '<span class="rem">!</span>' : ''}`;
    person.el.classList.toggle('s-gold', p.openness === 4);
    person.el.classList.toggle('s-hop', red);
    person.el.classList.toggle('s-blink', red);
    person.el.style.opacity = gone ? 0.5 : '';
    const island = p.contacted ? 1 : 0;
    if (was && island !== person.island && !person.jump) {
      const to = randomIn(island, person.rng, 0.6);
      person.jump = { from: { x: person.x, y: person.y }, to, t: 0, island };
    }
  }

  function setPeople(list) {
    const ids = new Set(list.map(p => p.id));
    for (const [id, person] of people) if (!ids.has(id)) {
      person.el.style.opacity = 0; setTimeout(() => person.el.remove(), 800); people.delete(id);
    }
    for (const p of list) {
      let person = people.get(p.id);
      if (!person) { person = makePerson(p); people.set(p.id, person); }
      update(person, p);
    }
  }

  function setPose(person, pose, flip = person.flip) {
    if (person.pose === pose && person.flip === flip) return;
    person.pose = pose; person.flip = flip;
    person.img.src = person.sprites[POSES.indexOf(pose)].src;
    person.img.classList.toggle('flip', flip);
  }

  // key names the destination: once arrived, small nudges (< 2.5) don't restart walking, so poses don't flicker
  function moveToward(person, tx, ty, speed, dt, key) {
    // y is squashed by perspective
    const dx = tx - person.x, dy = (ty - person.y) * 1.5, dist = Math.hypot(dx, dy);
    if (person.arrived === key && dist < 2.5) return false;
    if (dist < 0.4) { person.arrived = key; return false; }
    person.arrived = null;
    const step = Math.min(dist, speed * dt);
    person.x += (dx / dist) * step; person.y += (dy / dist) * step / 1.5;
    if (Math.abs(dx) > 0.05) person.flip = dx < 0;
    return true;
  }

  function animate(person, dt, now) {
    const night = phase === 'night', I = ISLANDS[person.island];
    if (person.jump) { // big hop across the sea
      const j = person.jump; j.t = Math.min(1, j.t + dt / 1.6);
      const t = j.t, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      person.x = j.from.x + (j.to.x - j.from.x) * e; person.y = j.from.y + (j.to.y - j.from.y) * e;
      person.lift = Math.sin(Math.PI * t) * 26;
      setPose(person, 'jump', j.to.x < j.from.x);
      if (t >= 1) { person.island = j.island; person.jump = null; person.lift = 0; person.target = { x: person.x, y: person.y }; person.pause = 1; }
      return;
    }
    person.lift = 0;
    let moving = false, rest = null;
    if (person.gone) { // >30 days: wander to the island's front edge and sit there, staring at the sea
      const a = person.island ? 0.55 : Math.PI - 0.55;
      moving = moveToward(person, I.cx + Math.cos(a) * I.rx * 1.02, I.cy + Math.sin(a) * I.ry * 1.02, 4, dt, 'edge');
      if (!moving) rest = 'sit';
    } else if (night) { // night: gather around the campfire (right) or doze off (left)
      if (person.island) {
        // everyone on the right island gets their own seat around the fire
        const ring = [...people.values()].filter(q => q.island === 1 && !q.gone).map(q => q.id).sort(), n = Math.max(ring.length, 3);
        const a = (ring.indexOf(person.id) / n) * Math.PI * 2;
        moving = moveToward(person, GATHER.x + Math.cos(a) * GATHER.rx, GATHER.y + Math.sin(a) * GATHER.ry, 5, dt, 'fire');
        if (!moving) { rest = 'sit'; person.flip = person.x > CAMPFIRE.x; }
      } else rest = 'sleep';
    } else if (person.action) {
      person.actionT -= dt;
      rest = person.action;
      if (person.actionT <= 0) person.action = null;
    } else if (person.pause > 0) {
      person.pause -= dt;
    } else {
      moving = moveToward(person, person.target.x, person.target.y, phase === 'day' ? 6 : 4.2, dt, person.target);
      if (!moving) {
        person.pause = 0.6 + person.rng() * 2.5;
        person.target = randomIn(person.island, person.rng);
        const r = person.rng();
        if (r < 0.18) { person.action = 'wave'; person.actionT = 1.4; }
        else if (r < 0.3) { person.spinT = 0.8; person.el.classList.add('s-spin'); }
        else if (r < 0.45 && phase === 'morning') { person.action = 'jump'; person.actionT = 1.2; } // morning stretch: arms up
      }
    }
    if (person.spinT > 0 && (person.spinT -= dt) <= 0) person.el.classList.remove('s-spin');
    if (moving) { person.frameT += dt; setPose(person, Math.floor(person.frameT / 0.22) % 2 ? 'walk2' : 'walk1'); }
    else setPose(person, rest || 'stand');
    person.el.classList.toggle('s-sleep', rest === 'sleep');
  }

  function place(person) {
    // perspective: farther (smaller y) is smaller; tiny bob while walking
    const d = 0.82 + ((person.y - 55) / 20) * 0.3, bob = person.pose.startsWith('walk') ? Math.abs(Math.sin(person.frameT * 14)) * 0.5 : 0;
    // stand on the relief: project the foot point through the current camera, then lift in screen space
    const pr = project(person.x, person.y), z = pr.z || 1;
    person.el.style.left = pr.x + '%';
    person.el.style.top = (pr.y - ((person.lift || 0) + bob) * z) + '%';
    person.el.style.zIndex = Math.round(person.y * 10) + (person.jump ? 1000 : 0);
    person.el.style.setProperty('--d', d.toFixed(3));
    const im = person.sprites[POSES.indexOf(person.pose)]; // poses keep their size relative to the 360px standing pose
    person.img.style.setProperty('--ph', im?.naturalHeight ? (im.naturalHeight / 360).toFixed(3) : 1);
  }

  // keep characters on the same island from standing on top of each other (and inside the lawn)
  function separate(dt) {
    const list = [...people.values()].filter(p => !p.jump);
    for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) {
      const a = list[i], b = list[k];
      if (a.island !== b.island) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.5, d = Math.hypot(dx, dy) || 0.01;
      if (d >= 7) continue;
      // people who are sitting/standing at their spot don't get shoved; the walker steps around them
      const fa = a.arrived && !a.pose.startsWith('walk') ? 0 : 1, fb = b.arrived && !b.pose.startsWith('walk') ? 0 : 1;
      if (!fa && !fb) continue;
      const push = (7 - d) * Math.min(1, dt * 2), ux = dx / d, uy = dy / d / 1.5, sa = fa / (fa + fb), sb = fb / (fa + fb);
      a.x -= ux * push * sa; a.y -= uy * push * sa; b.x += ux * push * sb; b.y += uy * push * sb;
    }
    for (const p of list) {
      const I = ISLANDS[p.island], nx = (p.x - I.cx) / I.rx, ny = (p.y - I.cy) / I.ry, r = Math.hypot(nx, ny), max = p.gone ? 1.08 : phase === 'night' && p.island ? 1.5 : 1; // campfire ring sits just behind the lawn
      if (r > max) { p.x = I.cx + (nx / r) * max * I.rx; p.y = I.cy + (ny / r) * max * I.ry; }
    }
  }

  function applyTime(h, dt = 0) {
    const w = weights(h);
    const top = PHASES.reduce((a, b) => (w[a] >= w[b] ? a : b));
    const blurUrl = `url("bg/${top}.jpg?v=${ASSET_V}")`;
    if (blur.style.backgroundImage !== blurUrl) blur.style.backgroundImage = blurUrl;
    phase = phaseOf(h);
    const s = (h - 5) / 14, m = ((h - 19 + 24) % 24) / 10;
    // repaint the painting at ~30 fps (it is uploaded to the GPU each time); the camera moves at full rate
    paintAcc += dt;
    const repaint = paintAcc >= 1 / 30 || !dt;
    if (repaint) { drawPaint(paintAcc, w, s, m); paintAcc = 0; }
    world.style.setProperty('--sx', s > 0 && s < 1 ? ((0.5 - s) * 2.2).toFixed(2) : 0); // shadows lean away from the sun
    root.classList.toggle('s-night', w.night > 0.5);
    for (const p of people.values()) p.el.classList.toggle('s-night', w.night > 0.5);
    return repaint;
  }

  function updateView(dt) {
    // gentle idle sway hints that the diorama is 3D; user input takes over immediately
    view.idle += dt;
    const sway = three && view.idle > 4 && view.gz === 1 ? Math.sin(paintT * 0.22) * 0.05 * Math.min(1, (view.idle - 4) / 3) : 0;
    const k = 1 - Math.exp(-dt * 8);
    view.yaw += (view.gy + sway - view.yaw) * k; view.pitch += (view.gp - view.pitch) * k;
    view.zoom += (view.gz - view.zoom) * k; view.tx += (view.gtx - view.tx) * k; view.ty += (view.gty - view.ty) * k;
    world.style.setProperty('--z', (three ? view.zoom * (1 + Math.abs(view.yaw) * 0.32 + Math.abs(view.pitch) * 0.4) : 1).toFixed(3));
  }

  function setTimeMode(next) {
    const from = hour;
    mode = next;
    const to = next === 'auto' ? hourNow() : PREVIEW[next];
    if (to == null) return;
    let diff = to - from; if (Math.abs(diff) > 12) diff -= Math.sign(diff) * 24;
    hourAnim = { from, diff, t0: performance.now() };
  }

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (hourAnim) {
      const t = smooth(0, 1, (now - hourAnim.t0) / 1500);
      hour = (hourAnim.from + hourAnim.diff * t + 24) % 24;
      if (t >= 1) hourAnim = null;
    } else if (mode === 'auto') hour = hourNow();
    const repainted = applyTime(hour, dt);
    updateView(dt);
    if (three) three.render(repainted);
    root.classList.toggle('s-compact', world.clientWidth < 620);
    for (const p of people.values()) animate(p, dt, now);
    separate(dt);
    for (const p of people.values()) place(p);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  const onVis = () => { if (!document.hidden && !raf && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', onVis);
  applyTime(hour);
  raf = requestAnimationFrame(frame);

  return {
    setPeople,
    setTimeMode,
    getTimePhase: () => phase,
    dispose() { disposed = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); water.dispose(); three?.dispose(); root.remove(); },
  };
}
