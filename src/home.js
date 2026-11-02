// 3D 機械浮島入口
import * as THREE from 'three';
import { ISLANDS, LEVELS, getProgress } from './levels.js';

const $ = s => document.querySelector(s);
const progress = getProgress();
const doneCount = id => LEVELS.filter(l => l.island === id && progress[l.id]).length;
const totalDone = LEVELS.filter(l => progress[l.id]).length;
$('#totalProgress').textContent = `已完成 ${totalDone} / ${LEVELS.length} 關`;

// ---------- 面板 ----------
function openPanel(key) {
  const p = $('#panel');
  if (key === 'lab') {
    p.innerHTML = `<button class="close" aria-label="關閉">✕</button>
      <div class="ptag" style="background:#1d3557">🛠 中央工坊</div>
      <h2>自由實驗室</h2>
      <p>不受關卡限制，自由接線、寫程式。內建 8 個範例：Blink、按鈕、PWM、millis 多工、自動路燈、倒車雷達、溫溼度、伺服馬達。</p>
      <a class="go big" href="lab.html">進入實驗室 →</a>`;
  } else {
    const isl = ISLANDS.find(i => i.id === key);
    const levels = LEVELS.filter(l => l.island === isl.id);
    p.innerHTML = `<button class="close" aria-label="關閉">✕</button>
      <div class="ptag" style="background:${isl.color}">${isl.icon} 第 ${isl.id} 島 · ${isl.theme}</div>
      <h2>${isl.name}</h2>
      <p>${isl.desc}</p>
      ${isl.locked ? '<div class="locked">🔒 這座島還在建造中，敬請期待！<br>先到前面的島嶼練功，或到中央工坊自由實驗。</div>' :
      `<div class="levels">${levels.map(l => `<a class="level ${progress[l.id] ? 'done' : ''}" href="lab.html#level-${l.id}">
          <span class="num">${progress[l.id] ? '✓' : l.id}</span><span><b>${l.title}</b><small>${l.brief}</small></span><span class="arrow">→</span></a>`).join('')}</div>`}`;
  }
  p.classList.add('open');
  p.querySelector('.close').addEventListener('click', () => p.classList.remove('open'));
}

// ---------- 清單模式 ----------
function buildList() {
  const box = $('#listView');
  box.innerHTML = `<div class="listgrid">${ISLANDS.map(isl => `
    <div class="card ${isl.locked ? 'lockedcard' : ''}" style="--c:${isl.color}">
      <div class="ctitle">${isl.icon} 第 ${isl.id} 島 · ${isl.name} <small>${isl.locked ? '🔒 建造中' : `${doneCount(isl.id)}/${LEVELS.filter(l => l.island === isl.id).length}`}</small></div>
      <div class="cdesc">${isl.desc}</div>
      ${LEVELS.filter(l => l.island === isl.id).map(l => `<a class="level ${progress[l.id] ? 'done' : ''}" href="lab.html#level-${l.id}"><span class="num">${progress[l.id] ? '✓' : l.id}</span><span><b>${l.title}</b><small>${l.brief}</small></span></a>`).join('')}
    </div>`).join('')}
    <div class="card" style="--c:#1d3557"><div class="ctitle">🛠 中央工坊 · 自由實驗室</div><div class="cdesc">自由接線、寫程式，內建 8 個範例。</div><a class="go" href="lab.html">進入實驗室 →</a></div>
  </div>`;
}
buildList();
$('#listBtn').addEventListener('click', () => document.body.classList.toggle('list-mode'));

// ---------- 3D 場景 ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  document.body.classList.add('list-mode', 'no-webgl');
}
if (renderer) initScene();

