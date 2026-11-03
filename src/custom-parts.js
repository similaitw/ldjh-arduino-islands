// 自製零件外觀（wokwi-elements 沒有的）：直流馬達、L298N 馬達驅動板、繼電器模組
// 介面比照 wokwi-elements：提供 pinInfo（像素座標）與可設定的屬性

class SvgPart extends HTMLElement {
  connectedCallback() { if (!this._done) { this._done = true; this.innerHTML = this.svg(); this.init?.(); } }
}

// ---------- 直流馬達（附風扇葉片，依轉速旋轉） ----------
class DcMotor extends SvgPart {
  constructor() {
    super();
    this.pinInfo = [{ name: 'M1', x: 32, y: 86, signals: [] }, { name: 'M2', x: 52, y: 86, signals: [] }];
    this._speed = 0; this._angle = 0; this._last = 0;
  }
  set speed(v) { this._speed = v; }
  get speed() { return this._speed; }
  svg() {
    return `<svg width="84" height="88" viewBox="0 0 84 88" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="34" width="48" height="40" rx="6" fill="#9aa3ad" stroke="#59616b"/>
      <rect x="18" y="40" width="48" height="6" fill="#7d858f"/><rect x="18" y="62" width="48" height="6" fill="#7d858f"/>
      <rect x="38" y="24" width="8" height="12" fill="#c8963e"/>
      <g class="fan" transform="translate(42 22)">
        <circle r="5" fill="#333"/>
        <path d="M0 0 C 6 -6, 20 -10, 22 -2 C 14 2, 6 2, 0 0Z" fill="#4fa3e0" opacity=".92"/>
        <path d="M0 0 C 6 -6, 20 -10, 22 -2 C 14 2, 6 2, 0 0Z" fill="#4fa3e0" opacity=".92" transform="rotate(120)"/>
        <path d="M0 0 C 6 -6, 20 -10, 22 -2 C 14 2, 6 2, 0 0Z" fill="#4fa3e0" opacity=".92" transform="rotate(240)"/>
      </g>
      <rect x="28" y="74" width="8" height="12" fill="#d32f2f"/><rect x="48" y="74" width="8" height="12" fill="#222"/>
      <text class="rpm" x="42" y="58" font-size="9" font-family="monospace" text-anchor="middle" fill="#1d3557">0%</text>
    </svg>`;
  }
  init() {
    this.fan = this.querySelector('.fan'); this.rpm = this.querySelector('.rpm');
    const step = t => {
      const dt = this._last ? Math.min(0.05, (t - this._last) / 1000) : 0; this._last = t;
      this._angle = (this._angle + this._speed * dt * 900) % 360;
      this.fan.setAttribute('transform', `translate(42 22) rotate(${this._angle})`);
      const pct = Math.round(this._speed * 100);
      this.rpm.textContent = (pct > 0 ? '↻ ' : pct < 0 ? '↺ ' : '') + Math.abs(pct) + '%';
      if (this.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

// ---------- L298N 馬達驅動板（簡化：VCC 同時供給邏輯與馬達） ----------
class L298N extends SvgPart {
  constructor() {
    super();
    this.pinInfo = [
      { name: 'OUT1', x: 120, y: 30, signals: [] }, { name: 'OUT2', x: 120, y: 52, signals: [] },
      { name: 'ENA', x: 22, y: 96, signals: [] }, { name: 'IN1', x: 38, y: 96, signals: [] }, { name: 'IN2', x: 54, y: 96, signals: [] },
      { name: 'VCC', x: 78, y: 96, signals: [] }, { name: 'GND', x: 94, y: 96, signals: [] },
    ];
  }
  set power(v) { this.querySelector?.('.pwr')?.setAttribute('fill', v ? '#ff3b3b' : '#5a1f1f'); }
  svg() {
    const pins = ['ENA', 'IN1', 'IN2', 'VCC', 'GND'].map((n, i) => {
      const x = [22, 38, 54, 78, 94][i];
      return `<rect x="${x - 3}" y="84" width="6" height="12" fill="#d8b04a"/><text x="${x}" y="80" font-size="6.5" text-anchor="middle" fill="#fff" font-family="monospace">${n}</text>`;
    }).join('');
    return `<svg width="122" height="98" viewBox="0 0 122 98" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="108" height="82" rx="4" fill="#c62828" stroke="#7f1717"/>
      <rect x="30" y="10" width="44" height="34" fill="#222"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${32 + i * 7}" y="12" width="4" height="30" fill="#444"/>`).join('')}
      <rect x="100" y="20" width="16" height="42" rx="2" fill="#1f63b5"/>
      <circle cx="108" cy="30" r="3" fill="#ccc"/><circle cx="108" cy="52" r="3" fill="#ccc"/>
      <text x="96" y="30" font-size="6.5" text-anchor="end" fill="#fff" font-family="monospace">OUT1</text>
      <text x="96" y="54" font-size="6.5" text-anchor="end" fill="#fff" font-family="monospace">OUT2</text>
      <circle class="pwr" cx="14" cy="14" r="3" fill="#5a1f1f"/>
      <text x="10" y="58" font-size="9" font-weight="bold" fill="#fff" font-family="sans-serif">L298N</text>
      ${pins}
    </svg>`;
  }
}

// ---------- 繼電器模組（高電位觸發） ----------
class RelayModule extends SvgPart {
  constructor() {
    super();
    this.pinInfo = [
      { name: 'VCC', x: 0, y: 16, signals: [] }, { name: 'GND', x: 0, y: 32, signals: [] }, { name: 'IN', x: 0, y: 48, signals: [] },
      { name: 'NO', x: 110, y: 16, signals: [] }, { name: 'COM', x: 110, y: 32, signals: [] }, { name: 'NC', x: 110, y: 48, signals: [] },
    ];
    this._on = false;
  }
  set on(v) {
    if (v === this._on && this._init) return; this._on = v; this._init = true;
    const led = this.querySelector?.('.led'), arm = this.querySelector?.('.arm');
    if (led) led.setAttribute('fill', v ? '#ff3b3b' : '#5a1f1f');
    if (arm) arm.setAttribute('transform', v ? 'rotate(-18 86 32)' : 'rotate(18 86 32)');
  }
  get on() { return this._on; }
  svg() {
    const lbl = (t, x, y, a = 'start') => `<text x="${x}" y="${y}" font-size="7" fill="#fff" font-family="monospace" text-anchor="${a}">${t}</text>`;
    return `<svg width="112" height="64" viewBox="0 0 112 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="106" height="60" rx="4" fill="#1f5fa8" stroke="#123a66"/>
      <rect x="30" y="10" width="38" height="40" rx="2" fill="#2d7fd6" stroke="#0e3d73"/>
      <text x="49" y="28" font-size="6" fill="#fff" text-anchor="middle" font-family="sans-serif">RELAY</text>
      <text x="49" y="38" font-size="5" fill="#cfe3ff" text-anchor="middle" font-family="sans-serif">5V DC</text>
      <circle class="led" cx="20" cy="56" r="3" fill="#5a1f1f"/>
      <rect x="78" y="8" width="26" height="48" fill="#1b9e4b" stroke="#0f6630"/>
      <line class="arm" x1="86" y1="32" x2="100" y2="32" stroke="#fff" stroke-width="2" transform="rotate(18 86 32)"/>
      ${lbl('VCC', 5, 18)}${lbl('GND', 5, 34)}${lbl('IN', 5, 50)}
      ${lbl('NO', 104, 18, 'end')}${lbl('COM', 104, 34, 'end')}${lbl('NC', 104, 50, 'end')}
    </svg>`;
  }
}

customElements.define('ardu-dc-motor', DcMotor);
customElements.define('ardu-l298n', L298N);
customElements.define('ardu-relay', RelayModule);
