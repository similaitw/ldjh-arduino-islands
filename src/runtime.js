// Arduino 執行環境：提供 API 給轉譯後的程式
import { transpile } from './transpile.js';
import { pinNumberToName, UNO_PINS } from './parts.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
class StopSignal extends Error {}

// 字串方法補強（Arduino String）
if (!String.prototype.toInt) {
  Object.assign(String.prototype, {
    toInt() { return parseInt(this) || 0; },
    toFloat() { return parseFloat(this) || 0; },
    equals(s) { return this == s; },
    equalsIgnoreCase(s) { return this.toLowerCase() === String(s).toLowerCase(); },
  });
}

const fastYield = (() => {
  const ch = new MessageChannel(); const q = [];
  ch.port1.onmessage = () => q.shift()?.();
  return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); });
})();

export class Runtime {
  constructor({ circuit, onSerial, onError, onWarn, onState }) {
    this.circuit = circuit; circuit.runtime = this;
    this.onSerial = t => { this.serialLog += t; if (this.serialLog.length > 50000) this.serialLog = this.serialLog.slice(-30000); onSerial(t); }; this.onError = onError; this.onWarn = onWarn; this.onState = onState || (() => {});
    this.reset();
    this.audio = null; this.osc = null; this.muted = false;
  }

  reset() {
    this.pins = Array.from({ length: 20 }, () => ({ mode: 'INPUT', value: 0, pwm: null }));
    this.tones = {}; this.servos = []; this.rx = '';
    this.serialLog = ''; this.writeLog = []; this.lastError = null;
    this.running = false; this.stopped = true; this.warned = new Set();
    this.updateSound();
  }

  warnOnce(key, msg) { if (!this.warned.has(key)) { this.warned.add(key); this.onWarn(msg); } }

  // 腳位對外輸出的電壓（null = 高阻抗 / 輸入）
  pinDrive(p) {
    const s = this.pins[p]; if (!s || s.mode !== 'OUTPUT') return null;
    return s.pwm != null ? s.pwm / 255 * 5 : s.value * 5;
  }

  logWrite(p, v) {
    this.writeLog.push({ t: performance.now(), p, v });
    if (this.writeLog.length > 20000) this.writeLog.splice(0, 10000);
  }

  servoOnPin(p) { return this.servos.find(s => s.pin === p); }

  // ---------- 執行 ----------
  async run(code) {
    this.stop(); this.reset();
    let js, info;
    try { ({ js, info } = transpile(code)); }
    catch (e) { this.lastError = e.message; this.onError(`轉譯錯誤：${e.message}`); return; }
    info.warnings.forEach(w => this.onWarn(w));
    const api = this.api();
    let prog;
    try {
      const fn = new AsyncFunction(...Object.keys(api), js + '\n;return { setup: typeof setup === "function" ? setup : null, loop: typeof loop === "function" ? loop : null };');
      this.stopped = false; this.running = true; this.onState(true);
      this.start = performance.now(); this.lastYield = this.start; this.ticks = 0;
      prog = await fn(...Object.values(api));
    } catch (e) { this.fail(e, js); return; }
    if (!prog.setup || !prog.loop) { this.onError('程式需要同時有 void setup() 與 void loop()。'); this.stop(); return; }
    try {
      await prog.setup();
      while (!this.stopped) { await prog.loop(); await this.tick(true); }
    } catch (e) { this.fail(e, js); }
  }

