// 電路模型 + 接線畫布
import { PARTS, pinNameToNumber, pinNumberToName } from './parts.js';

const LABEL_H = 20;
const UNO_GND = new Set(['GND.1', 'GND.2', 'GND.3']);

function normUnoPin(name) {
  if (UNO_GND.has(name)) return 'GND';
  if (name === 'A4.2') return 'A4';
  if (name === 'A5.2') return 'A5';
  return name;
}

class UF {
  constructor() { this.p = new Map(); }
  find(x) { if (!this.p.has(x)) this.p.set(x, x); let r = x; while (this.p.get(r) !== r) r = this.p.get(r); this.p.set(x, r); return r; }
  union(a, b) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p.set(ra, rb); }
}

// LDR 模組 AO 電壓（越暗越高），參考 Wokwi 的 gamma 模型
export function ldrVoltage(lux) {
  const R = 50000 * Math.pow(10, 0.7) / Math.pow(Math.max(lux, 0.01), 0.7);
  return 5 * R / (R + 10000);
}

export class Circuit {
  constructor({ stage, wireSvg, pinLayer, onChange, onSelect }) {
    this.stage = stage; this.wireSvg = wireSvg; this.pinLayer = pinLayer;
    this.onChange = onChange || (() => {}); this.onSelect = onSelect || (() => {});
    this.comps = new Map(); this.wires = [];
    this.runtime = null; this.counter = {}; this.wireColor = '#2e7d32';
    this.pending = null; this.selected = null; this._struct = null;
    this._bindStage();
  }

  // ---------- 模型 ----------
  addComp(type, x, y, props = {}, id = null) {
    const def = PARTS[type];
    if (!id) {
      this.counter[type] = (this.counter[type] || 0) + 1;
      id = type === 'uno' ? 'uno' : def.prefix + this.counter[type];
      while (this.comps.has(id)) { this.counter[type]++; id = def.prefix + this.counter[type]; }
    } else {
      const n = parseInt(id.replace(/^\D+/, '')) || 0;
      this.counter[type] = Math.max(this.counter[type] || 0, n);
    }
    const comp = { id, type, x, y, props: { ...(def.props || {}), ...props }, pressed: false };
    const wrap = document.createElement('div');
    wrap.className = 'comp'; wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
    const label = document.createElement('div');
    label.className = 'comp-label'; label.textContent = `⠿ ${id}`;
    label.title = '拖曳移動，點一下選取';
    const el = document.createElement(def.tag);
    if (type === 'led') el.color = comp.props.color;
    if (type === 'button') el.color = comp.props.color;
    if (type === 'resistor') el.value = String(comp.props.value);
    if (type === 'lcd') el.pins = 'i2c';
    if (type === 'strip') { el.rows = 1; el.cols = 8; }
    if (type === 'seg7') el.color = comp.props.color;
    wrap.append(label, el);
    this.stage.appendChild(wrap);
    comp.wrap = wrap; comp.el = el; comp.label = label;
    this.comps.set(id, comp);

    label.addEventListener('pointerdown', e => this._startDrag(e, comp));
    if (type === 'button') {
      el.addEventListener('button-press', () => { comp.pressed = true; this.invalidate(); });
      el.addEventListener('button-release', () => { comp.pressed = false; this.invalidate(); });
    }
    if (type === 'pot') {
      el.addEventListener('input', e => { comp.props.value = +(e.detail ?? el.value); this.onChange('prop'); });
      if (comp.props.value != null) el.value = comp.props.value;
    }
    // 等元件渲染完成再畫腳位
    requestAnimationFrame(() => { this.renderPins(); this.renderWires(); });
    this.invalidate(); this.onChange('struct');
    return comp;
  }

  removeComp(id) {
    if (id === 'uno') return;
    const c = this.comps.get(id); if (!c) return;
    c.wrap.remove(); this.comps.delete(id);
    this.wires = this.wires.filter(w => !w.a.startsWith(id + ':') && !w.b.startsWith(id + ':'));
    this.select(null); this.renderPins(); this.renderWires(); this.invalidate(); this.onChange('struct');
  }

  addWire(a, b, color) {
    if (a === b) return;
    if (this.wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return;
    const autoColor = [a, b].some(n => /:GND/.test(n)) ? '#222' : [a, b].some(n => /:(5V|VCC|V\+|VDD)$/.test(n)) ? '#d32f2f' : null;
    this.wires.push({ id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), a, b, color: color || autoColor || this.wireColor });
    this.renderWires(); this.invalidate(); this.onChange('struct');
  }

