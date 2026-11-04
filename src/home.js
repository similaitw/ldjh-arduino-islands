// 3D 機械星系入口
import * as THREE from 'three';
import { ISLANDS, LEVELS, getProgress } from './levels.js';

const $ = s => document.querySelector(s);
const progress = getProgress();
const levelsOf = id => LEVELS.filter(l => l.island === id);
const doneCount = id => levelsOf(id).filter(l => progress[l.id]).length;
$('#totalProgress').textContent = `已完成 ${LEVELS.filter(l => progress[l.id]).length} / ${LEVELS.length} 關`;

// ---------- 面板 ----------
let onPanelClose = () => {};
function openPanel(key) {
  const p = $('#panel');
  if (key === 'lab') {
    p.innerHTML = `<button class="close" aria-label="關閉">✕</button>
      <div class="ptag" style="background:#c8963e">🛠 星系中心</div>
      <h2>核心工坊</h2>
      <p>不受關卡限制，自由接線、寫程式。內建 8 個範例：Blink、按鈕、PWM、millis 多工、自動路燈、倒車雷達、溫溼度、伺服馬達。</p>
      <a class="go big" href="lab.html">進入自由實驗室 →</a>`;
  } else {
    const isl = ISLANDS.find(i => i.id === key);
    p.innerHTML = `<button class="close" aria-label="關閉">✕</button>
      <div class="ptag" style="background:${isl.color}">${isl.icon} 第 ${isl.id} 顆星球 · ${isl.theme}</div>
      <h2>${isl.name}</h2>
      <p>${isl.desc}</p>
      ${isl.locked ? '<div class="locked">🚧 這顆星球還在建設中，敬請期待！<br>先到內圈的星球練功，或回核心工坊自由實驗。</div>' :
      `<div class="levels">${levelsOf(isl.id).map(l => `<a class="level ${progress[l.id] ? 'done' : ''}" href="lab.html#level-${l.id}">
          <span class="num">${progress[l.id] ? '✓' : l.id}</span><span><b>${l.title}</b><small>${l.brief}</small></span><span class="arrow">→</span></a>`).join('')}</div>`}`;
  }
  p.classList.add('open');
  p.querySelector('.close').addEventListener('click', closePanel);
}
function closePanel() { $('#panel').classList.remove('open'); onPanelClose(); }
window.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

// ---------- 清單模式 ----------
$('#listView').innerHTML = `<div class="listgrid">${ISLANDS.map(isl => `
  <div class="card ${isl.locked ? 'lockedcard' : ''}" style="--c:${isl.color}">
    <div class="ctitle">${isl.icon} ${isl.name} <small>${isl.locked ? '🚧 建設中' : `${doneCount(isl.id)}/${levelsOf(isl.id).length}`}</small></div>
    <div class="cdesc">${isl.desc}</div>
    ${levelsOf(isl.id).map(l => `<a class="level ${progress[l.id] ? 'done' : ''}" href="lab.html#level-${l.id}"><span class="num">${progress[l.id] ? '✓' : l.id}</span><span><b>${l.title}</b><small>${l.brief}</small></span></a>`).join('')}
  </div>`).join('')}
  <div class="card" style="--c:#c8963e"><div class="ctitle">🛠 核心工坊 · 自由實驗室</div><div class="cdesc">自由接線、寫程式，內建 8 個範例。</div><a class="go" href="lab.html">進入實驗室 →</a></div>
</div>`;
$('#listBtn').addEventListener('click', () => document.body.classList.toggle('list-mode'));

// ---------- 3D ----------
let renderer = null;
const isTouch = matchMedia('(pointer: coarse)').matches;
try { renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.add('list-mode'); }

