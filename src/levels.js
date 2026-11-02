// 第 1–3 顆星球的關卡：說明、起始狀態、自動檢查、提示、參考解答
import { segments } from './checker.js';

const UNO = { id: 'uno', type: 'uno', x: 60, y: 240 };
const ledKit = (pin, n, x, color = 'red') => ({
  parts: [{ id: 'r' + n, type: 'resistor', x: x - 40, y: 160 }, { id: 'led' + n, type: 'led', x: x + 30, y: 90, props: { color } }],
  wires: [{ a: 'uno:' + pin, b: `r${n}:1`, color: '#e67e22' }, { a: `r${n}:2`, b: `led${n}:A`, color: '#e67e22' }, { a: `led${n}:C`, b: 'uno:GND.1', color: '#222' }],
});
const circuit = (...kits) => ({ parts: [UNO, ...kits.flatMap(k => k.parts)], wires: kits.flatMap(k => k.wires) });
const buttonKit = { parts: [{ id: 'btn1', type: 'button', x: 420, y: 120 }], wires: [{ a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' }] };
const emptyBlocks = { blocks: { languageVersion: 0, blocks: [{ type: 'arduino_program', x: 20, y: 20, deletable: false }] } };
const skeleton = (comment = '') => `${comment}void setup() {

}

void loop() {

}
`;
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const ms = v => Math.round(v) + ' ms';

function needLed(ctx, pin) {
  const led = ctx.ledOnPin(pin);
  ctx.expect(led, `找到接在 D${pin} 的 LED`, `找不到接在 D${pin} 的 LED，請檢查接線（可按「重設關卡」恢復原本電路）`);
  return led;
}

export const ISLANDS = [
  { id: 1, name: '啟航星', icon: '⚓', color: '#4fa3e0', theme: '數位輸出與時間控制', desc: '從零開始接出第一個電路，掌握 pinMode、digitalWrite 與 delay 的節奏感。' },
  { id: 2, name: '光之星', icon: '💡', color: '#f2b84b', theme: 'PWM 與多燈控制', desc: '用 analogWrite 調出漸層亮度，練習時間序列與狀態切換。' },
  { id: 3, name: '開關星', icon: '🔘', color: '#5cbf7a', theme: '數位輸入與序列埠', desc: '讀取按鈕、處理機械彈跳，並透過序列埠和 Arduino 對話。' },
  { id: 4, name: '感測星', icon: '🌡️', color: '#e07a5f', theme: '感測器與校正', desc: '光敏、溫溼度、超音波；學會校正、遲滯與濾波。', locked: true },
  { id: 5, name: '動力星', icon: '⚙️', color: '#9b8ec4', theme: '伺服與馬達', desc: '讓東西動起來：伺服角度控制、馬達與繼電器。', locked: true },
  { id: 6, name: '顯示星', icon: '🖥️', color: '#5fb3b3', theme: '顯示裝置', desc: '七段顯示器、LCD1602、燈條。', locked: true },
  { id: 7, name: '專題星', icon: '🏆', color: '#c8963e', theme: '綜合專題', desc: '狀態機與多工整合：倒車雷達、溫控風扇、自動澆花。', locked: true },
];

export const LEVELS = [
  // ================= 第 1 顆星球 啟航星 =================
  {
    id: '1-1', island: 1, title: '點亮第一顆 LED', brief: '自己接線，讓 D13 上的 LED 持續亮著',
    goal: [
      '從左側零件庫加入 <b>LED</b> 和 <b>電阻</b>',
      '接線：D13 → 電阻 → LED 長腳 <b>A</b>；LED 短腳 <b>C</b> → GND',
      '寫程式讓 LED <b>一直亮著</b>',
    ],
    starter: { mode: 'blocks', circuit: { parts: [UNO], wires: [] }, blocks: emptyBlocks },
    hints: [
      '接線方式：點一下 Arduino 的 13 號腳位，再點電阻的一端；電阻另一端接到 LED 的 A。',
      'GND 腳位在 Arduino 上方 13 號旁邊，或下方電源區都有。',
      '程式只需要兩個積木：setup 裡「設定腳位 13 為輸出」，loop（或 setup）裡「數位輸出 13 設為 HIGH」。',
    ],
    solution: {
      mode: 'code',
      circuit: circuit(ledKit(13, 1, 200)),
      code: `void setup() {
  pinMode(13, OUTPUT);
  digitalWrite(13, HIGH);
}

void loop() {
}
`,
    },
    async check(ctx) {
      ctx.expect(ctx.parts('led').length, '畫布上有 LED', '畫布上還沒有 LED：從左側「💡 基本輸出」加入一顆');
      const led = ctx.ledOnPin(13);
      ctx.expect(led, `${led?.id} 的長腳 A 接到 D13`, '找不到接到 D13 的 LED：把 LED 的長腳 A（經過電阻）接到 13 號腳位');
      ctx.expect(ctx.toGnd(led.id + ':C'), 'LED 短腳 C 接到 GND', 'LED 的短腳 C 要接到 GND');
      ctx.expect(ctx.hasResistor(led, 13), '有串接限流電阻', '記得串一顆電阻（220Ω），真實電路沒有電阻會燒壞 LED');
      await ctx.wait(500);
      ctx.expect(ctx.ledOn(led), 'LED 成功點亮！', 'LED 沒有亮：檢查程式是否有 pinMode(13, OUTPUT) 和 digitalWrite(13, HIGH)');
    },
  },
  {
    id: '1-2', island: 1, title: 'Blink 節拍器', brief: '亮 0.5 秒、滅 0.5 秒，不斷循環',
    goal: ['讓 D13 的 LED <b>亮 500 毫秒、熄 500 毫秒</b>', '不斷重複'],
    starter: { mode: 'blocks', circuit: circuit(ledKit(13, 1, 200)), blocks: emptyBlocks },
    hints: [
      'loop() 會一直重複執行，所以只要寫「一次」亮滅的過程就好。',
      '順序：HIGH → 等待 500 → LOW → 等待 500。',
    ],
    solution: {
      mode: 'code',
      code: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      ctx.note('觀察 LED 4.5 秒…');
      const segs = segments(await ctx.sample(() => ctx.ledOn(led), 4500)).slice(1, -1);
      ctx.expect(segs.length >= 2, `LED 有規律地閃爍（切換 ${segs.length + 1} 次）`, 'LED 沒有在閃爍：亮和滅之間都需要等待（delay）');
      const on = avg(segs.filter(s => s.k).map(s => s.dur)), off = avg(segs.filter(s => !s.k).map(s => s.dur));
      ctx.expect(Math.abs(on - 500) <= 120, `亮的時間約 ${ms(on)}`, `亮的時間約 ${ms(on)}，目標是 500 ms`);
      ctx.expect(Math.abs(off - 500) <= 120, `熄的時間約 ${ms(off)}`, `熄的時間約 ${ms(off)}，目標是 500 ms`);
    },
  },
  {
    id: '1-3', island: 1, title: 'SOS 求救信號', brief: '用摩斯電碼閃出 ··· ––– ···',
    goal: [
      '短閃（·）：亮 <b>200 ms</b>；長閃（–）：亮 <b>600 ms</b>',
      '同一個字母裡，每次閃完熄 <b>200 ms</b>；字母之間熄 <b>600 ms</b>',
      '閃完一組 SOS 後熄 <b>2 秒</b>，再重來',
      '挑戰：寫一個 <code>flash(int duration)</code> 函式，讓程式更精簡',
    ],
    starter: { mode: 'code', circuit: circuit(ledKit(13, 1, 200)), code: skeleton('// SOS：··· ––– ···\n// 短 200ms、長 600ms\n\n') },
    hints: [
      '先寫一個函式：void flash(int t) { 亮 → delay(t) → 滅 → delay(200); }',
      '用 for 迴圈重複 3 次短閃、3 次長閃、3 次短閃，中間補上字母間隔。',
    ],
    solution: {
      mode: 'code',
      code: `const int LED = 13;
const int DOT = 200, DASH = 600;

void flash(int duration) {
  digitalWrite(LED, HIGH);
  delay(duration);
  digitalWrite(LED, LOW);
  delay(200);              // 同一字母內的間隔
}

void letter(int duration) {
  for (int i = 0; i < 3; i++) flash(duration);
  delay(400);              // 補到 600ms 的字母間隔
}

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  letter(DOT);   // S
  letter(DASH);  // O
  letter(DOT);   // S
  delay(1600);   // 補到約 2 秒的停頓
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      ctx.note('錄下 9 秒的閃爍節奏…');
      const segs = segments(await ctx.sample(() => ctx.ledOn(led), 9000));
      const pulses = segs.filter(s => s.k && s !== segs[segs.length - 1]);
      const code = pulses.map(s => s.dur < 400 ? 'S' : s.dur < 1000 ? 'L' : '?').join('');
      ctx.expect(pulses.length >= 9, `偵測到 ${pulses.length} 次閃光`, `只偵測到 ${pulses.length} 次閃光，SOS 至少要 9 次`);
      ctx.expect(code.includes('SSSLLLSSS'), '節奏正確：··· ––– ···', `節奏不對，偵測到：${code.replace(/S/g, '·').replace(/L/g, '–')}（· 是短閃、– 是長閃）`);
      const shorts = pulses.filter(s => s.dur < 400).map(s => s.dur), longs = pulses.filter(s => s.dur >= 400 && s.dur < 1000).map(s => s.dur);
      ctx.expect(Math.abs(avg(shorts) - 200) <= 80, `短閃約 ${ms(avg(shorts))}`, `短閃約 ${ms(avg(shorts))}，目標 200 ms`);
      ctx.expect(Math.abs(avg(longs) - 600) <= 120, `長閃約 ${ms(avg(longs))}`, `長閃約 ${ms(avg(longs))}，目標 600 ms`);
      const longGap = segs.some(s => !s.k && s.dur >= 1500);
      ctx.expect(longGap, '每組 SOS 之間有長停頓', '每組 SOS 之間要停約 2 秒，才看得出一組訊號的開始');
    },
  },

  // ================= 第 2 顆星球 光之星 =================
  {
    id: '2-1', island: 2, title: '呼吸燈', brief: '讓 LED 像呼吸一樣漸亮、漸暗',
    goal: [
      'LED 接在 <b>~9</b>（PWM 腳位）',
      '亮度從 0 平滑增加到 255，再平滑降回 0，不斷循環',
      '一次完整呼吸（亮→暗）大約 2~4 秒',
    ],
    starter: { mode: 'code', circuit: circuit(ledKit(9, 1, 330)), code: skeleton('// analogWrite(腳位, 0~255) 可以輸出「類比」亮度\n// 只有 ~3、5、6、9、10、11 支援\n\n') },
    hints: [
      '用 for 迴圈：for (int b = 0; b <= 255; b++) { analogWrite(9, b); delay(5); }',
      '再寫一個從 255 往下數的迴圈。',
      '每一步 delay 5ms × 256 步 ≈ 1.3 秒。',
    ],
    solution: {
      mode: 'code',
      code: `const int LED = 9;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b += 3) {
    analogWrite(LED, b);
    delay(15);
  }
  for (int b = 255; b >= 0; b -= 3) {
    analogWrite(LED, b);
    delay(15);
  }
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 9);
      ctx.note('記錄 D9 輸出 5 秒…');
      const vals = (await ctx.sample(() => ctx.pinOut(9), 5000, 15)).map(s => s.v);
      const distinct = new Set(vals).size;
      ctx.expect(distinct >= 15, `輸出了 ${distinct} 種不同亮度`, `只有 ${distinct} 種亮度——要用 analogWrite 輸出 0~255 之間的漸變值`);
      ctx.expect(Math.max(...vals) >= 230, `最亮達到 ${Math.max(...vals)}`, `最亮只有 ${Math.max(...vals)}，要接近 255`);
      ctx.expect(Math.min(...vals) <= 20, `最暗降到 ${Math.min(...vals)}`, `最暗只有 ${Math.min(...vals)}，要接近 0`);
      let up = 0, down = 0, jump = 0;
      for (let i = 1; i < vals.length; i++) { const d = vals[i] - vals[i - 1]; if (d > 0) up++; if (d < 0) down++; jump = Math.max(jump, Math.abs(d)); }
      ctx.expect(up >= 5 && down >= 5, '亮度有漸亮也有漸暗', '亮度只往單一方向變化，要加上「漸暗」的部分');
      ctx.expect(jump <= 90, '變化平滑，沒有突然跳動', `亮度出現 ${jump} 的突然跳動，呼吸燈要平滑變化`);
    },
  },
  {
    id: '2-2', island: 2, title: '十字路口紅綠燈', brief: '綠 2 秒 → 黃 1 秒 → 紅 2 秒',
    goal: [
      '紅燈 D12、黃燈 D11、綠燈 D10（電路已接好）',
      '順序：<b>綠 2 秒 → 黃 1 秒 → 紅 2 秒</b>，從綠燈開始，不斷循環',
      '任何時刻<b>只能亮一盞燈</b>',
      '挑戰：用 <code>millis()</code> 和「狀態變數」改寫，不使用 delay',
    ],
    starter: {
      mode: 'code',
      circuit: circuit(ledKit(12, 1, 160, 'red'), ledKit(11, 2, 300, 'yellow'), ledKit(10, 3, 440, 'green')),
      code: skeleton('const int RED = 12, YELLOW = 11, GREEN = 10;\n\n'),
    },
    hints: [
      '寫一個 void light(int r, int y, int g) 一次設定三盞燈，可以避免忘記關掉前一盞。',
      'delay 版：light(0,0,1); delay(2000); light(0,1,0); delay(1000); light(1,0,0); delay(2000);',
      'millis 版：用 int state 記錄目前是哪一盞燈，時間到了才 state = (state + 1) % 3。',
    ],
    solution: {
      mode: 'code',
      code: `const int RED = 12, YELLOW = 11, GREEN = 10;
const unsigned long DURATION[3] = {2000, 1000, 2000};  // 綠、黃、紅
int state = 0;               // 0=綠 1=黃 2=紅
unsigned long since = 0;

void show(int s) {
  digitalWrite(GREEN,  s == 0);
  digitalWrite(YELLOW, s == 1);
  digitalWrite(RED,    s == 2);
}

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  show(state);
  since = millis();
}

void loop() {
  if (millis() - since >= DURATION[state]) {
    state = (state + 1) % 3;
    show(state);
    since = millis();
  }
}
`,
    },
    async check(ctx) {
      const r = needLed(ctx, 12), y = needLed(ctx, 11), g = needLed(ctx, 10);
      ctx.note('觀察紅綠燈 6.5 秒…');
      const samples = await ctx.sample(() => (ctx.ledOn(r) ? 'R' : '') + (ctx.ledOn(y) ? 'Y' : '') + (ctx.ledOn(g) ? 'G' : '') || '-', 6500, 20);
      const segs = segments(samples);
      const multi = segs.find(s => s.k.length > 1 && s.k !== '-' && s.dur > 60);
      ctx.expect(!multi, '任何時刻都只亮一盞燈', `有 ${multi?.dur.toFixed(0)} ms 同時亮了 ${multi?.k}，切換前要先關掉上一盞`);
      const main = segs.filter(s => s.k.length === 1 && s.k !== '-' && s.dur > 150);
      const seq = main.map(s => s.k).join('');
      ctx.expect(main.length >= 3, `燈號有切換：${seq}`, '燈號沒有依序切換');
      ctx.expect(main[0].k === 'G', '從綠燈開始', `一開始亮的是 ${main[0].k}，要從綠燈開始`);
      const order = { G: 'Y', Y: 'R', R: 'G' };
      ctx.expect(main.every((s, i) => i === 0 || order[main[i - 1].k] === s.k), '順序正確：綠 → 黃 → 紅', `順序不對：${seq}（要 G→Y→R 循環）`);
      const full = main.slice(0, -1);
      for (const [k, target, name] of [['G', 2000, '綠'], ['Y', 1000, '黃'], ['R', 2000, '紅']]) {
        const d = avg(full.filter(s => s.k === k).map(s => s.dur));
        if (!Number.isNaN(d)) ctx.expect(Math.abs(d - target) <= 250, `${name}燈約 ${ms(d)}`, `${name}燈亮了約 ${ms(d)}，目標 ${target} ms`);
      }
    },
  },
  {
    id: '2-3', island: 2, title: 'RGB 調色盤', brief: '紅 → 綠 → 藍 → 黃，各 1 秒',
    goal: [
      'RGB LED（共陰）的 R、G、B 分別接 <b>~9、~10、~11</b>（電路已接好）',
      '依序顯示 <b>紅 → 綠 → 藍 → 黃</b>，每種顏色 1 秒，不斷循環',
      '黃色 = 紅 + 綠同時亮',
      '挑戰：寫 <code>setColor(int r, int g, int b)</code> 函式，用 analogWrite 調出任意顏色',
    ],
    starter: {
      mode: 'code',
      circuit: {
        parts: [UNO, { id: 'rgb1', type: 'rgb', x: 330, y: 70 }],
        wires: [{ a: 'rgb1:R', b: 'uno:9', color: '#d32f2f' }, { a: 'rgb1:G', b: 'uno:10', color: '#2e7d32' }, { a: 'rgb1:B', b: 'uno:11', color: '#1565c0' }, { a: 'rgb1:COM', b: 'uno:GND.1', color: '#222' }],
      },
      code: skeleton('const int R = 9, G = 10, B = 11;\n\n'),
    },
    hints: [
      'void setColor(int r, int g, int b) { analogWrite(R, r); analogWrite(G, g); analogWrite(B, b); }',
      '黃色：setColor(255, 255, 0);',
    ],
    solution: {
      mode: 'code',
      code: `const int R = 9, G = 10, B = 11;

void setColor(int r, int g, int b) {
  analogWrite(R, r);
  analogWrite(G, g);
  analogWrite(B, b);
}

void setup() {
}

void loop() {
  setColor(255, 0, 0);   delay(1000);  // 紅
  setColor(0, 255, 0);   delay(1000);  // 綠
  setColor(0, 0, 255);   delay(1000);  // 藍
  setColor(255, 255, 0); delay(1000);  // 黃
}
`,
    },
    async check(ctx) {
      const led = ctx.parts('rgb')[0];
      ctx.expect(led && ctx.toGnd(led.id + ':COM'), 'RGB LED 的 COM 接到 GND', '找不到 COM 接 GND 的 RGB LED，可按「重設關卡」');
      ctx.note('觀察顏色 4.6 秒…');
      const key = c => (c.r > 0.5 ? 'R' : '') + (c.g > 0.5 ? 'G' : '') + (c.b > 0.5 ? 'B' : '') || '-';
      const segs = segments(await ctx.sample(() => key(ctx.rgb(led)), 4600, 20)).filter(s => s.k !== '-' && s.dur > 150);
      const names = { R: '紅', G: '綠', B: '藍', RG: '黃', RB: '紫', GB: '青', RGB: '白' };
      const seq = segs.map(s => names[s.k] || s.k).join('→');
      ctx.expect(segs.length >= 4, `顏色有變化：${seq}`, `顏色變化不足：${seq || '沒有亮'}`);
      const want = ['R', 'G', 'B', 'RG'];
      const start = segs.findIndex(s => s.k === 'R');
      const ok = start >= 0 && segs.slice(start, start + 4).every((s, i) => s.k === want[i]) || segs.every((s, i) => i === 0 || want[(want.indexOf(segs[i - 1].k) + 1) % 4] === s.k);
      ctx.expect(ok && segs.every(s => want.includes(s.k)), '顏色順序正確：紅 → 綠 → 藍 → 黃', `顏色順序不對：${seq}`);
      const d = avg(segs.slice(0, -1).map(s => s.dur));
      ctx.expect(Math.abs(d - 1000) <= 200, `每種顏色約 ${ms(d)}`, `每種顏色約 ${ms(d)}，目標 1000 ms`);
    },
  },

  // ================= 第 3 顆星球 開關星 =================
  {
    id: '3-1', island: 3, title: '按住才亮', brief: '按著按鈕 LED 亮，放開就熄',
    goal: [
      '按鈕一端接 <b>D2</b>、另一端接 GND（電路已接好）',
      '用 <code>INPUT_PULLUP</code>：沒按時讀到 HIGH，按下時讀到 LOW',
      '<b>按住</b>按鈕時 D13 的 LED 亮，<b>放開</b>就熄',
    ],
    starter: { mode: 'blocks', circuit: circuit(ledKit(13, 1, 200), buttonKit), blocks: emptyBlocks },
    hints: [
      'pinMode(2, INPUT_PULLUP); 可以不用外接電阻。',
      'if (digitalRead(2) == LOW) { 亮 } else { 熄 }',
      '如果只用 INPUT 沒有上拉，沒按的時候腳位是「浮接」，讀值會亂跳。',
    ],
    solution: {
      mode: 'code',
      code: `const int BTN = 2, LED = 13;

void setup() {
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  if (digitalRead(BTN) == LOW) {   // 按下時接到 GND
    digitalWrite(LED, HIGH);
  } else {
    digitalWrite(LED, LOW);
  }
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:2') || ctx.linked(b.id + ':2.l', 'uno:2'));
      ctx.expect(btn, '按鈕接在 D2', '找不到接在 D2 的按鈕，可按「重設關卡」');
      await ctx.wait(300);
      ctx.expect(!ctx.ledOn(led), '沒按時 LED 熄滅', '沒按按鈕時 LED 卻亮著——檢查是否用了 INPUT_PULLUP，以及判斷條件 HIGH/LOW 是否相反');
      for (let i = 1; i <= 2; i++) {
        ctx.press(btn); await ctx.wait(200);
        ctx.expect(ctx.ledOn(led), `第 ${i} 次按下：LED 亮`, '按下按鈕時 LED 沒有亮');
        ctx.release(btn); await ctx.wait(200);
        ctx.expect(!ctx.ledOn(led), `第 ${i} 次放開：LED 熄`, '放開按鈕後 LED 沒有熄滅');
      }
    },
  },
  {
    id: '3-2', island: 3, title: '按一下切換（去彈跳）', brief: '按一下亮、再按一下熄，還要克服按鈕彈跳',
    goal: [
      '每<b>按一下</b>按鈕，LED 就在亮/熄之間<b>切換一次</b>',
      '真實按鈕按下時，金屬接點會「彈跳」好幾次（幾毫秒內 HIGH/LOW 快速跳動）',
      '檢查時會<b>模擬彈跳</b>：你的程式必須只切換一次',
    ],
    starter: { mode: 'code', circuit: circuit(ledKit(13, 1, 200), buttonKit), code: skeleton('const int BTN = 2, LED = 13;\n\n') },
    hints: [
      '先偵測「狀態改變」：記住上一次的讀值，只有從 HIGH 變 LOW 的那一刻才算按下。',
      '去彈跳：讀值改變時記下 millis()，要「穩定超過 30~50ms」才承認新狀態。',
      '只用 delay() 擋彈跳時，放開按鈕的彈跳也可能被誤判成新的按下。',
    ],
    solution: {
      mode: 'code',
      code: `const int BTN = 2, LED = 13;
const unsigned long DEBOUNCE = 30;

int lastReading = HIGH;      // 上一次原始讀值
int stableState = HIGH;      // 確認過的穩定狀態
unsigned long lastChange = 0;
bool ledOn = false;

void setup() {
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  int reading = digitalRead(BTN);
  if (reading != lastReading) {
    lastChange = millis();          // 還在跳動，重新計時
  }
  if (millis() - lastChange > DEBOUNCE && reading != stableState) {
    stableState = reading;          // 穩定夠久，承認新狀態
    if (stableState == LOW) {       // 剛按下
      ledOn = !ledOn;
      digitalWrite(LED, ledOn);
    }
  }
  lastReading = reading;
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:2') || ctx.linked(b.id + ':2.l', 'uno:2'));
      ctx.expect(btn, '按鈕接在 D2', '找不到接在 D2 的按鈕，可按「重設關卡」');
      await ctx.wait(400);
      const s0 = ctx.ledOn(led);
      for (let i = 1; i <= 2; i++) {
        const n0 = ctx.writes(13).length;
        await ctx.bouncyPress(btn, true); await ctx.wait(300);
        await ctx.bouncyPress(btn, false); await ctx.wait(300);
        const changes = ctx.writes(13).length - n0;
        const expected = i === 1 ? !s0 : s0;
        ctx.expect(changes === 1, `第 ${i} 次按鈕彈跳時只切換 1 次`, `第 ${i} 次按一下，LED 卻切換了 ${changes} 次——${changes ? '按鈕彈跳（按下或放開時）被當成多次按下，需要去彈跳' : '沒有偵測到按下'}`);
        ctx.expect(ctx.ledOn(led) === expected, `第 ${i} 次按一下：LED ${expected ? '亮' : '熄'}`, `第 ${i} 次按一下後 LED 應該${expected ? '亮' : '熄'}`);
      }
    },
  },
  {
    id: '3-3', island: 3, title: '序列埠遙控器', brief: '在序列埠輸入 on / off 控制 LED',
    goal: [
      '在序列埠監控輸入 <code>on</code>：LED 亮，並回覆 <b>LED ON</b>',
      '輸入 <code>off</code>：LED 熄，並回覆 <b>LED OFF</b>',
      '挑戰：輸入其他文字時回覆「看不懂」，並且不分大小寫（ON、On 也可以）',
    ],
    starter: { mode: 'code', circuit: circuit(ledKit(13, 1, 200)), code: skeleton('// Serial.available()：有幾個字元等著被讀\n// Serial.readStringUntil(\'\\n\')：讀一整行\n\n') },
    hints: [
      'if (Serial.available() > 0) { String cmd = Serial.readStringUntil(\'\\n\'); ... }',
      '用 cmd.trim(); 去掉前後空白，用 cmd == "on" 比較。',
      '挑戰：cmd.toLowerCase(); 可以把文字轉成小寫。',
    ],
    solution: {
      mode: 'code',
      code: `const int LED = 13;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  Serial.println("輸入 on 或 off");
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    cmd.toLowerCase();
    if (cmd == "on") {
      digitalWrite(LED, HIGH);
      Serial.println("LED ON");
    } else if (cmd == "off") {
      digitalWrite(LED, LOW);
      Serial.println("LED OFF");
    } else {
      Serial.println("看不懂：" + cmd);
    }
  }
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      await ctx.wait(300);
      let mark = ctx.serial().length;
      ctx.send('on'); await ctx.wait(400);
      ctx.expect(ctx.ledOn(led), '輸入 on → LED 亮', '輸入 on 後 LED 沒有亮（記得 Serial.begin，並用 Serial.available 檢查輸入）');
      ctx.expect(/LED ON/i.test(ctx.serial().slice(mark)), '回覆了 LED ON', '輸入 on 後沒有回覆「LED ON」');
      mark = ctx.serial().length;
      ctx.send('off'); await ctx.wait(400);
      ctx.expect(!ctx.ledOn(led), '輸入 off → LED 熄', '輸入 off 後 LED 沒有熄滅');
      ctx.expect(/LED OFF/i.test(ctx.serial().slice(mark)), '回覆了 LED OFF', '輸入 off 後沒有回覆「LED OFF」');
    },
  },
];

export const levelById = id => LEVELS.find(l => l.id === id);
export function nextLevel(id) {
  const i = LEVELS.findIndex(l => l.id === id);
  return LEVELS[i + 1] || null;
}

const PKEY = 'ardu-progress-v1';
export function getProgress() { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } }
export function markDone(id) { try { const p = getProgress(); p[id] = Date.now(); localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* 無法儲存 */ } }