  fail(e, js) {
    if (e instanceof StopSignal) return;
    let msg = e.message || String(e);
    msg = msg.replace(/^(\w+) is not defined$/, '找不到名稱「$1」（變數未宣告、拼字錯誤，或使用了尚未支援的函式）')
      .replace(/Unexpected token/, '語法錯誤：出現非預期的符號')
      .replace(/Unexpected identifier '?(\w+)'?/, '語法錯誤：非預期的名稱「$1」（檢查是否漏了分號或括號）')
      .replace(/(\w+) is not a function/, '「$1」不是函式')
      .replace(/missing \) after argument list/, '函式呼叫的括號或逗號有問題（例如少了逗號或右括號）')
      .replace(/Unexpected end of input/, '程式不完整，可能少了右大括號 }')
      .replace(/Invalid or unexpected token/, '出現無法辨識的符號（檢查引號是否成對）');
    this.lastError = msg;
    this.onError(`${e instanceof SyntaxError ? '語法錯誤' : '執行錯誤'}：${msg}`);
    console.debug(js);
    this.stop();
  }

  stop() {
    if (!this.stopped) { this.stopped = true; this.running = false; this.onState(false); }
    this.tones = {}; this.updateSound();
  }

  async tick(force = false) {
    if (this.stopped) throw new StopSignal();
    if (force || (++this.ticks & 127) === 0) {
      const now = performance.now();
      if (force || now - this.lastYield > 12) {
        this.lastYield = now;
        await (now - this.start > 0 && force ? fastYield() : new Promise(r => setTimeout(r, 0)));
        if (this.stopped) throw new StopSignal();
      }
    }
  }

  async sleep(ms) {
    const end = performance.now() + Math.max(0, ms);
    while (true) {
      if (this.stopped) throw new StopSignal();
      const left = end - performance.now();
      if (left <= 0) break;
      await new Promise(r => setTimeout(r, Math.min(left, 30)));
    }
    this.lastYield = performance.now();
    if (this.stopped) throw new StopSignal();
  }

  checkPin(p, fn) {
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 0 || p > 19) throw new Error(`${fn}() 的腳位 ${p} 不存在（Uno 為 0~13、A0~A5）`);
  }

  // ---------- 聲音 ----------
  updateSound() {
    const freq = Object.values(this.tones).find(f => f);
    const audible = freq && !this.muted && [...this.circuit.comps.values()].some(c => c.type === 'buzzer' && c.sounding !== false);
    try {
      if (audible) {
        if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
        if (!this.osc) {
          this.osc = this.audio.createOscillator(); this.gain = this.audio.createGain();
          this.osc.type = 'square'; this.gain.gain.value = 0.04;
          this.osc.connect(this.gain).connect(this.audio.destination); this.osc.start();
        }
        this.osc.frequency.setValueAtTime(freq, this.audio.currentTime);
      } else if (this.osc) { this.osc.stop(); this.osc.disconnect(); this.osc = null; }
    } catch (e) { /* 部分環境不支援音訊 */ }
  }

  // ---------- 提供給程式的 API ----------
  api() {
    const rt = this, c = this.circuit;
    const fmt = (v, f) => {
      if (typeof v === 'boolean') return v ? '1' : '0';
      if (typeof v === 'number') {
        if (Number.isNaN(v)) return 'nan';
        if (!Number.isInteger(v)) return v.toFixed(f != null && f >= 0 && f <= 10 ? f : 2);
        if (f === 16 || f === 8 || f === 2) return (v >>> 0).toString(f).toUpperCase();
        if (f != null && f >= 0 && f <= 9) return v.toFixed(f);
        return String(v);
      }
      return String(v);
    };
    const Serial = {
      begin(baud) { rt.baud = baud; },
      end() {},
      print(v, f) { rt.onSerial(fmt(v, f)); },
      println(v = '', f) { rt.onSerial(fmt(v, f) + '\n'); },
      write(v) { rt.onSerial(typeof v === 'number' ? String.fromCharCode(v) : String(v)); },
      available() { return rt.rx.length; },
      read() { if (!rt.rx.length) return -1; const ch = rt.rx.charCodeAt(0); rt.rx = rt.rx.slice(1); return ch; },
      peek() { return rt.rx.length ? rt.rx.charCodeAt(0) : -1; },
      readString() { const s = rt.rx; rt.rx = ''; return s; },
      readStringUntil(t) { const ch = typeof t === 'number' ? String.fromCharCode(t) : t; const i = rt.rx.indexOf(ch); const s = i < 0 ? rt.rx : rt.rx.slice(0, i); rt.rx = i < 0 ? '' : rt.rx.slice(i + 1); return s; },
      parseInt() { const m = rt.rx.match(/-?\d+/); if (!m) return 0; rt.rx = rt.rx.slice(m.index + m[0].length); return +m[0]; },
      parseFloat() { const m = rt.rx.match(/-?\d+(\.\d+)?/); if (!m) return 0; rt.rx = rt.rx.slice(m.index + m[0].length); return +m[0]; },
      flush() {}, setTimeout() {},
    };

    class Servo {
      constructor() { this.pin = null; this.angle = 90; }
      attach(pin) { rt.checkPin(pin, 'attach'); this.pin = pin; if (!rt.servos.includes(this)) rt.servos.push(this); return 1; }
      detach() { this.pin = null; }
      attached() { return this.pin != null; }
      write(v) { this.angle = v >= 544 ? (Math.min(2400, v) - 544) / (2400 - 544) * 180 : Math.max(0, Math.min(180, v)); }
      writeMicroseconds(us) { this.write(Math.max(544, us)); }
      read() { return Math.round(this.angle); }
    }

    class DHT {
      constructor(pin, type = 22) { this.pin = pin; this.type = type; }
      begin() {}
      _sensor() {
        const s = c.findConnected(this.pin, 'dht', 'SDA')[0];
        return s && c.powered(s.id) ? s : null;
      }
      readTemperature(f = false) {
        const s = this._sensor(); if (!s) { rt.warnOnce('dht' + this.pin, `DHT 讀取失敗：腳位 ${this.pin} 沒接到有供電的 DHT22（回傳 NaN）`); return NaN; }
        let t = +s.props.temp; if (this.type === 11) t = Math.round(t);
        return f ? t * 9 / 5 + 32 : t;
      }
      readHumidity() {
        const s = this._sensor(); if (!s) return NaN;
        return this.type === 11 ? Math.round(+s.props.hum) : +s.props.hum;
      }
      computeHeatIndex(t, h) { return t; }
    }

    const api = {
      __tick: () => rt.tick(),
      __i: v => { const n = Math.trunc(Number(v)); return Number.isFinite(n) ? n : 0; },
      Serial, Servo, DHT,
      HIGH: 1, LOW: 0, INPUT: 'INPUT', OUTPUT: 'OUTPUT', INPUT_PULLUP: 'INPUT_PULLUP', LED_BUILTIN: 13,
      A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19, DEC: 10, HEX: 16, OCT: 8, BIN: 2, DHT11: 11, DHT22: 22,
      PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: Math.PI * 2, CHANGE: 1, RISING: 3, FALLING: 2,
      pinMode(p, m) {
        rt.checkPin(p, 'pinMode');
        if (!['INPUT', 'OUTPUT', 'INPUT_PULLUP'].includes(m)) throw new Error(`pinMode 的模式必須是 INPUT、OUTPUT 或 INPUT_PULLUP`);
        rt.pins[p].mode = m; if (m !== 'OUTPUT') rt.pins[p].pwm = null;
        c.pinChanged();
      },
      digitalWrite(p, v) {
        rt.checkPin(p, 'digitalWrite');
        const s = rt.pins[p];
        if (s.mode !== 'OUTPUT') {
          if (v) { s.mode = 'INPUT_PULLUP'; }
          rt.warnOnce('dw' + p, `腳位 ${pinNumberToName(p)} 尚未設定 pinMode(${pinNumberToName(p)}, OUTPUT) 就 digitalWrite，真實 Arduino 上 LED 會很暗或不亮`);
          return;
        }
        const nv = v ? 1 : 0;
        if (nv !== s.value || s.pwm != null) rt.logWrite(p, nv * 255);
        s.value = nv; s.pwm = null;
        c.pinChanged();
      },
      digitalRead(p) {
        rt.checkPin(p, 'digitalRead');
        const s = rt.pins[p];
        if (s.mode === 'OUTPUT') return s.value;
        const lv = c.level('uno:' + pinNumberToName(p));
        if (lv == null) {
          if (s.mode === 'INPUT_PULLUP') return 1;
          rt.warnOnce('float' + p, `腳位 ${pinNumberToName(p)} 處於浮接狀態（沒接訊號也沒上拉/下拉電阻），讀值不穩定。建議改用 INPUT_PULLUP。`);
          return Math.random() < 0.5 ? 1 : 0;
        }
        return lv > 2.5 ? 1 : 0;
      },
      analogRead(p) {
        if (p >= 0 && p <= 5) p += 14;
        if (p < 14 || p > 19) throw new Error(`analogRead() 只能用 A0~A5，收到 ${p}`);
        const lv = c.level('uno:' + pinNumberToName(p));
        if (lv == null) { rt.warnOnce('afloat' + p, `${pinNumberToName(p)} 沒有接任何訊號，analogRead 會讀到雜訊`); return 300 + Math.floor(Math.random() * 300); }
        return Math.max(0, Math.min(1023, Math.round(lv / 5 * 1023)));
      },
      analogWrite(p, v) {
        rt.checkPin(p, 'analogWrite');
        v = Math.max(0, Math.min(255, Math.trunc(v)));
        const s = rt.pins[p]; s.mode = 'OUTPUT';
        if (!UNO_PINS.pwm.includes(p)) {
          rt.warnOnce('pwm' + p, `腳位 ${pinNumberToName(p)} 不支援 PWM（Uno 只有 ~3、5、6、9、10、11），analogWrite 只會輸出 HIGH 或 LOW`);
          s.pwm = null; s.value = v >= 128 ? 1 : 0; return;
        }
        if (s.pwm !== v) rt.logWrite(p, v);
        s.pwm = v;
        c.pinChanged();
      },
      delay: ms => rt.sleep(ms),
      delayMicroseconds: us => us >= 1000 ? rt.sleep(us / 1000) : rt.tick(),
      millis: () => Math.floor(performance.now() - rt.start),
      micros: () => Math.floor((performance.now() - rt.start) * 1000),
      async pulseIn(p, state = 1, timeout = 1000000) {
        rt.checkPin(p, 'pulseIn');
        const s = c.findConnected(p, 'sr04', 'ECHO')[0];
        if (!s || !c.powered(s.id)) { rt.warnOnce('pin' + p, `pulseIn：腳位 ${pinNumberToName(p)} 沒接到有供電的 HC-SR04 ECHO，回傳 0`); await rt.sleep(Math.min(timeout / 1000, 50)); return 0; }
        const trig = c.unoPinsInNet(s.id + ':TRIG');
        if (!trig.length || rt.pins[trig[0]].mode !== 'OUTPUT') { rt.warnOnce('trig' + p, 'HC-SR04 的 TRIG 沒有接到設為 OUTPUT 的腳位'); return 0; }
        const d = +s.props.distance;
        if (d > 400 || d < 2) { await rt.sleep(Math.min(timeout / 1000, 38)); return d > 400 ? 0 : 116; }
        // 雜訊模式：模擬真實超音波偶爾量到 0 或超出範圍的錯誤值
        if (s.props.glitch && Math.random() < 0.25) { await rt.sleep(2); return Math.random() < 0.5 ? 0 : 23800; }
        const us = Math.round(d * 58);
        await rt.sleep(Math.max(1, us / 1000));
        return us;
      },
      tone(p, f, dur) {
        rt.checkPin(p, 'tone'); rt.pins[p].mode = 'OUTPUT';
        rt.tones[p] = f; rt.updateSound();
        if (dur) setTimeout(() => { if (rt.tones[p] === f) { delete rt.tones[p]; rt.updateSound(); } }, dur);
      },
      noTone(p) { delete rt.tones[p]; rt.updateSound(); },
      map: (x, a, b, c2, d) => Math.trunc((x - a) * (d - c2) / (b - a) + c2),
      constrain: (x, a, b) => Math.min(Math.max(x, a), b),
      random: (a, b) => b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a)),
      randomSeed() {},
      abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt, sq: x => x * x,
      sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2, floor: Math.floor, ceil: Math.ceil, round: Math.round,
      isnan: Number.isNaN, isinf: x => !Number.isFinite(x) && !Number.isNaN(x),
      bitRead: (x, n) => (x >> n) & 1, bitSet: (x, n) => x | (1 << n), bitClear: (x, n) => x & ~(1 << n),
      bit: n => 1 << n, highByte: x => (x >> 8) & 0xff, lowByte: x => x & 0xff,
      attachInterrupt() { throw new Error('attachInterrupt 尚未支援，請先用輪詢（在 loop 裡 digitalRead）'); },
      digitalPinToInterrupt: p => p,
    };
    return api;
  }
}