  removeWire(id) {
    this.wires = this.wires.filter(w => w.id !== id);
    this.select(null); this.renderWires(); this.invalidate(); this.onChange('struct');
  }

  clear() {
    for (const c of [...this.comps.values()]) { c.wrap.remove(); }
    this.comps.clear(); this.wires = []; this.counter = {};
    this.select(null); this.renderPins(); this.renderWires(); this.invalidate();
  }

  serialize() {
    return {
      parts: [...this.comps.values()].map(c => ({ id: c.id, type: c.type, x: Math.round(c.x), y: Math.round(c.y), props: { ...c.props } })),
      wires: this.wires.map(w => ({ a: w.a, b: w.b, color: w.color })),
    };
  }

  load(data) {
    this.clear();
    for (const p of data.parts) this.addComp(p.type, p.x, p.y, p.props, p.id);
    for (const w of data.wires) this.wires.push({ id: 'w' + Math.random().toString(36).slice(2, 9), ...w });
    requestAnimationFrame(() => { this.renderPins(); this.renderWires(); });
    this.invalidate(); this.onChange('struct');
  }

  // ---------- 網路解算 ----------
  invalidate() { this._struct = null; }

  _build(mergeResistors, relayStates) {
    const uf = new UF();
    const node = (cid, pin) => cid === 'uno' ? 'uno:' + normUnoPin(pin) : cid + ':' + pin;
    for (const w of this.wires) {
      const [ca, pa] = splitNode(w.a), [cb, pb] = splitNode(w.b);
      uf.union(node(ca, pa), node(cb, pb));
    }
    for (const c of this.comps.values()) {
      if (c.type === 'button') {
        uf.union(c.id + ':1.l', c.id + ':1.r'); uf.union(c.id + ':2.l', c.id + ':2.r');
        if (c.pressed) uf.union(c.id + ':1.l', c.id + ':2.l');
      }
      if (c.type === 'resistor' && mergeResistors) uf.union(c.id + ':1', c.id + ':2');
      if (c.type === 'seg7') uf.union(c.id + ':COM.1', c.id + ':COM.2');
      if (c.type === 'relay' && relayStates) uf.union(c.id + ':COM', c.id + (relayStates.get(c.id) ? ':NO' : ':NC'));
    }
    const nets = new Map();
    for (const k of uf.p.keys()) { const r = uf.find(k); if (!nets.has(r)) nets.set(r, []); nets.get(r).push(k); }
    return { uf, nets };
  }

  struct() {
    if (!this._struct) {
      // 繼電器：先用「未切換」的電路判斷 IN 腳電位，再決定 COM 接到 NO 還是 NC
      const relays = [...this.comps.values()].filter(c => c.type === 'relay');
      let states = null;
      if (relays.length) {
        this._struct = { merged: this._build(true, null), raw: this._build(false, null) };
        states = new Map(relays.map(r => [r.id, !!this.powered(r.id) && (this.baseLevel(r.id + ':IN') ?? 0) > 2.5]));
      }
      this._struct = { merged: this._build(true, states), raw: this._build(false, states) };
      this.relayStates = states;
    }
    return this._struct;
  }

  // 腳位輸出改變時：有繼電器就要重算（它會改變電路連接）
  pinChanged() { if (this._struct && this.relayStates) this.invalidate(); }

  motorSpeed(c) {
    const a = this.level(c.id + ':M1'), b = this.level(c.id + ':M2');
    if (a == null || b == null) return 0;
    return Math.max(-1, Math.min(1, (a - b) / 5));
  }

  netNodes(nodeId, raw = false) {
    const s = raw ? this.struct().raw : this.struct().merged;
    const r = s.uf.p.has(nodeId) ? s.uf.find(nodeId) : null;
    return r ? s.nets.get(r) : [nodeId];
  }

  // 只看 Arduino 本身的驅動（電源腳、輸出腳）
  _unoDrivers(nodes) {
    const out = [];
    for (const n of nodes) {
      if (!n.startsWith('uno:')) continue;
      const pin = n.slice(4);
      if (pin === '5V' || pin === 'VIN' || pin === 'IOREF') out.push({ v: 5, src: pin });
      else if (pin === '3.3V') out.push({ v: 3.3, src: pin });
      else if (pin === 'GND') out.push({ v: 0, src: 'GND' });
      else {
        const num = pinNameToNumber(pin);
        if (num != null && this.runtime) {
          const v = this.runtime.pinDrive(num);
          if (v != null) out.push({ v, src: 'D' + pin.replace(/^(\d)/, '$1') });
        }
      }
    }
    return out;
  }