function initScene() {
  const host = $('#scene');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8ecff, 45, 110);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  const camBase = new THREE.Vector3(0, 13, 42);

  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x8a7a66, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.0);
  sun.position.set(-18, 30, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 30, bottom: -30, near: 1, far: 90 });
  scene.add(sun);

  const M = (color, opt = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opt });
  const brass = M(0xc8963e, { metalness: 0.6, roughness: 0.35 });
  const brassDark = M(0x8c6524, { metalness: 0.5, roughness: 0.45 });
  const shadowy = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  function gearGeo(r, teeth, depth = 0.3, hole = 0.35) {
    const shape = new THREE.Shape();
    const inner = r * 0.82;
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2, step = Math.PI * 2 / teeth;
      const pts = [[inner, a0], [r, a0 + step * 0.15], [r, a0 + step * 0.45], [inner, a0 + step * 0.6]];
      pts.forEach(([rr, a], k) => { const x = Math.cos(a) * rr, y = Math.sin(a) * rr; (i === 0 && k === 0) ? shape.moveTo(x, y) : shape.lineTo(x, y); });
    }
    shape.closePath();
    const h = new THREE.Path(); h.absarc(0, 0, r * hole, 0, Math.PI * 2, true); shape.holes.push(h);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const gears = [];
  function addGear(parent, r, teeth, pos, rotAxis = 'z', speed = 0.6, mat = brass) {
    const g = new THREE.Mesh(gearGeo(r, teeth), mat);
    g.position.copy(pos);
    if (rotAxis === 'y') g.rotation.x = Math.PI / 2;
    parent.add(g); gears.push({ mesh: g, speed, axis: 'z' });
    return g;
  }

  function islandBase(r, grassColor, locked) {
    const g = new THREE.Group();
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, 0.6, 10), M(locked ? 0x9aa3ad : grassColor));
    grass.position.y = 0.3;
    const dirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.8, 0.9, 10), M(locked ? 0x7d7a76 : 0x9b6b43));
    dirt.position.y = -0.45;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(r * 0.8, r * 1.7, 10), M(locked ? 0x6c6c70 : 0x7a6a5c));
    rock.rotation.x = Math.PI; rock.position.y = -0.9 - r * 0.85;
    g.add(grass, dirt, rock);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + Math.random() * 0.3), M(0x7a6a5c));
      const a = Math.random() * Math.PI * 2;
      s.position.set(Math.cos(a) * (r + 0.8), -1.5 - Math.random() * 2, Math.sin(a) * (r + 0.8));
      s.userData.float = Math.random() * 6;
      g.add(s);
    }
    return g;
  }

  const animated = [];
  function propsFor(id, g, r) {
    if (id === 1) { // 燈塔：Blink
      const tower = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.55 - i * 0.07, 0.62 - i * 0.07, 0.8, 12), M(i % 2 ? 0xd94b4b : 0xf7f3ea));
        seg.position.y = 0.6 + 0.4 + i * 0.8; tower.add(seg);
      }
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffc94a, emissiveIntensity: 1 }));
      lamp.position.y = 4.4; tower.add(lamp);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 12), M(0x1d3557)); roof.position.y = 5.0; tower.add(roof);
      const light = new THREE.PointLight(0xffc94a, 6, 9); light.position.y = 4.4; tower.add(light);
      tower.position.set(-r * 0.35, 0, -r * 0.2); g.add(tower);
      animated.push(t => { const on = Math.floor(t * 1.0) % 2 === 0; lamp.material.emissiveIntensity = on ? 1.6 : 0.05; light.intensity = on ? 6 : 0; });
      const dock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.8), M(0x8b5e3c)); dock.position.set(r * 0.6, 0.65, r * 0.55); dock.rotation.y = -0.6; g.add(dock);
      addGear(g, 0.9, 12, new THREE.Vector3(r * 0.5, 1.5, -r * 0.4), 'z', 0.8);
    }
    if (id === 2) { // 呼吸燈柱 + RGB 光球
      const orbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff3355, emissiveIntensity: 1.2 });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), orbMat); orb.position.set(0, 3.4, 0);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.6, 8), brassDark); pillar.position.y = 1.9;
      const orbLight = new THREE.PointLight(0xff3355, 5, 8); orb.add(orbLight);
      g.add(pillar, orb);
      const colors = [0xff3355, 0x33dd66, 0x3388ff, 0xffdd33];
      animated.push(t => { const c = colors[Math.floor(t) % 4]; orbMat.emissive.setHex(c); orbLight.color.setHex(c); orb.rotation.y = t * 0.8; orb.position.y = 3.4 + Math.sin(t * 2) * 0.12; });
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2 + 0.4;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6), M(0x333a44)); post.position.set(Math.cos(a) * r * 0.65, 1.3, Math.sin(a) * r * 0.65);
        const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6cc, emissive: 0xffd36b, emissiveIntensity: 1 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bulbMat); bulb.position.copy(post.position); bulb.position.y = 2.1;
        g.add(post, bulb);
        animated.push(t => { bulbMat.emissiveIntensity = 0.15 + 1.4 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.6)); });
      }
      addGear(g, 0.8, 10, new THREE.Vector3(-r * 0.55, 1.4, r * 0.2), 'z', -0.7);
    }
    if (id === 3) { // 大按鈕 + 拉桿
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 2.0), M(0x2b2f36)); base.position.set(-0.3, 0.85, 0);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.45, 20), M(0xd94b4b, { flatShading: false, roughness: 0.4 })); cap.position.set(-0.3, 1.3, 0);
      g.add(base, cap);
      animated.push(t => { const p = (t % 2.4) < 0.25; cap.position.y = p ? 1.15 : 1.3; });
      const lever = new THREE.Group();
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), M(0x555c66)); stick.position.y = 0.8;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M(0x3fa66b)); knob.position.y = 1.6;
      lever.add(stick, knob); lever.position.set(r * 0.5, 0.6, r * 0.3); g.add(lever);
      animated.push(t => { lever.rotation.z = Math.sin(t * 1.3) * 0.5; });
      addGear(g, 0.85, 11, new THREE.Vector3(r * 0.2, 1.5, -r * 0.55), 'z', 0.9);
      addGear(g, 0.5, 8, new THREE.Vector3(r * 0.2 + 1.2, 1.5, -r * 0.55 + 0.05), 'z', -1.55);
    }
  }

  function scaffold(g, r) {
    const mat = M(0xb9a27a);
    const h = 3;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), mat); p.position.set(x * 0.9, 0.6 + h / 2, z * 0.9); g.add(p);
    }
    for (let y = 1.4; y <= 3.4; y += 1) {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.1, 0.1), mat); b1.position.set(0, y, 0.9); g.add(b1);
      const b2 = b1.clone(); b2.position.z = -0.9; g.add(b2);
    }
    const crane = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.12), M(0xe0a63a)); crane.position.set(0.8, 3.7, 0); g.add(crane);
    animated.push(t => { crane.rotation.y = Math.sin(t * 0.4) * 0.8; });
    addGear(g, 0.6, 9, new THREE.Vector3(-r * 0.55, 1.2, r * 0.3), 'z', 0.25, M(0x8d8d8d, { metalness: 0.5 }));
  }

  // ---------- 配置浮島 ----------
  const pickables = [];
  const islandObjs = [];
  const N = ISLANDS.length, R = 22;
  ISLANDS.forEach((isl, i) => {
    const a = (-62 + (124 / (N - 1)) * i) * Math.PI / 180;
    const pos = new THREE.Vector3(Math.sin(a) * R, (i % 2 ? 1.2 : -0.6), -Math.cos(a) * R + 14);
    const r = 2.6;
    const g = new THREE.Group();
    g.add(islandBase(r, new THREE.Color(isl.color).lerp(new THREE.Color(0x6cbf5a), 0.55).getHex(), isl.locked));
    if (isl.locked) scaffold(g, r); else propsFor(isl.id, g, r);
    g.position.copy(pos);
    g.rotation.y = -a * 0.6;
    shadowy(g);
    scene.add(g);
    g.userData = { key: isl.id, base: pos.clone(), phase: i * 0.9 };
    pickables.push(g); islandObjs.push(g);
  });

  // 中央工坊
  const lab = new THREE.Group();
  lab.add(islandBase(4.2, 0x6cbf5a, false));
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 3.0), M(0x1f6fb5, { flatShading: false, roughness: 0.5 }));
  board.position.y = 0.75;
  lab.add(board);
  for (let k = 0; k < 14; k++) {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.25, 0.16), M(0x222222)); pin.position.set(-1.7 + k * 0.26, 1.0, -1.25); lab.add(pin);
  }
  const chip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.6), M(0x1a1a1a)); chip.position.set(0.3, 0.98, 0.5); lab.add(chip);
  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), M(0xb0b6bd, { metalness: 0.6 })); usb.position.set(-2.0, 1.05, 0.6); lab.add(usb);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xffd0a0, emissive: 0xff8a2a, emissiveIntensity: 1 });
  const led13 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), ledMat); led13.position.set(-0.9, 0.93, -0.7); lab.add(led13);
  animated.push(t => { ledMat.emissiveIntensity = Math.floor(t * 2) % 2 ? 2 : 0.05; });
  addGear(lab, 1.8, 18, new THREE.Vector3(-2.6, 2.6, -1.6), 'z', 0.35);
  addGear(lab, 1.1, 11, new THREE.Vector3(-0.2, 2.9, -1.65), 'z', -0.57, brassDark);
  addGear(lab, 0.7, 8, new THREE.Vector3(2.6, 1.9, -1.4), 'z', 0.8);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.4, 8), brassDark); chimney.position.set(3.2, 1.8, 1.4); lab.add(chimney);
  const puffs = [];
  for (let k = 0; k < 5; k++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    lab.add(p); puffs.push({ p, off: k / 5 });
  }
  animated.push(t => puffs.forEach(({ p, off }) => { const u = (t * 0.35 + off) % 1; p.position.set(3.2 + u * 0.8, 3.1 + u * 2.4, 1.4); p.scale.setScalar(0.6 + u * 1.4); p.material.opacity = 0.75 * (1 - u); }));
  lab.position.set(0, -2.2, 7);
  shadowy(lab);
  lab.userData = { key: 'lab', base: lab.position.clone(), phase: 0.3 };
  scene.add(lab); pickables.push(lab); islandObjs.push(lab);

  // 纜線：工坊連到每座島
  islandObjs.slice(0, N).forEach((g, i) => {
    const a = lab.position.clone().add(new THREE.Vector3(0, 0.6, 0)), b = g.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    const mid = a.clone().lerp(b, 0.5); mid.y -= 2.5;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(30));
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: ISLANDS[i].locked ? 0x9aa3ad : 0xc8963e, dashSize: 0.5, gapSize: 0.3 }));
    line.computeLineDistances(); scene.add(line);
  });

  // 雲
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
  for (let k = 0; k < 14; k++) {
    const c = new THREE.Group();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 1.2, 10, 8), cloudMat);
      s.position.set(j * 1.4 - n * 0.7, Math.random() * 0.6, Math.random() * 0.8); c.add(s);
    }
    c.position.set(-60 + Math.random() * 120, -8 + Math.random() * 24, -40 + Math.random() * 50);
    c.userData.speed = 0.4 + Math.random() * 0.6;
    scene.add(c); clouds.push(c);
  }

  // ---------- 標籤 ----------
  const labels = islandObjs.map(g => {
    const key = g.userData.key;
    const d = document.createElement('button');
    d.className = 'ilabel';
    if (key === 'lab') d.innerHTML = '<b>🛠 中央工坊</b><small>自由實驗室</small>';
    else {
      const isl = ISLANDS.find(i => i.id === key);
      const total = LEVELS.filter(l => l.island === key).length;
      d.innerHTML = `<b>${isl.icon} ${isl.name}</b><small>${isl.locked ? '🔒 建造中' : `第 ${isl.id} 島 · ${doneCount(key)}/${total} ${doneCount(key) === total ? '🏅' : ''}`}</small>`;
      if (isl.locked) d.classList.add('lockedlabel');
    }
    d.addEventListener('click', () => openPanel(key));
    $('#labels').appendChild(d);
    return { g, d };
  });

  // ---------- 互動 ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9), par = new THREE.Vector2();
  let hovered = null;
  renderer.domElement.addEventListener('pointermove', e => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    par.copy(mouse);
  });
  renderer.domElement.addEventListener('click', () => { if (hovered) openPanel(hovered.userData.key); });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h;
    // 窄螢幕時往後退，確保七座島都看得到
    const k = Math.max(1, 1.55 / camera.aspect);
    camera.position.copy(camBase).multiplyScalar(Math.min(k, 2.2));
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3(), look = new THREE.Vector3(0, 3, 0);
  function tick() {
    const t = clock.getElapsedTime();
    islandObjs.forEach(g => {
      g.position.y = g.userData.base.y + Math.sin(t * 0.7 + g.userData.phase) * 0.3;
      g.children[0].children.forEach(c => { if (c.userData.float !== undefined) c.position.y += Math.sin(t + c.userData.float) * 0.003; });
      const s = g === hovered ? 1.06 : 1; g.scale.lerp(tmp.set(s, s, s), 0.15);
    });
    gears.forEach(o => { o.mesh.rotation.z += o.speed * 0.016; });
    animated.forEach(f => f(t));
    clouds.forEach(c => { c.position.x += c.userData.speed * 0.016; if (c.position.x > 65) c.position.x = -65; });
    // 滑鼠視差：視線輕微跟著游標
    look.lerp(tmp.set(par.x * 1.5, 3 + par.y * 0.8, 0), 0.05);
    camera.lookAt(look);

    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, true)[0];
    let h = null;
    if (hit) { let o = hit.object; while (o && !pickables.includes(o)) o = o.parent; h = o; }
    hovered = h; renderer.domElement.style.cursor = h ? 'pointer' : 'default';

    const w = host.clientWidth, hgt = host.clientHeight;
    labels.forEach(({ g, d }) => {
      tmp.copy(g.position); tmp.y += g.userData.key === 'lab' ? 5.2 : 5.6;
      tmp.project(camera);
      d.style.transform = `translate(-50%,-100%) translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * hgt}px)`;
      d.classList.toggle('hover', g === hovered);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