// 程序化貼圖
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function planetTexture(base, accent, seed, style) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d'), r = rng(seed * 9973 + 7);
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  if (style === 'bands') {
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.12 + r() * 0.3; g.fillStyle = r() < 0.5 ? accent : '#000';
      const y = r() * 256, h = 4 + r() * 22; g.fillRect(0, y, 512, h);
    }
  } else {
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.15 + r() * 0.45; g.fillStyle = r() < 0.6 ? accent : '#000';
      g.beginPath(); g.ellipse(r() * 512, 30 + r() * 196, 8 + r() * 46, 5 + r() * 20, 0, 0, Math.PI * 2); g.fill();
    }
  }
  for (let i = 0; i < 1500; i++) { g.globalAlpha = r() * 0.12; g.fillStyle = r() < 0.5 ? '#fff' : '#000'; g.fillRect(r() * 512, r() * 256, 2, 2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function glowTexture(inner, outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowSprite = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(size); return s;
};

function initScene() {
  const host = $('#scene');
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
  renderer.domElement.style.touchAction = 'none';
  renderer.setClearColor(0x05060f);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
  const camHome = new THREE.Vector3(0, 30, 50);

  scene.add(new THREE.AmbientLight(0x8090c0, 0.55));
  scene.add(new THREE.PointLight(0xfff0d0, 3.2, 0, 0));
  const fill = new THREE.DirectionalLight(0x9fb8ff, 0.5); fill.position.set(0, 40, 60); scene.add(fill);

  // 星空
  const starGeo = new THREE.BufferGeometry(), N = isTouch ? 2500 : 5000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const r0 = rng(42);
  for (let i = 0; i < N; i++) {
    const u = r0() * 2 - 1, th = r0() * Math.PI * 2, rad = 220 + r0() * 180, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad], i * 3);
    const c = new THREE.Color().setHSL(0.55 + r0() * 0.2, 0.5, 0.75 + r0() * 0.25); col.set([c.r, c.g, c.b], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.3, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  scene.add(stars);
  // 星雲
  [['rgba(140,80,255,.55)', [-160, 40, -260], 260], ['rgba(40,140,255,.45)', [180, -20, -240], 240], ['rgba(255,90,170,.35)', [40, 90, -300], 220], ['rgba(60,220,200,.25)', [-60, -80, -220], 200]]
    .forEach(([c, p, s]) => { const g = glowSprite(c, s, 0.9); g.position.set(...p); scene.add(g); });

  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
  const brass = M(0xc8963e, { metalness: 0.75, roughness: 0.3 });
  const brassDark = M(0x8c6524, { metalness: 0.6, roughness: 0.4 });
  const animated = [];

  function gearGeo(r, teeth, depth = 0.25, hole = 0.4) {
    const shape = new THREE.Shape(), inner = r * (hole > 0.7 ? 0.93 : 0.82), step = Math.PI * 2 / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      [[inner, a0], [r, a0 + step * 0.15], [r, a0 + step * 0.45], [inner, a0 + step * 0.6]].forEach(([rr, a], k) => {
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr; (i === 0 && k === 0) ? shape.moveTo(x, y) : shape.lineTo(x, y);
      });
    }
    shape.closePath();
    const h = new THREE.Path(); h.absarc(0, 0, r * hole, 0, Math.PI * 2, true); shape.holes.push(h);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, -depth / 2);
    return g;
  }

  // ---------- 核心工坊（恆星） ----------
  const core = new THREE.Group();
  const sunMat = new THREE.MeshBasicMaterial({ map: planetTexture('#ffb43a', '#fff1a8', 3, 'blotch') });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 32), sunMat);
  core.add(sun, glowSprite('rgba(255,200,90,1)', 16, 0.9), glowSprite('rgba(255,140,40,.6)', 30, 0.6));
  const ringA = new THREE.Mesh(gearGeo(4.6, 36, 0.25, 0.9), brass); ringA.rotation.x = Math.PI / 2.4;
  const ringB = new THREE.Mesh(gearGeo(5.4, 42, 0.2, 0.92), brassDark); ringB.rotation.set(Math.PI / 1.7, 0.5, 0);
  core.add(ringA, ringB);
  animated.push(t => { sun.rotation.y = t * 0.05; ringA.rotation.z = t * 0.25; ringB.rotation.z = -t * 0.18; });
  core.userData = { key: 'lab', radius: 5.5 };
  scene.add(core);

  // ---------- 行星 ----------
  const STYLE = {
    1: { base: '#2f7fd6', accent: '#8fd3ff', style: 'blotch', size: 1.75 },
    2: { base: '#d9a032', accent: '#fff0b0', style: 'bands', size: 1.9 },
    3: { base: '#3d9e5f', accent: '#b8f0a0', style: 'blotch', size: 1.85 },
    4: { base: '#c8603e', accent: '#ffc49a', style: 'blotch', size: 1.9 },
    5: { base: '#7a62b8', accent: '#d8c8ff', style: 'bands', size: 2.2 },
    6: { base: '#2f9c9c', accent: '#b0fff4', style: 'bands', size: 1.8 },
    7: { base: '#b8862f', accent: '#ffe39a', style: 'bands', size: 2.4 },
  };
  const ORBITS = [8, 11.5, 15, 21.5, 25.5, 29.5, 33.5];
  const PHASES = [2.35, 0.75, 1.6, 3.55, 5.75, 2.75, 4.65];  // 開放的星球一開始排在前方
  const planets = [];
  const orbitGroup = new THREE.Group(); scene.add(orbitGroup);

  ISLANDS.forEach((isl, i) => {
    const st = STYLE[isl.id], R = ORBITS[i], r = st.size;
    const g = new THREE.Group();
    const tex = planetTexture(st.base, st.accent, isl.id, st.style);
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), M(0xffffff, { map: tex, roughness: 0.85 }));
    if (isl.locked) body.material.color.setHex(0x8a8f99);
    g.add(body);
    const atm = glowSprite(isl.locked ? 'rgba(150,160,180,.35)' : hexA(st.accent, 0.55), r * 3.2, 0.8); g.add(atm);
    animated.push(t => { body.rotation.y = t * 0.12 + i; });
    // 表面上的物件放在朝向相機的北半球
    const surf = (obj, dir = [0, 1, 0.35]) => {
      const d = new THREE.Vector3(...dir).normalize();
      obj.position.copy(d.clone().multiplyScalar(r * 0.98));
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      g.add(obj); return obj;
    };
    if (isl.id === 1) { // 燈塔 + 小月亮
      const tower = new THREE.Group();
      for (let k = 0; k < 3; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - k * 0.03, 0.24 - k * 0.03, 0.35, 10), M(k % 2 ? 0xd94b4b : 0xf7f3ea)); seg.position.y = 0.17 + k * 0.35; tower.add(seg); }
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe58a });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lampMat); lamp.position.y = 1.2; tower.add(lamp);
      const beam = glowSprite('rgba(255,220,120,1)', 2.2); beam.position.y = 1.2; tower.add(beam);
      surf(tower);
      animated.push(t => { const on = Math.floor(t) % 2 === 0; lampMat.color.setHex(on ? 0xffe58a : 0x443a20); beam.visible = on; });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), M(0xcfd6df)); g.add(moon);
      animated.push(t => moon.position.set(Math.cos(t * 0.8) * (r + 1.1), 0.3, Math.sin(t * 0.8) * (r + 1.1)));
    }
    if (isl.id === 2) { // 換色光環 + 呼吸城市燈
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.75, 0.07, 8, 80), ringMat); ring.rotation.x = Math.PI / 2.3; g.add(ring);
      const colors = [0xff3355, 0x33dd66, 0x3388ff, 0xffdd33];
      animated.push(t => ringMat.color.setHex(colors[Math.floor(t) % 4]));
      for (let k = 0; k < 9; k++) {
        const m = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m);
        surf(dot, [Math.cos(k * 0.7) * 0.8, 0.7 + (k % 3) * 0.2, 0.6 + Math.sin(k) * 0.3]);
        animated.push(t => { m.opacity = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 2.2 + k * 0.7)); });
      }
    }
    if (isl.id === 3) { // 大按鈕 + 齒輪衛星
      const btn = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), M(0x2b2f36)); base.position.y = 0.1;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 20), M(0xd94b4b, { roughness: 0.4 })); cap.position.y = 0.33;
      btn.add(base, cap); surf(btn);
      animated.push(t => { cap.position.y = (t % 2.4) < 0.25 ? 0.25 : 0.33; });
      const gm = new THREE.Mesh(gearGeo(0.45, 9, 0.15), brass); g.add(gm);
      animated.push(t => { gm.position.set(Math.cos(-t * 0.6) * (r + 1.2), 0.4, Math.sin(-t * 0.6) * (r + 1.2)); gm.rotation.z = t * 2; gm.lookAt(camera.position); });
    }
    if (isl.id === 5) { const gr = new THREE.Mesh(gearGeo(r + 1.3, 40, 0.15, 0.88), M(0x9a9aa6, { metalness: 0.6, roughness: 0.4 })); gr.rotation.x = Math.PI / 2.2; g.add(gr); animated.push(t => { gr.rotation.z = t * 0.15; }); }
    if (isl.id === 7) { const ring = new THREE.Mesh(new THREE.RingGeometry(r + 0.6, r + 1.6, 64), M(0xa89a80, { side: THREE.DoubleSide, transparent: true, opacity: 0.75 })); ring.rotation.x = Math.PI / 2.4; g.add(ring); }
    if (isl.id === 4) { const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), M(0xbfc4cc, { side: THREE.DoubleSide })); dish.rotation.x = Math.PI; surf(dish); }
    if (isl.id === 6) { const screen = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.06), M(0x223, { emissive: 0x2a6060 })); screen.position.set(0, r + 0.9, 0); g.add(screen); }
    if (isl.locked) { // 建設中：鷹架網格
      const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(r * 1.18, 1)), new THREE.LineBasicMaterial({ color: 0xe0a63a, transparent: true, opacity: 0.55 }));
      g.add(cage); animated.push(t => { cage.rotation.y = -t * 0.1; });
    }
    // 軌道線
    const orbit = new THREE.Mesh(new THREE.RingGeometry(R - 0.03, R + 0.03, 160), new THREE.MeshBasicMaterial({ color: isl.locked ? 0x5a6278 : 0xc8963e, transparent: true, opacity: isl.locked ? 0.25 : 0.5, side: THREE.DoubleSide }));
    orbit.rotation.x = -Math.PI / 2; orbitGroup.add(orbit);
    const speed = 0.5 / Math.pow(R, 1.5);
    g.userData = { key: isl.id, R, speed, phase: PHASES[i], radius: r * 1.3, body };
    scene.add(g); planets.push(g);
  });

  // 小行星帶：開放區與建設區的分界
  const openIdx = ISLANDS.reduce((k, isl, i) => isl.locked ? k : i, 0);
  // 全部開放時，小行星帶移到最外圍當作星系邊界
  const beltR = openIdx >= ORBITS.length - 1 ? ORBITS[ORBITS.length - 1] + 3.4 : (ORBITS[openIdx] + ORBITS[openIdx + 1]) / 2;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.18, 0), M(0x8a7d6e), 560);
  const r1 = rng(7), dummy = new THREE.Object3D();
  for (let i = 0; i < 560; i++) {
    const a = r1() * Math.PI * 2, rr = beltR - 0.85 + r1() * 1.7;
    dummy.position.set(Math.cos(a) * rr, (r1() - 0.5) * 0.6, Math.sin(a) * rr);
    dummy.rotation.set(r1() * 6, r1() * 6, r1() * 6); dummy.scale.setScalar(0.5 + r1() * 1.6); dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocks);
  animated.push(t => { rocks.rotation.y = t * 0.01; });

  // ---------- 直式手機版：星際航道（星球由上往下排列，上下滑動探索） ----------
  const lanePos = planets.map((g, i) => new THREE.Vector3(i % 2 ? 1.7 : -1.7, -9.5 - i * 7.5, 0));
  const laneGroup = new THREE.Group(); scene.add(laneGroup);
  const laneCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), ...lanePos]);
  const laneLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(laneCurve.getPoints(160)), new THREE.LineDashedMaterial({ color: 0xc8963e, dashSize: 0.5, gapSize: 0.35, transparent: true, opacity: 0.7 }));
  laneLine.computeLineDistances(); laneGroup.add(laneLine);
  // 解鎖門放在「最後一顆開放的星球」與「第一顆建設中」之間
  const lastOpen = ISLANDS.reduce((k, isl, i) => isl.locked ? k : i, 0);
  const gateY = lastOpen >= lanePos.length - 1 ? lanePos[lanePos.length - 1].y - 4.5 : (lanePos[lastOpen].y + lanePos[lastOpen + 1].y) / 2;
  const gate = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), M(0x8a7d6e), 170);
  for (let i = 0; i < 170; i++) {
    const a = r1() * Math.PI * 2, rr = 3.6 + r1() * 1.2;
    dummy.position.set(Math.cos(a) * rr, gateY + (r1() - 0.5) * 0.5, Math.sin(a) * rr * 0.5);
    dummy.rotation.set(r1() * 6, r1() * 6, r1() * 6); dummy.scale.setScalar(0.5 + r1() * 1.5); dummy.updateMatrix();
    gate.setMatrixAt(i, dummy.matrix);
  }
  laneGroup.add(gate);
  animated.push(t => { gate.rotation.y = t * 0.05; });
  const LANE_TOP = -5, LANE_BOTTOM = lanePos[lanePos.length - 1].y + 1;
  let scrollY = LANE_TOP, scrollTarget = LANE_TOP, scrollVel = 0;

  // 流星
  const meteor = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0 }));
  scene.add(meteor);
  let mStart = -10, mFrom = new THREE.Vector3(), mDir = new THREE.Vector3();
  animated.push(t => {
    if (t - mStart > 7 + Math.random() * 4) {
      mStart = t; mFrom.set(-60 + Math.random() * 120, 30 + Math.random() * 20, -60 - Math.random() * 40);
      mDir.set(30 + Math.random() * 20, -18, 10).normalize();
      meteor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), mDir.clone().negate());
    }
    const u = (t - mStart) / 1.4;
    meteor.material.opacity = u < 1 ? Math.sin(u * Math.PI) * 0.9 : 0;
    meteor.position.copy(mFrom).addScaledVector(mDir, u * 60);
  });

  // ---------- 標籤 ----------
  const all = [core, ...planets];
  const labels = all.map(g => {
    const key = g.userData.key, d = document.createElement('button');
    d.className = 'ilabel';
    if (key === 'lab') d.innerHTML = '<b>🛠 核心工坊</b><small>自由實驗室</small>';
    else {
      const isl = ISLANDS.find(x => x.id === key), total = levelsOf(key).length, done = doneCount(key);
      d.innerHTML = `<b>${isl.icon} ${isl.name}</b><small>${isl.locked ? '🚧 建設中' : `${done}/${total} 關 ${done === total ? '🏅' : ''}`}</small>`;
      if (isl.locked) d.classList.add('lockedlabel');
    }
    d.addEventListener('click', () => focus(g));
    $('#labels').appendChild(d);
    return { g, d };
  });

  // ---------- 鏡頭 ----------
  let focused = null;
  const camPos = camHome.clone(), camLook = new THREE.Vector3();
  function focus(g) { focused = g; openPanel(g.userData.key); }
  onPanelClose = () => { focused = null; };

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9), ndc = new THREE.Vector2();
  let hovered = null, downAt = null, dragging = false, lastY = 0, lastT = 0;
  const toNdc = (e, v) => { const b = renderer.domElement.getBoundingClientRect(); return v.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
  function pick(v) {
    ray.setFromCamera(v, camera);
    for (const hit of ray.intersectObjects(all, true)) { let o = hit.object; if (o.isSprite) continue; while (o && !all.includes(o)) o = o.parent; if (o) return o; }
    return null;
  }
  const unitsPerPx = () => 2 * camPos.distanceTo(camLook) * Math.tan(camera.fov * Math.PI / 360) / host.clientHeight;
  const el = renderer.domElement;
  el.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') toNdc(e, mouse);
    if (dragging && portrait) {
      const dy = e.clientY - lastY, now = performance.now();
      scrollTarget = clampLane(scrollTarget + dy * unitsPerPx());
      scrollVel = dy * unitsPerPx() / Math.max(1, now - lastT) * 16;
      lastY = e.clientY; lastT = now;
      if (Math.abs(e.clientY - downAt[1]) > 6 && focused) closePanel();
    }
  });
  el.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; dragging = true; lastY = e.clientY; lastT = performance.now(); scrollVel = 0; el.setPointerCapture?.(e.pointerId); });
  const endDrag = () => { dragging = false; };
  el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag);
  el.addEventListener('wheel', e => { if (portrait) { scrollTarget = clampLane(scrollTarget - e.deltaY * 0.02); e.preventDefault(); } }, { passive: false });
  el.addEventListener('click', e => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const o = pick(toNdc(e, ndc));
    if (o) focus(o); else if (focused) closePanel();
  });
  const clampLane = v => Math.min(LANE_TOP, Math.max(LANE_BOTTOM, v));

  let fit = 1, portrait = false;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    fit = Math.min(2.4, Math.max(1, 1.6 / camera.aspect));
    portrait = camera.aspect < 0.85;
    document.body.classList.toggle('portrait', portrait);
    orbitGroup.visible = rocks.visible = !portrait;
    laneGroup.visible = portrait;
  }
  window.addEventListener('resize', resize); resize();

  const clock = new THREE.Timer(), tmp = new THREE.Vector3(), want = new THREE.Vector3(), wantLook = new THREE.Vector3();
  function tick() {
    clock.update(); const t = clock.getElapsed(), dt = Math.min(clock.getDelta(), 0.1);
    const ease = k => 1 - Math.exp(-k * dt);  // 與畫面更新率無關的平滑
    const base = portrait ? 0.82 : 1;
    planets.forEach((g, i) => {
      const { R, speed, phase } = g.userData, a = phase + t * speed;
      if (portrait) g.position.copy(lanePos[i]).setY(lanePos[i].y + Math.sin(t * 0.8 + i) * 0.15);
      else g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
      const s = base * (g === hovered || g === focused ? 1.12 : 1); g.scale.lerp(tmp.set(s, s, s), ease(8));
    });
    core.scale.lerp(tmp.setScalar((portrait ? 0.62 : 1) * (hovered === core ? 1.05 : 1)), ease(8));
    if (portrait && !dragging) { scrollTarget = clampLane(scrollTarget + scrollVel * dt * 60); scrollVel *= Math.pow(0.92, dt * 60); }
    scrollY += (scrollTarget - scrollY) * ease(10);
    animated.forEach(f => f(t));
    stars.rotation.y = t * 0.003;

    // 鏡頭：平常俯瞰全星系，聚焦時飛近目標
    if (portrait) {
      if (focused) { const p = focused.position; scrollTarget = clampLane(p.y - 2.9); }  // 星球停在上方，下方留給面板
      want.set(0, scrollY + 5, focused ? 15 : 19);
      wantLook.set(0, scrollY - 1.2, 0);
    } else if (focused) {
      const p = focused.position, k = focused.userData.radius;
      const side = window.innerWidth > 800 ? 0.32 : 0; // 面板在右側時把目標放左邊一點
      want.set(p.x, p.y + k * 2.2 + 2, p.z + k * 3.6 + 4);
      wantLook.set(p.x + side * (k * 3.6 + 4) * 0.9, p.y, p.z);
    } else {
      want.copy(camHome).multiplyScalar(fit).add(tmp.set(mouse.x * 2, mouse.y * 1.5, 0));
      wantLook.set(0, -2, 0);
    }
    camPos.lerp(want, ease(portrait ? 7 : 3.2)); camLook.lerp(wantLook, ease(portrait ? 8 : 3.8));
    camera.position.copy(camPos); camera.lookAt(camLook);

    hovered = isTouch ? null : pick(mouse); el.style.cursor = hovered ? 'pointer' : 'default';

    const w = host.clientWidth, hh = host.clientHeight;
    labels.forEach(({ g, d }) => {
      // 直式：標籤放在星球外側（朝畫面中央），避免上下重疊
      const sideLabel = portrait && g !== core;
      tmp.copy(g.position);
      if (sideLabel) tmp.x += Math.sign(-g.position.x) * (g.userData.radius * 0.82 + 0.3);
      else tmp.y += g.userData.radius * (portrait ? 0.62 : 1) + 1.2;
      tmp.project(camera);
      const sy = (-tmp.y * 0.5 + 0.5) * hh;
      const vis = tmp.z < 1 && tmp.y > -1.2 && tmp.y < 1.2 && !(portrait && sy < 96);  // 直式時別蓋到標題列
      d.style.display = vis ? '' : 'none';
      const anchor = !sideLabel ? 'translate(-50%,-100%)' : g.position.x < 0 ? 'translate(0,-50%)' : 'translate(-100%,-50%)';
      d.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * hh}px) ${anchor}`;
      d.classList.toggle('side', sideLabel);
      d.classList.toggle('hover', g === hovered || g === focused);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

if (renderer) initScene();