  baseLevel(nodeId, raw = false) {
    const d = this._unoDrivers(this.netNodes(nodeId, raw));
    return d.length ? d[0].v : null;
  }

  powered(cid, vccPin = 'VCC', gndPin = 'GND') {
    const v = this.baseLevel(cid + ':' + vccPin), g = this.baseLevel(cid + ':' + gndPin);
    return v != null && v >= 3 && g === 0 ? v : 0;
  }

  drivers(nodeId, raw = false) {
    const nodes = this.netNodes(nodeId, raw);
    const out = this._unoDrivers(nodes);
    for (const n of nodes) {
      const [cid, pin] = splitNode(n);
      const c = this.comps.get(cid); if (!c) continue;
      if (c.type === 'pot' && pin === 'SIG') {
        const v = this.powered(cid); if (v) out.push({ v: v * (c.props.value ?? 0) / 1023, src: cid });
      } else if (c.type === 'ldr' && (pin === 'AO' || pin === 'DO')) {
        const v = this.powered(cid); if (!v) continue;
        const ao = ldrVoltage(c.props.lux);
        out.push({ v: pin === 'AO' ? ao : (ao / 5 * 1023 > c.props.threshold ? 5 : 0), src: cid });
      } else if (c.type === 'l298n' && (pin === 'OUT1' || pin === 'OUT2')) {
        const v = this.powered(cid); if (!v) continue;
        const ena = this.baseLevel(cid + ':ENA'), frac = ena == null ? 1 : ena / 5;
        const inp = this.baseLevel(cid + (pin === 'OUT1' ? ':IN1' : ':IN2'));
        out.push({ v: (inp ?? 0) > 2.5 ? v * frac : 0, src: cid });
      } else if (c.type === 'pir' && pin === 'OUT') {
        const v = this.powered(cid); if (v) out.push({ v: c.props.motion ? 5 : 0, src: cid });
      }
    }
    return out;
  }

  level(nodeId, raw = false) {
    const d = this.drivers(nodeId, raw);
    return d.length ? d[0].v : null;
  }

  // LCD（I2C）：SDA 接 A4、SCL 接 A5 才收得到資料
  lcdFor(c) {
    const ok = this.netNodes(c.id + ':SDA').includes('uno:A4') && this.netNodes(c.id + ':SCL').includes('uno:A5');
    return ok ? this.runtime?.lcds[0] || null : null;
  }
  stripFor(c) {
    const pins = this.unoPinsInNet(c.id + ':DIN');
    return this.runtime?.strips.find(s => pins.includes(s.pin)) || null;
  }

  // 找與 Arduino 腳位 num 相連、指定類型零件的指定腳
  findConnected(num, type, pin) {
    const nodes = this.netNodes('uno:' + pinNumberToName(num));
    return nodes.map(splitNode).filter(([cid, p]) => this.comps.get(cid)?.type === type && p === pin).map(([cid]) => this.comps.get(cid));
  }

  unoPinsInNet(nodeId) {
    return this.netNodes(nodeId).filter(n => n.startsWith('uno:')).map(n => pinNameToNumber(n.slice(4))).filter(n => n != null);
  }

