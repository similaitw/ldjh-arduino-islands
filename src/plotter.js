// 序列埠繪圖器：把 Serial 輸出的數字畫成即時折線圖
// 支援「名稱:數值」「名稱 = 數值」或純數字（以空白、逗號分隔）
const COLORS = ['#4fc3f7', '#ffb74d', '#81c784', '#f06292', '#ba68c8', '#fff176'];
const MAX = 400;

export class Plotter {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.clear();
  }
  clear() { this.series = new Map(); this.partial = ''; this.dirty = true; }

  feed(text) {
    const lines = (this.partial + text).split('\n');
    this.partial = lines.pop();
    for (const line of lines) this.parseLine(line);
  }

  parseLine(line) {
    const pairs = [...line.matchAll(/([^\s:=,]+)\s*[:=]\s*(-?\d+(?:\.\d+)?)/g)].map(m => [m[1], +m[2]]);
    let values = pairs;
    if (!pairs.length) {
      const nums = line.trim().split(/[\s,\t]+/).filter(t => /^-?\d+(\.\d+)?$/.test(t));
      if (!nums.length) return;
      values = nums.map((v, i) => [`值${i + 1}`, +v]);
    }
    for (const [name, v] of values) {
      if (!this.series.has(name)) {
        if (this.series.size >= COLORS.length) continue;
        this.series.set(name, { color: COLORS[this.series.size], data: [] });
      }
      const s = this.series.get(name).data;
      s.push(v); if (s.length > MAX) s.shift();
    }
    this.dirty = true;
  }

  draw() {
    const c = this.canvas, g = this.ctx;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); this.dirty = true; }
    if (!this.dirty) return;
    this.dirty = false;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0f1b2b'; g.fillRect(0, 0, w, h);
    const all = [...this.series.values()].flatMap(s => s.data);
    g.font = '11px ui-monospace, Menlo, monospace';
    if (!all.length) {
      g.fillStyle = '#6f88a8'; g.textAlign = 'center';
      g.fillText('用 Serial.println(數值) 或 Serial.print("名稱:"); 輸出數字，就會畫在這裡', w / 2, h / 2);
      g.textAlign = 'left'; return;
    }
    let lo = Math.min(...all), hi = Math.max(...all);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const L = 44, R = 8, T = 22, B = 8, pw = w - L - R, ph = h - T - B;
    const y = v => T + ph - (v - lo) / (hi - lo) * ph;
    // 格線與刻度
    g.strokeStyle = '#1f3350'; g.fillStyle = '#6f88a8'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = lo + (hi - lo) * i / 4, yy = y(v);
      g.beginPath(); g.moveTo(L, yy); g.lineTo(w - R, yy); g.stroke();
      g.fillText(fmt(v), 4, yy + 4);
    }
    // 線（點數少時鋪滿寬度，滿 400 點後開始捲動）
    const n = Math.max(60, ...[...this.series.values()].map(s => s.data.length));
    for (const s of this.series.values()) {
      const d = s.data; if (d.length < 1) continue;
      g.strokeStyle = s.color; g.lineWidth = 1.8; g.beginPath();
      d.forEach((v, i) => { const xx = L + pw * (i + n - d.length) / (n - 1); i ? g.lineTo(xx, y(v)) : g.moveTo(xx, y(v)); });
      g.stroke();
    }
    // 圖例
    let x = L;
    for (const [name, s] of this.series) {
      const last = s.data[s.data.length - 1];
      const label = `${name} ${fmt(last)}`;
      g.fillStyle = s.color; g.fillRect(x, 7, 10, 3);
      g.fillStyle = '#cfe3ff'; g.fillText(label, x + 14, 12);
      x += g.measureText(label).width + 30;
    }
  }
}

const fmt = v => Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
