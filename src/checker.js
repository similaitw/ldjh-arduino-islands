// 關卡自動檢查：一邊執行學生的程式，一邊操作零件並量測結果
import { pinNumberToName } from './parts.js';

class CheckFail extends Error {}

export function createCtx({ circuit, runtime, onStep }) {
  const steps = [];
  const t0 = performance.now();
  const step = (ok, msg) => { steps.push({ ok, msg }); onStep?.({ ok, msg }); };

  const ctx = {
    steps,
    now: () => performance.now(),
    wait: ms => new Promise(r => setTimeout(r, ms)),

    // 斷言：通過記一筆 ✔，失敗記 ✘ 並中止
    expect(cond, okMsg, failMsg) {
      if (runtime.lastError) { step(false, '程式執行時發生錯誤：' + runtime.lastError); throw new CheckFail(); }
      if (cond) step(true, okMsg); else { step(false, failMsg || okMsg); throw new CheckFail(); }
    },
    note: msg => step(true, msg),

    // ---- 電路查詢 ----
    parts: type => [...circuit.comps.values()].filter(c => c.type === type),
    net: (node, raw = false) => circuit.netNodes(node, raw),
    // 兩個節點是否（經過電阻也算）相連
    linked: (a, b) => circuit.netNodes(a).includes(b),
    // 兩個節點是否「直接」相連（不經過電阻）
    direct: (a, b) => circuit.netNodes(a, true).includes(b),
    toGnd: node => circuit.netNodes(node).includes('uno:GND'),
    // 找出陽極接到某腳位的 LED
    ledOnPin(pin) {
      const name = 'uno:' + pinNumberToName(pin);
      return ctx.parts('led').find(l => circuit.netNodes(l.id + ':A').includes(name)) || null;
    },
    hasResistor(led, pin) {
      const name = 'uno:' + pinNumberToName(pin);
      return !circuit.netNodes(led.id + ':A', true).includes(name) || !circuit.netNodes(led.id + ':C', true).includes('uno:GND');
    },

    // ---- 量測 ----
    ledOn(led) {
      const a = circuit.level(led.id + ':A'), c = circuit.level(led.id + ':C');
      return a != null && c != null && a - c > 0.3;
    },
    pinOut(pin) { // 0~255
      const s = runtime.pins[pin];
      if (s.mode !== 'OUTPUT') return 0;
      return s.pwm != null ? s.pwm : s.value * 255;
    },
    rgb(c) {
      const com = circuit.level(c.id + ':COM');
      const ch = p => { const v = circuit.level(c.id + ':' + p); return com === 0 && v != null ? v / 5 : 0; };
      return { r: ch('R'), g: ch('G'), b: ch('B') };
    },
    motor: m => circuit.motorSpeed(m),
    relayOn: r => { circuit.struct(); return !!circuit.relayStates?.get(r.id); },
    servoAngle(sv) {
      for (const p of circuit.unoPinsInNet(sv.id + ':PWM')) { const s = runtime.servoOnPin(p); if (s) return s.angle; }
      return null;
    },
    // 七段顯示器：把亮起的段落解碼成數字（看不懂回傳 null）
    seg7Digit(c) {
      const com = circuit.level(c.id + ':COM.1');
      const bits = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(s => { const v = circuit.level(c.id + ':' + s); return com === 0 && v != null && v > 2.5 ? 1 : 0; }).join('');
      const T = { '1111110': 0, '0110000': 1, '1101101': 2, '1111001': 3, '0110011': 4, '1011011': 5, '1011111': 6, '1110000': 7, '1111111': 8, '1111011': 9, '0000000': '空白' };
      return bits in T ? T[bits] : '?' + bits;
    },
    lcdLines(c) { const l = circuit.lcdFor(c); return l && circuit.powered(c.id) ? l.text() : null; },
    stripColors(c) { const st = circuit.stripFor(c); return st && circuit.powered(c.id) ? st.shown.map(v => ({ r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 })) : null; },
    serial: () => runtime.serialLog,
    writes: pin => runtime.writeLog.filter(w => w.p === pin),

    // 每 interval 毫秒取樣一次 fn()，持續 duration
    async sample(fn, duration, interval = 10) {
      const out = []; const start = performance.now();
      while (performance.now() - start < duration) {
        if (runtime.lastError) break;
        out.push({ t: performance.now() - start, v: fn() });
        await ctx.wait(interval);
      }
      return out;
    },

    // ---- 操作零件 ----
    press(btn) { btn.pressed = true; btn.el.pressed = true; circuit.invalidate(); },
    release(btn) { btn.pressed = false; btn.el.pressed = false; circuit.invalidate(); },
    async bouncyPress(btn, down = true) {
      for (let i = 0; i < 4; i++) {
        down ? ctx.press(btn) : ctx.release(btn); await ctx.wait(2);
        down ? ctx.release(btn) : ctx.press(btn); await ctx.wait(2);
      }
      down ? ctx.press(btn) : ctx.release(btn);
    },
    setProp(comp, key, v) { comp.props[key] = v; if (comp.type === 'pot') comp.el.value = v; circuit.invalidate(); },
    send(text) { runtime.rx += text + '\n'; },
    elapsed: () => performance.now() - t0,
  };
  return ctx;
}

// 把取樣結果切成連續相同值的區段
export function segments(samples, key = v => v) {
  const segs = [];
  for (const s of samples) {
    const k = key(s.v);
    const last = segs[segs.length - 1];
    if (last && last.k === k) last.end = s.t;
    else { if (last) last.end = s.t; segs.push({ k, start: s.t, end: s.t }); }
  }
  segs.forEach(s => { s.dur = s.end - s.start; });
  return segs;
}

export async function runCheck(level, { circuit, runtime, code, onStep }) {
  const ctx = createCtx({ circuit, runtime, onStep });
  runtime.run(code);
  await ctx.wait(60);
  let ok = false;
  try {
    await level.check(ctx);
    ok = true;
  } catch (e) {
    if (!(e instanceof CheckFail)) ctx.steps.push({ ok: false, msg: '檢查時發生意外：' + e.message });
  }
  runtime.stop();
  return { ok, steps: ctx.steps };
}

export { CheckFail };