  // ---------- 狀態更新（每個畫格） ----------
  updateVisuals() {
    const rt = this.runtime;
    const warnings = new Set();
    for (const c of this.comps.values()) {
      const el = c.el;
      switch (c.type) {
        case 'uno': el.led13 = rt ? rt.pinDrive(13) > 2.5 : false; el.ledPower = true; break;
        case 'led': {
          const a = this.level(c.id + ':A'), k = this.level(c.id + ':C');
          const diff = a != null && k != null ? a - k : 0;
          el.value = diff > 0.3; el.brightness = Math.min(1, Math.max(0.15, diff / 5));
          if (diff < -0.3) warnings.add(`${c.id} 可能接反了（長腳 A 要接正電）`);
          if (diff > 0.3) {
            const ra = this.level(c.id + ':A', true), rk = this.level(c.id + ':C', true);
            if (ra != null && rk != null && ra - rk > 0.3) warnings.add(`${c.id} 沒有串接限流電阻，真實電路可能燒毀 LED 或腳位`);
          }
          break;
        }
        case 'rgb': {
          const com = this.level(c.id + ':COM');
          const ch = p => { const v = this.level(c.id + ':' + p); return com === 0 && v != null ? Math.max(0, v / 5) : 0; };
          el.ledRed = ch('R'); el.ledGreen = ch('G'); el.ledBlue = ch('B');
          break;
        }
        case 'buzzer': {
          let on = false;
          if (rt) for (const p of this.unoPinsInNet(c.id + ':1').concat(this.unoPinsInNet(c.id + ':2'))) {
            if (rt.tones[p] && (this.level(c.id + ':1') === 0 || this.level(c.id + ':2') === 0)) on = true;
          }
          el.hasSignal = on; c.sounding = on;
          break;
        }
        case 'servo': {
          if (!this.powered(c.id, 'V+', 'GND')) break;
          for (const p of this.unoPinsInNet(c.id + ':PWM')) {
            const s = rt?.servoOnPin(p); if (s) el.angle = s.angle;
          }
          break;
        }
        case 'motor': {
          el.speed = this.motorSpeed(c);
          const direct = ['M1', 'M2'].some(p => this.netNodes(c.id + ':' + p, true).some(n => /^uno:(\d+|A\d)$/.test(n)));
          if (direct) warnings.add(`${c.id} 直接接在 Arduino 腳位上——馬達電流太大會燒壞腳位，要透過 L298N 或繼電器`);
          break;
        }
        case 'l298n': el.power = !!this.powered(c.id); break;
        case 'seg7': {
          const com = this.level(c.id + ':COM.1');
          el.values = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'].map(s => { const v = this.level(c.id + ':' + s); return com === 0 && v != null && v > 2.5 ? 1 : 0; });
          break;
        }
        case 'lcd': {
          const lcd = rt && this.lcdFor(c);
          const on = !!this.powered(c.id);
          el.backlight = on && (!lcd || lcd.light);
          const chars = lcd && on ? lcd.buf : null;
          const key = chars ? chars.join(',') : '';
          if (c._lcdKey !== key) { c._lcdKey = key; el.characters = chars ? Uint8Array.from(chars) : new Uint8Array(32).fill(32); }
          break;
        }
        case 'strip': {
          const st = rt && this.stripFor(c);
          const px = st && this.powered(c.id) ? st.shown : null;
          const key = px ? px.join(',') : '';
          if (c._stripKey !== key) {
            c._stripKey = key;
            for (let i = 0; i < 8; i++) {
              const v = px?.[i] || 0;
              el.setPixel(0, i, { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 });
            }
          }
          break;
        }
        case 'relay': this.struct(); el.on = !!this.relayStates?.get(c.id); break;
        case 'ldr': {
          const v = this.powered(c.id);
          el.ledPower = !!v;
          el.ledDO = !!v && !(ldrVoltage(c.props.lux) / 5 * 1023 > c.props.threshold);
          break;
        }
      }
    }
    // 短路偵測
    if (rt) {
      for (let p = 0; p < 20; p++) {
        if (rt.pinDrive(p) == null) continue;
        const d = this.drivers('uno:' + pinNumberToName(p));
        if (d.some(x => Math.abs(x.v - d[0].v) > 0.5)) warnings.add(`腳位 ${pinNumberToName(p)} 與其他電源/腳位短路！`);
      }
    }
    return [...warnings];
  }

  // ---------- 畫布互動 ----------
  pinPos(nodeId) {
    const [cid, pin] = splitNode(nodeId);
    const c = this.comps.get(cid); if (!c) return null;
    const pi = (c.el.pinInfo || []).find(p => p.name === pin); if (!pi) return null;
    return { x: c.x + pi.x, y: c.y + LABEL_H + pi.y };
  }

  renderPins() {
    this.pinLayer.innerHTML = '';
    for (const c of this.comps.values()) {
      for (const pi of c.el.pinInfo || []) {
        const d = document.createElement('div');
        d.className = 'pin'; d.dataset.node = c.id + ':' + pi.name;
        d.style.left = (c.x + pi.x) + 'px'; d.style.top = (c.y + LABEL_H + pi.y) + 'px';
        let label = pi.name;
        if (c.type === 'uno') {
          const n = pinNameToNumber(pi.name);
          if (n != null && [3, 5, 6, 9, 10, 11].includes(n)) label = `D${n} (~PWM)`;
          else if (/^\d+$/.test(pi.name)) label = 'D' + pi.name;
          if (pi.name === 'A4.2') label = 'A4 / SDA'; if (pi.name === 'A5.2') label = 'A5 / SCL';
        }
        d.title = `${c.id}：${label}`;
        d.dataset.label = label;
        this.pinLayer.appendChild(d);
      }
    }
  }

  renderWires() {
    const svg = this.wireSvg;
    svg.innerHTML = '';
    for (const w of this.wires) {
      const a = this.pinPos(w.a), b = this.pinPos(w.b);
      if (!a || !b) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', wirePath(a, b));
      path.setAttribute('stroke', w.color);
      path.setAttribute('class', 'wire' + (this.selected?.kind === 'wire' && this.selected.id === w.id ? ' selected' : ''));
      path.dataset.id = w.id;
      path.addEventListener('pointerdown', e => { e.stopPropagation(); this.select({ kind: 'wire', id: w.id }); });
      const hit = path.cloneNode(); hit.setAttribute('class', 'wire-hit'); hit.dataset.id = w.id;
      hit.addEventListener('pointerdown', e => { e.stopPropagation(); this.select({ kind: 'wire', id: w.id }); });
      svg.append(path, hit);
      for (const p of [a, b]) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', 2.6); dot.setAttribute('fill', w.color);
        svg.appendChild(dot);
      }
    }
    if (this.pending) {
      const a = this.pinPos(this.pending.from);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${a.x},${a.y} L${this.pending.x},${this.pending.y}`);
      path.setAttribute('class', 'wire pending'); path.setAttribute('stroke', this.wireColor);
      svg.appendChild(path);
    }
  }

  select(sel) {
    this.selected = sel;
    for (const c of this.comps.values()) c.wrap.classList.toggle('selected', sel?.kind === 'comp' && sel.id === c.id);
    this.renderWires();
    this.onSelect(sel);
  }

  deleteSelected() {
    if (!this.selected) return;
    if (this.selected.kind === 'wire') this.removeWire(this.selected.id);
    else this.removeComp(this.selected.id);
  }

  _startDrag(e, comp) {
    e.preventDefault(); e.stopPropagation();
    this.select({ kind: 'comp', id: comp.id });
    const sx = e.clientX, sy = e.clientY, ox = comp.x, oy = comp.y;
    const move = ev => {
      comp.x = Math.max(0, ox + ev.clientX - sx); comp.y = Math.max(0, oy + ev.clientY - sy);
      comp.wrap.style.left = comp.x + 'px'; comp.wrap.style.top = comp.y + 'px';
      this.renderPins(); this.renderWires();
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); this.onChange('move'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }

  _bindStage() {
    this.pinLayer.addEventListener('pointerdown', e => {
      const pin = e.target.closest('.pin'); if (!pin) return;
      e.stopPropagation();
      const node = pin.dataset.node;
      if (!this.pending) {
        const a = this.pinPos(node);
        this.pending = { from: node, x: a.x, y: a.y };
        pin.classList.add('active');
      } else {
        const from = this.pending.from; this.pending = null;
        this.pinLayer.querySelectorAll('.pin.active').forEach(p => p.classList.remove('active'));
        this.addWire(from, node);
      }
      this.renderWires();
    });
    this.stage.addEventListener('pointermove', e => {
      if (!this.pending) return;
      const r = this.stage.getBoundingClientRect();
      this.pending.x = e.clientX - r.left; this.pending.y = e.clientY - r.top;
      this.renderWires();
    });
    this.stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.pin') || e.target.closest('.comp-label')) return;
      if (this.pending) { this.pending = null; this.pinLayer.querySelectorAll('.pin.active').forEach(p => p.classList.remove('active')); this.renderWires(); return; }
      const comp = e.target.closest('.comp');
      if (comp) {
        const c = [...this.comps.values()].find(c => c.wrap === comp);
        if (c) this.select({ kind: 'comp', id: c.id });
      } else this.select(null);
    });
  }
}

export function splitNode(n) { const i = n.indexOf(':'); return [n.slice(0, i), n.slice(i + 1)]; }

function wirePath(a, b) {
  const dy = Math.max(30, Math.abs(b.y - a.y) / 2);
  const sa = a.y < 120 ? -1 : 1;
  return `M${a.x},${a.y} C${a.x},${a.y + sa * 0 + (b.y > a.y ? dy : -dy)} ${b.x},${b.y + (b.y > a.y ? -dy : dy)} ${b.x},${b.y}`;
}
