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
  const pn = pin >= 14 ? 'A' + (pin - 14) : 'D' + pin;
  ctx.expect(led, `找到接在 ${pn} 的 LED`, `找不到接在 ${pn} 的 LED，請檢查接線（可按「重設關卡」恢復原本電路）`);
  return led;
}

export const ISLANDS = [
  { id: 1, name: '啟航星', icon: '⚓', color: '#4fa3e0', theme: '數位輸出與時間控制', desc: '從零開始接出第一個電路，掌握 pinMode、digitalWrite 與 delay 的節奏感。' },
  { id: 2, name: '光之星', icon: '💡', color: '#f2b84b', theme: 'PWM 與多燈控制', desc: '用 analogWrite 調出漸層亮度，練習時間序列與狀態切換。' },
  { id: 3, name: '開關星', icon: '🔘', color: '#5cbf7a', theme: '數位輸入與序列埠', desc: '讀取按鈕、處理機械彈跳，並透過序列埠和 Arduino 對話。' },
  { id: 4, name: '感測星', icon: '🌡️', color: '#e07a5f', theme: '感測器：校正、遲滯、濾波', desc: '真實世界的感測器數值會漂移、跳動、有雜訊。學會用校正、遲滯與濾波，讓機器做出穩定的判斷。' },
  { id: 5, name: '動力星', icon: '⚙️', color: '#9b8ec4', theme: '伺服、馬達與繼電器', desc: '讓東西動起來：伺服的平滑控制、用驅動板控制馬達轉速與方向、用繼電器開關大電流負載。' },
  { id: 6, name: '顯示星', icon: '🖥️', color: '#5fb3b3', theme: '七段、LCD 與燈條', desc: '把資訊顯示出來：七段顯示器查表、LCD 排版與殘影處理、WS2812 全彩燈條。' },
  { id: 7, name: '專題星', icon: '🏆', color: '#c8963e', theme: '綜合專題：狀態機', desc: '把感測、控制、顯示與動力整合成真正的系統：智慧停車場、自動澆花、行人觸動號誌。' },
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
  // ================= 第 4 顆星球 感測星 =================
  {
    id: '4-1', island: 4, title: '自動路燈校正', brief: '越暗越亮：先量測，再決定 map 的範圍',
    goal: [
      '光敏模組 AO → <b>A0</b>，路燈 LED 接 <b>~9</b>（電路已接好）',
      '<b>夜晚</b>（1 lux）亮度 ≥ 200；<b>白天</b>（2000 lux）完全熄滅（≤ 15）；<b>黃昏</b>（50 lux）介於中間',
      '先用 <code>Serial.println(analogRead(A0))</code> 搭配序列埠的 <b>📈 繪圖</b>，選取 ldr1 拖動亮度滑桿，量出夜晚和白天的讀值',
      '再用 <code>map()</code> + <code>constrain()</code> 把讀值換算成 0~255',
    ],
    starter: {
      mode: 'code',
      circuit: circuit(ledKit(9, 1, 330, 'white'), {
        parts: [{ id: 'ldr1', type: 'ldr', x: 420, y: 470, props: { lux: 300, threshold: 512 } }],
        wires: [{ a: 'ldr1:AO', b: 'uno:A0', color: '#2e7d32' }, { a: 'ldr1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'ldr1:GND', b: 'uno:GND.2', color: '#222' }],
      }),
      code: `const int LDR = A0, LAMP = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LAMP, OUTPUT);
}

void loop() {
  int raw = analogRead(LDR);
  Serial.println(raw);       // 先觀察：越暗數值越大還是越小？
  delay(100);
}
`,
    },
    hints: [
      '量測結果：1 lux 約 980、50 lux 約 630、2000 lux 約 110（越暗數值越大）。',
      'int level = map(raw, 白天讀值, 夜晚讀值, 0, 255); 再用 constrain(level, 0, 255) 防止超出範圍。',
      '白天讀值可以抓得比 110 略高（例如 150），讓白天確實全熄。',
    ],
    solution: {
      mode: 'code',
      code: `const int LDR = A0, LAMP = 9;
const int BRIGHT = 150;   // 白天的讀值（量測後校正）
const int DARK = 950;     // 夜晚的讀值

void setup() {
  Serial.begin(9600);
  pinMode(LAMP, OUTPUT);
}

void loop() {
  int raw = analogRead(LDR);
  int level = constrain(map(raw, BRIGHT, DARK, 0, 255), 0, 255);
  analogWrite(LAMP, level);
  Serial.print("raw:");
  Serial.print(raw);
  Serial.print(" lamp:");
  Serial.println(level);
  delay(100);
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 9);
      const ldr = ctx.parts('ldr').find(l => ctx.linked(l.id + ':AO', 'uno:A0'));
      ctx.expect(ldr, '光敏模組 AO 接在 A0', '找不到 AO 接在 A0 的光敏模組，可按「重設關卡」');
      const meas = async lux => { ctx.setProp(ldr, 'lux', lux); await ctx.wait(600); return ctx.pinOut(9); };
      const night = await meas(1);
      ctx.expect(night >= 200, `夜晚（1 lux）路燈亮度 ${night}`, `夜晚（1 lux）亮度只有 ${night}，要 ≥ 200`);
      const day = await meas(2000);
      ctx.expect(day <= 15, `白天（2000 lux）路燈亮度 ${day}，已熄滅`, `白天（2000 lux）亮度還有 ${day}，要 ≤ 15（白天的校正值可以再抓高一點）`);
      const dusk = await meas(50);
      ctx.expect(dusk > 30 && dusk < night - 10, `黃昏（50 lux）亮度 ${dusk}，介於中間`, `黃昏（50 lux）亮度 ${dusk}，應該介於白天與夜晚之間——要用 map 做「漸進」調整，不是只有開關`);
      const deep = await meas(5);
      ctx.expect(deep > dusk, `更暗（5 lux）時更亮：${deep}`, `5 lux 的亮度 ${deep} 沒有比 50 lux 時亮，方向可能相反`);
      ctx.setProp(ldr, 'lux', 300);
    },
  },
  {
    id: '4-2', island: 4, title: '溫控風扇（遲滯）', brief: '30°C 開、28°C 才關，避免開開關關',
    goal: [
      'DHT22 SDA → <b>D2</b>，風扇指示燈（藍色 LED）接 <b>D13</b>（電路已接好）',
      '溫度 <b>≥ 30°C</b> 時開風扇；溫度要降到 <b>≤ 28°C</b> 才關掉',
      '在 28~30°C 之間時<b>維持原本狀態</b>——這就是「遲滯（hysteresis）」',
      'DHT22 每 2 秒才能讀一次，請用 millis() 控制讀取間隔',
    ],
    starter: {
      mode: 'code',
      circuit: circuit(ledKit(13, 1, 200, 'blue'), {
        parts: [{ id: 'dht1', type: 'dht', x: 430, y: 40, props: { temp: 26, hum: 60 } }],
        wires: [{ a: 'dht1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'dht1:GND', b: 'uno:GND.2', color: '#222' }, { a: 'dht1:SDA', b: 'uno:2', color: '#2e7d32' }],
      }),
      code: `#include <DHT.h>

DHT dht(2, DHT22);
const int FAN = 13;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(FAN, OUTPUT);
}

void loop() {

}
`,
    },
    hints: [
      '只用一個門檻（if (t >= 30) 開 else 關）的話，溫度在 30 附近抖動時風扇會一直切換。',
      '用 bool fanOn 記住目前狀態：if (!fanOn && t >= 30) fanOn = true; if (fanOn && t <= 28) fanOn = false;',
      'if (millis() - lastRead >= 2000) { lastRead = millis(); 讀溫度… }',
    ],
    solution: {
      mode: 'code',
      code: `#include <DHT.h>

DHT dht(2, DHT22);
const int FAN = 13;
const float ON_TEMP = 30.0, OFF_TEMP = 28.0;
bool fanOn = false;
unsigned long lastRead = 0;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(FAN, OUTPUT);
}

void loop() {
  if (millis() - lastRead >= 2000) {
    lastRead = millis();
    float t = dht.readTemperature();
    if (isnan(t)) return;
    if (!fanOn && t >= ON_TEMP) fanOn = true;
    if (fanOn && t <= OFF_TEMP) fanOn = false;
    digitalWrite(FAN, fanOn);
    Serial.print("temp:");
    Serial.print(t, 1);
    Serial.print(" fan:");
    Serial.println(fanOn ? 1 : 0);
  }
}
`,
    },
    async check(ctx) {
      const led = needLed(ctx, 13);
      const dht = ctx.parts('dht').find(d => ctx.linked(d.id + ':SDA', 'uno:2'));
      ctx.expect(dht, 'DHT22 接在 D2', '找不到 SDA 接在 D2 的 DHT22，可按「重設關卡」');
      ctx.note('依序改變溫度，每次等 2.4 秒讓程式讀取…');
      const steps = [
        [26, false, '26°C：風扇關', '26°C 時風扇不該開'],
        [30.5, true, '升到 30.5°C：風扇開', '溫度升到 30.5°C，風扇沒有開'],
        [29, true, '降到 29°C：風扇維持開（遲滯）', '29°C 就關掉了——沒有遲滯，溫度在 30°C 附近時風扇會一直開開關關'],
        [27.5, false, '降到 27.5°C：風扇關', '降到 27.5°C 風扇還沒關，要 ≤ 28°C 就關'],
        [29.5, false, '回升到 29.5°C：維持關（遲滯）', '29.5°C 就開了——要到 30°C 才開'],
        [31, true, '升到 31°C：再次開啟', '溫度升到 31°C，風扇沒有再次開啟'],
      ];
      for (const [t, want, ok, bad] of steps) {
        ctx.setProp(dht, 'temp', t);
        await ctx.wait(2400);
        ctx.expect(ctx.ledOn(led) === want, ok, bad);
      }
    },
  },
  {
    id: '4-3', island: 4, title: '停車雷達（濾波）', brief: '超音波有雜訊時，燈號也不能亂跳',
    goal: [
      'HC-SR04：TRIG <b>D8</b>、ECHO <b>D7</b>；燈號：紅 D12、黃 D11、綠 D10（電路已接好）',
      '距離 <b>&lt; 20 cm 紅燈</b>、<b>20~50 cm 黃燈</b>、<b>&gt; 50 cm 綠燈</b>，一次只亮一盞',
      '超音波已開啟<b>雜訊模式</b>：約 1/4 的讀值會是 0 或超過 400 cm 的錯誤值',
      '要<b>濾掉錯誤值</b>，讓燈號穩定不閃爍（提示：丟掉不合理的值、取多次量測的中位數）',
    ],
    starter: {
      mode: 'code',
      circuit: circuit(ledKit(12, 1, 160, 'red'), ledKit(11, 2, 300, 'yellow'), ledKit(10, 3, 440, 'green'), {
        parts: [{ id: 'sr04_1', type: 'sr04', x: 390, y: 500, props: { distance: 35, glitch: true } }],
        wires: [{ a: 'sr04_1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'sr04_1:GND', b: 'uno:GND.3', color: '#222' },
          { a: 'sr04_1:TRIG', b: 'uno:8', color: '#1565c0' }, { a: 'sr04_1:ECHO', b: 'uno:7', color: '#2e7d32' }],
      }),
      code: `const int TRIG = 8, ECHO = 7;
const int RED = 12, YELLOW = 11, GREEN = 10;

float readOnce() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58.0;
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float d = readOnce();
  Serial.println(d);   // 打開 📈 繪圖 看看雜訊長什麼樣子

  delay(50);
}
`,
    },
    hints: [
      '先打開 📈 繪圖：會看到距離線不時掉到 0 或跳到 400 以上。',
      '最簡單的濾波：讀到 d <= 0 或 d > 400 就丟掉，沿用上一次的好值。',
      '更穩的做法：連續讀 5 次有效值，排序後取中間那個（中位數）。',
    ],
    solution: {
      mode: 'code',
      code: `const int TRIG = 8, ECHO = 7;
const int RED = 12, YELLOW = 11, GREEN = 10;
float lastGood = 100;

float readOnce() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58.0;
}

// 讀 5 個合理的值，取中位數
float readFiltered() {
  float v[5];
  int n = 0;
  for (int tries = 0; tries < 15 && n < 5; tries++) {
    float d = readOnce();
    if (d > 0 && d <= 400) { v[n] = d; n++; }
  }
  if (n == 0) return lastGood;
  for (int i = 1; i < n; i++) {        // 插入排序
    float key = v[i];
    int j = i - 1;
    while (j >= 0 && v[j] > key) { v[j + 1] = v[j]; j--; }
    v[j + 1] = key;
  }
  lastGood = v[n / 2];
  return lastGood;
}

void show(int r, int y, int g) {
  digitalWrite(RED, r);
  digitalWrite(YELLOW, y);
  digitalWrite(GREEN, g);
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float d = readFiltered();
  if (d < 20) show(1, 0, 0);
  else if (d <= 50) show(0, 1, 0);
  else show(0, 0, 1);
  Serial.print("distance:");
  Serial.println(d);
  delay(30);
}
`,
    },
    async check(ctx) {
      const r = needLed(ctx, 12), y = needLed(ctx, 11), g = needLed(ctx, 10);
      const sr = ctx.parts('sr04').find(s => ctx.linked(s.id + ':ECHO', 'uno:7'));
      ctx.expect(sr, 'HC-SR04 的 ECHO 接在 D7', '找不到 ECHO 接在 D7 的超音波模組，可按「重設關卡」');
      ctx.setProp(sr, 'glitch', true);
      ctx.note('雜訊模式已開啟，逐一測試不同距離…');
      const names = { R: '紅', Y: '黃', G: '綠' };
      for (const [dist, want] of [[35, 'Y'], [80, 'G'], [12, 'R'], [45, 'Y']]) {
        ctx.setProp(sr, 'distance', dist);
        await ctx.wait(700);
        const samples = await ctx.sample(() => (ctx.ledOn(r) ? 'R' : '') + (ctx.ledOn(y) ? 'Y' : '') + (ctx.ledOn(g) ? 'G' : ''), 2500, 20);
        const okFrac = samples.filter(s => s.v === want).length / samples.length;
        const others = [...new Set(samples.map(s => s.v).filter(v => v !== want))].map(v => v ? [...v].map(c => names[c]).join('+') : '全暗');
        ctx.expect(okFrac >= 0.92, `${dist} cm：${names[want]}燈穩定（${Math.round(okFrac * 100)}%）`,
          `${dist} cm 時${names[want]}燈只亮了 ${Math.round(okFrac * 100)}% 的時間，其他時候變成 ${others.join('、') || '—'}${okFrac > 0.3 ? '——錯誤讀值沒有被濾掉' : ''}`);
      }
    },
  },
  // ================= 第 5 顆星球 動力星 =================
  {
    id: '5-1', island: 5, title: '伺服平滑跟隨', brief: '旋鈕決定目標角度，伺服要「慢慢轉過去」',
    goal: [
      '可變電阻 SIG → <b>A0</b>，伺服馬達 PWM → <b>~9</b>（電路已接好）',
      '旋鈕 0~1023 對應目標角度 0~180°',
      '伺服<b>不能一次跳到目標</b>：每 20 ms 最多轉 3°，平滑地追上目標（避免機械手臂猛甩）',
      '旋鈕不動時，伺服最後要停在目標角度（誤差 3° 內）',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'servo1', type: 'servo', x: 380, y: 60 }, { id: 'pot1', type: 'pot', x: 420, y: 480, props: { value: 512 } }],
        wires: [{ a: 'servo1:PWM', b: 'uno:9', color: '#e67e22' }, { a: 'servo1:V+', b: 'uno:5V', color: '#d32f2f' }, { a: 'servo1:GND', b: 'uno:GND.1', color: '#222' },
          { a: 'pot1:SIG', b: 'uno:A0', color: '#2e7d32' }, { a: 'pot1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'pot1:GND', b: 'uno:GND.2', color: '#222' }],
      }),
      code: `#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);
}

void loop() {
  int target = map(analogRead(A0), 0, 1023, 0, 180);
  arm.write(target);      // 這樣會直接跳過去——改成慢慢轉
  delay(20);
}
`,
    },
    hints: [
      '用一個變數 current 記住「現在的角度」，每次 loop 只往 target 靠近一點點。',
      'if (current < target) current = min(current + 2, target); else if (current > target) current = max(current - 2, target);',
      '每次移動後 arm.write(current); delay(20);',
    ],
    solution: {
      mode: 'code',
      code: `#include <Servo.h>

Servo arm;
int current = 90;
const int STEP = 2;          // 每 20ms 最多轉 2 度

void setup() {
  arm.attach(9);
  arm.write(current);
}

void loop() {
  int target = map(analogRead(A0), 0, 1023, 0, 180);
  if (current < target) current = min(current + STEP, target);
  else if (current > target) current = max(current - STEP, target);
  arm.write(current);
  delay(20);
}
`,
    },
    async check(ctx) {
      const sv = ctx.parts('servo').find(x => ctx.linked(x.id + ':PWM', 'uno:9'));
      ctx.expect(sv, '伺服 PWM 接在 D9', '找不到 PWM 接在 D9 的伺服馬達，可按「重設關卡」');
      const pot = ctx.parts('pot').find(p => ctx.linked(p.id + ':SIG', 'uno:A0'));
      ctx.expect(pot, '可變電阻接在 A0', '找不到 SIG 接在 A0 的可變電阻');
      ctx.setProp(pot, 'value', 0); await ctx.wait(3000);
      const a0 = ctx.servoAngle(sv);
      ctx.expect(a0 != null, '伺服有被控制（attach + write）', '伺服沒有反應：記得 arm.attach(9) 並呼叫 arm.write()');
      ctx.expect(a0 <= 3, `旋鈕轉到 0：伺服停在 ${Math.round(a0)}°`, `旋鈕轉到 0 等了 3 秒，伺服停在 ${Math.round(a0)}°，應該接近 0°`);
      ctx.note('把旋鈕一口氣轉到底，觀察伺服怎麼移動…');
      ctx.setProp(pot, 'value', 1023);
      const s = (await ctx.sample(() => ctx.servoAngle(sv), 3500, 20)).map(x => x.v);
      let jump = 0; for (let i = 1; i < s.length; i++) jump = Math.max(jump, Math.abs(s[i] - s[i - 1]));
      ctx.expect(jump <= 8, `轉動平滑（每次取樣最多變化 ${Math.round(jump)}°）`, `伺服一次跳了 ${Math.round(jump)}°——要分很多小步慢慢轉（每 20 ms ≤ 3°）`);
      const reach = s.findIndex(v => v >= 177);
      ctx.expect(reach >= 0, `最後到達 ${Math.round(s[s.length - 1])}°`, `3.5 秒後只轉到 ${Math.round(s[s.length - 1])}°，太慢了或沒有追上目標`);
      ctx.expect(reach * 20 >= 900, `花了約 ${(reach * 0.02).toFixed(1)} 秒從 0° 轉到 180°`, `只花 ${(reach * 0.02).toFixed(1)} 秒就轉完 180°，太快了（每 20 ms ≤ 3° 至少要 1.2 秒）`);
    },
  },
  {
    id: '5-2', island: 5, title: '馬達調速與換向', brief: 'L298N：旋鈕調速度，按鈕切換正反轉',
    goal: [
      'L298N：<b>ENA → ~5</b>（PWM 調速）、<b>IN1 → D7</b>、<b>IN2 → D8</b>，OUT1/OUT2 接馬達（電路已接好）',
      '旋鈕（A0）0~1023 對應轉速 0~255；旋鈕轉到 0 時馬達要停',
      '按一下按鈕（D2）就<b>反轉方向</b>，速度不變',
      '方向：IN1=HIGH、IN2=LOW 正轉；IN1=LOW、IN2=HIGH 反轉',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'drv1', type: 'l298n', x: 380, y: 260 }, { id: 'motor1', type: 'motor', x: 560, y: 110 },
          { id: 'pot1', type: 'pot', x: 400, y: 480, props: { value: 700 } }, { id: 'btn1', type: 'button', x: 560, y: 480 }],
        wires: [{ a: 'drv1:ENA', b: 'uno:5', color: '#e67e22' }, { a: 'drv1:IN1', b: 'uno:7', color: '#1565c0' }, { a: 'drv1:IN2', b: 'uno:8', color: '#8e44ad' },
          { a: 'drv1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'drv1:GND', b: 'uno:GND.2', color: '#222' },
          { a: 'drv1:OUT1', b: 'motor1:M1', color: '#d32f2f' }, { a: 'drv1:OUT2', b: 'motor1:M2', color: '#222' },
          { a: 'pot1:SIG', b: 'uno:A0', color: '#2e7d32' }, { a: 'pot1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'pot1:GND', b: 'uno:GND.3', color: '#222' },
          { a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' }],
      }),
      code: skeleton('const int ENA = 5, IN1 = 7, IN2 = 8, BTN = 2;\n\n'),
    },
    hints: [
      '速度：analogWrite(ENA, map(analogRead(A0), 0, 1023, 0, 255));',
      '方向用 bool forward 記住；forward 時 digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); 反之相反。',
      '按鈕要偵測「剛按下」的那一刻（上次 HIGH、這次 LOW），否則按住時會一直切換。',
    ],
    solution: {
      mode: 'code',
      code: `const int ENA = 5, IN1 = 7, IN2 = 8, BTN = 2;
bool forward = true;
int lastBtn = HIGH;
unsigned long lastPress = 0;

void setup() {
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  int b = digitalRead(BTN);
  if (lastBtn == HIGH && b == LOW && millis() - lastPress > 50) {
    forward = !forward;            // 剛按下：換方向
    lastPress = millis();
  }
  lastBtn = b;

  int speed = map(analogRead(A0), 0, 1023, 0, 255);
  digitalWrite(IN1, forward ? HIGH : LOW);
  digitalWrite(IN2, forward ? LOW : HIGH);
  analogWrite(ENA, speed);

  Serial.print("speed:");
  Serial.println(forward ? speed : -speed);
  delay(10);
}
`,
    },
    async check(ctx) {
      const m = ctx.parts('motor')[0];
      const drv = ctx.parts('l298n')[0];
      ctx.expect(m && drv && ctx.linked(drv.id + ':OUT1', m.id + ':M1') && ctx.linked(drv.id + ':ENA', 'uno:5'), 'L298N 與馬達接線正確', '找不到 L298N（ENA 接 D5）與馬達的接線，可按「重設關卡」');
      const pot = ctx.parts('pot').find(p => ctx.linked(p.id + ':SIG', 'uno:A0'));
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:2') || ctx.linked(b.id + ':2.l', 'uno:2'));
      ctx.expect(pot && btn, '旋鈕接 A0、按鈕接 D2', '找不到接在 A0 的旋鈕或接在 D2 的按鈕');
      const at = async v => { ctx.setProp(pot, 'value', v); await ctx.wait(500); return ctx.motor(m); };
      const s0 = await at(0);
      ctx.expect(Math.abs(s0) < 0.05, '旋鈕 0：馬達停止', `旋鈕轉到 0 時馬達還在轉（${Math.round(s0 * 100)}%）`);
      const s1 = await at(1023);
      ctx.expect(Math.abs(s1) > 0.95, `旋鈕最大：全速 ${Math.round(Math.abs(s1) * 100)}%`, `旋鈕轉到最大，轉速只有 ${Math.round(Math.abs(s1) * 100)}%——ENA 要用 analogWrite 輸出 0~255`);
      const s2 = await at(512);
      ctx.expect(Math.abs(Math.abs(s2) - 0.5) < 0.1 && Math.sign(s2) === Math.sign(s1), `旋鈕一半：轉速 ${Math.round(Math.abs(s2) * 100)}%`, `旋鈕轉到一半，轉速 ${Math.round(Math.abs(s2) * 100)}%，應該約 50%`);
      for (let i = 1; i <= 2; i++) {
        const before = ctx.motor(m);
        ctx.press(btn);
        const held = await ctx.sample(() => Math.sign(Math.round(ctx.motor(m) * 20)), 300, 10);
        ctx.release(btn); await ctx.wait(400);
        const flips = held.filter((x, k) => k && x.v && held[k - 1].v && x.v !== held[k - 1].v).length;
        ctx.expect(flips <= 1, `第 ${i} 次按住按鈕時只換向一次`, `按住按鈕的 0.3 秒內方向切換了 ${flips} 次——要偵測「剛按下」的瞬間，而不是「按著」就切換`);
        const after = ctx.motor(m);
        ctx.expect(Math.sign(after) === -Math.sign(before) && Math.abs(Math.abs(after) - Math.abs(before)) < 0.1,
          `第 ${i} 次按按鈕：${after > 0 ? '正轉' : '反轉'} ${Math.round(Math.abs(after) * 100)}%`,
          `第 ${i} 次按按鈕後方向沒有反轉（按前 ${Math.round(before * 100)}%、按後 ${Math.round(after * 100)}%）${Math.abs(after) < 0.05 ? '——IN1、IN2 是不是設成一樣了？' : ''}`);
      }
    },
  },
  {
    id: '5-3', island: 5, title: '定時抽水機（繼電器）', brief: '按一下抽水 3 秒，抽水中再按＝緊急停止',
    goal: [
      '繼電器 IN → <b>D4</b>；抽水馬達由 5V 經繼電器 <b>COM → NO</b> 供電（電路已接好）',
      '按一下按鈕（D2）：繼電器吸合，抽水 <b>3 秒</b>後自動停止',
      '抽水期間<b>再按一次 = 緊急停止</b>，立刻關掉',
      '必須用 millis() 計時：抽水時按鈕也要隨時有反應（用 delay(3000) 會按不到）',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'relay1', type: 'relay', x: 380, y: 290 }, { id: 'pump', type: 'motor', x: 560, y: 150 }, { id: 'btn1', type: 'button', x: 420, y: 480 }],
        wires: [{ a: 'relay1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'relay1:GND', b: 'uno:GND.2', color: '#222' }, { a: 'relay1:IN', b: 'uno:4', color: '#e67e22' },
          { a: 'relay1:COM', b: 'uno:5V', color: '#d32f2f' }, { a: 'relay1:NO', b: 'pump:M1', color: '#d32f2f' }, { a: 'pump:M2', b: 'uno:GND.3', color: '#222' },
          { a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' }],
      }),
      code: skeleton('const int RELAY = 4, BTN = 2;\nconst unsigned long PUMP_TIME = 3000;\n\n'),
    },
    hints: [
      '用 bool pumping 和 unsigned long startTime 記錄狀態，這就是一個小小的「狀態機」。',
      '剛按下時：如果沒在抽水 → 開始抽水、記下 startTime；如果正在抽水 → 立刻停止。',
      '每次 loop 檢查：if (pumping && millis() - startTime >= PUMP_TIME) 就停止。',
    ],
    solution: {
      mode: 'code',
      code: `const int RELAY = 4, BTN = 2;
const unsigned long PUMP_TIME = 3000;

bool pumping = false;
unsigned long startTime = 0;
int lastBtn = HIGH;
unsigned long lastPress = 0;

void setPump(bool on) {
  pumping = on;
  digitalWrite(RELAY, on ? HIGH : LOW);
  if (on) startTime = millis();
  Serial.println(on ? "開始抽水" : "停止抽水");
}

void setup() {
  pinMode(RELAY, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  int b = digitalRead(BTN);
  if (lastBtn == HIGH && b == LOW && millis() - lastPress > 50) {
    lastPress = millis();
    setPump(!pumping);             // 沒抽→開始；正在抽→緊急停止
  }
  lastBtn = b;

  if (pumping && millis() - startTime >= PUMP_TIME) {
    setPump(false);                // 時間到自動停止
  }
}
`,
    },
    async check(ctx) {
      const relay = ctx.parts('relay').find(r => ctx.linked(r.id + ':IN', 'uno:4'));
      ctx.expect(relay, '繼電器 IN 接在 D4', '找不到 IN 接在 D4 的繼電器，可按「重設關卡」');
      const pump = ctx.parts('motor')[0];
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:2') || ctx.linked(b.id + ':2.l', 'uno:2'));
      ctx.expect(pump && btn, '抽水馬達與按鈕都在', '找不到抽水馬達或接在 D2 的按鈕');
      const on = () => ctx.motor(pump) > 0.5;
      const click = async () => { ctx.press(btn); await ctx.wait(150); ctx.release(btn); };
      await ctx.wait(400);
      ctx.expect(!on(), '開機時抽水機停止', '還沒按按鈕，抽水機就在運轉');
      await click();
      const s = await ctx.sample(on, 3800, 20);
      const first = s.findIndex(x => x.v), last = s.map(x => x.v).lastIndexOf(true);
      ctx.expect(first >= 0 && first * 20 < 300, '按一下：立刻開始抽水', '按下按鈕後抽水機沒有啟動（繼電器 IN 要輸出 HIGH）');
      const dur = s[last].t - s[first].t + 150;
      ctx.expect(!s[s.length - 1].v && Math.abs(dur - 3000) <= 300, `抽水約 ${(dur / 1000).toFixed(1)} 秒後自動停止`, s[s.length - 1].v ? '抽水 3.8 秒後還沒停止' : `抽水了約 ${(dur / 1000).toFixed(1)} 秒，目標 3 秒`);
      await click(); await ctx.wait(300);
      ctx.expect(on(), '再按一次：重新開始抽水', '停止後再按一次，抽水機沒有重新啟動');
      await ctx.wait(800);
      await click(); await ctx.wait(200);
      ctx.expect(!on(), '抽水中按下：緊急停止', '抽水中按按鈕沒有立刻停止——如果用了 delay(3000)，等待期間按鈕會沒反應');
      await ctx.wait(2500);
      ctx.expect(!on(), '緊急停止後保持停止', '緊急停止後抽水機又自己啟動了');
    },
  },
  // ================= 第 6 顆星球 顯示星 =================
  {
    id: '6-1', island: 6, title: '七段顯示器倒數', brief: '9、8、7…0，每秒減一，用陣列查表',
    goal: [
      '共陰七段顯示器：段 <b>A~G 依序接 D2~D8</b>，COM 接 GND（電路已接好）',
      '從 <b>9 倒數到 0</b>，每個數字顯示 <b>1 秒</b>；到 0 後停 2 秒再從 9 重新開始',
      '起始程式的字形表還缺 <b>5 和 6</b>，請自己對照段落圖補上',
      '寫一個 <code>showDigit(int n)</code>，用迴圈把表格的 7 個值寫到 7 支腳位',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'seg1', type: 'seg7', x: 420, y: 70 }],
        wires: [['A', 2], ['B', 3], ['C', 4], ['D', 5], ['E', 6], ['F', 7], ['G', 8]].map(([s, p], k) => ({ a: 'seg1:' + s, b: 'uno:' + p, color: ['#d32f2f', '#e67e22', '#f1c40f', '#2e7d32', '#1565c0', '#8e44ad', '#795548'][k] }))
          .concat([{ a: 'seg1:COM.1', b: 'uno:GND.1', color: '#222' }]),
      }),
      code: `//      A
//     ───
//  F │   │ B
//     ─G─
//  E │   │ C
//     ───
//      D
const int FIRST = 2;   // A 接 D2、B 接 D3 … G 接 D8

// 每一列是一個數字的 A B C D E F G（1 = 亮）
const byte DIGITS[10][7] = {
  {1,1,1,1,1,1,0},  // 0
  {0,1,1,0,0,0,0},  // 1
  {1,1,0,1,1,0,1},  // 2
  {1,1,1,1,0,0,1},  // 3
  {0,1,1,0,0,1,1},  // 4
  {0,0,0,0,0,0,0},  // 5  ← 請補上
  {0,0,0,0,0,0,0},  // 6  ← 請補上
  {1,1,1,0,0,0,0},  // 7
  {1,1,1,1,1,1,1},  // 8
  {1,1,1,1,0,1,1},  // 9
};

void setup() {
  for (int i = 0; i < 7; i++) pinMode(FIRST + i, OUTPUT);
}

void loop() {

}
`,
    },
    hints: [
      '5 亮的段：A、F、G、C、D；6 再多一個 E。',
      'void showDigit(int n) { for (int s = 0; s < 7; s++) digitalWrite(FIRST + s, DIGITS[n][s]); }',
      'loop 裡：for (int n = 9; n >= 0; n--) { showDigit(n); delay(1000); } delay(2000);',
    ],
    solution: {
      mode: 'code',
      code: `const int FIRST = 2;

const byte DIGITS[10][7] = {
  {1,1,1,1,1,1,0},  // 0
  {0,1,1,0,0,0,0},  // 1
  {1,1,0,1,1,0,1},  // 2
  {1,1,1,1,0,0,1},  // 3
  {0,1,1,0,0,1,1},  // 4
  {1,0,1,1,0,1,1},  // 5
  {1,0,1,1,1,1,1},  // 6
  {1,1,1,0,0,0,0},  // 7
  {1,1,1,1,1,1,1},  // 8
  {1,1,1,1,0,1,1},  // 9
};

void showDigit(int n) {
  for (int s = 0; s < 7; s++) {
    digitalWrite(FIRST + s, DIGITS[n][s]);
  }
}

void setup() {
  for (int i = 0; i < 7; i++) pinMode(FIRST + i, OUTPUT);
}

void loop() {
  for (int n = 9; n >= 0; n--) {
    showDigit(n);
    delay(1000);
  }
  delay(2000);   // 停在 0
}
`,
    },
    async check(ctx) {
      const seg = ctx.parts('seg7').find(x => ctx.linked(x.id + ':A', 'uno:2'));
      ctx.expect(seg && ctx.toGnd(seg.id + ':COM.1'), '七段顯示器 A 接 D2、COM 接 GND', '找不到 A 接 D2、COM 接 GND 的七段顯示器，可按「重設關卡」');
      ctx.note('記錄 7 秒的顯示內容…');
      const segs = segments(await ctx.sample(() => ctx.seg7Digit(seg), 7000, 20)).filter(x => x.dur > 120);
      const seq = segs.map(x => x.k);
      const bad = seq.find(k => typeof k === 'string' && k.startsWith('?'));
      ctx.expect(!bad, '每個字形都正確', `出現看不懂的字形（A~G = ${bad?.slice(1)}）——檢查字形表，尤其是 5 和 6`);
      ctx.expect(seq[0] === 9, '從 9 開始', `一開始顯示的是 ${seq[0] ?? '（沒有）'}，要從 9 開始`);
      const want = [9, 8, 7, 6, 5, 4, 3];
      const okSeq = seq.slice(0, 6).every((k, i) => k === want[i]);
      ctx.expect(seq.length >= 6 && okSeq, `依序倒數：${seq.slice(0, 7).join(' → ')}`, `顯示順序是 ${seq.slice(0, 7).join(' → ')}，應該是 9 → 8 → 7 → 6 → 5 …${seq.includes('空白') ? '（有數字變成空白——字形表的 5、6 還沒補）' : ''}`);
      const d = avg(segs.slice(1, 6).map(x => x.dur));
      ctx.expect(Math.abs(d - 1000) <= 150, `每個數字約 ${ms(d)}`, `每個數字顯示約 ${ms(d)}，目標 1000 ms`);
    },
  },
  {
    id: '6-2', island: 6, title: 'LCD 溫溼度看板', brief: '在 LCD 上顯示溫度與濕度，不能留下殘影',
    goal: [
      'LCD1602（I2C）：<b>SDA→A4、SCL→A5</b>；DHT22 SDA → <b>D2</b>（電路已接好）',
      '第 1 行顯示溫度（<b>小數 1 位</b>，例如 <code>Temp: 26.5 C</code>），第 2 行顯示濕度（例如 <code>Hum: 62 %</code>）',
      '每 2 秒更新一次',
      '數字變短時（100 → 9）<b>不能留下舊字</b>：要清除或用空白蓋掉',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'lcd1', type: 'lcd', x: 320, y: 30 }, { id: 'dht1', type: 'dht', x: 440, y: 470, props: { temp: 26.5, hum: 62 } }],
        wires: [{ a: 'lcd1:SDA', b: 'uno:A4', color: '#1565c0' }, { a: 'lcd1:SCL', b: 'uno:A5', color: '#f1c40f' }, { a: 'lcd1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'lcd1:GND', b: 'uno:GND.2', color: '#222' },
          { a: 'dht1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'dht1:GND', b: 'uno:GND.3', color: '#222' }, { a: 'dht1:SDA', b: 'uno:2', color: '#2e7d32' }],
      }),
      code: `#include <DHT.h>
#include <LiquidCrystal_I2C.h>

DHT dht(2, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Hello!");
}

void loop() {

}
`,
    },
    hints: [
      'lcd.setCursor(格, 行) 的格與行都從 0 開始；lcd.print(t, 1) 會印出小數 1 位。',
      '殘影：LCD 只會覆蓋你印的位置。先印 "                " 蓋掉整行，或每次更新前 lcd.clear()。',
      'lcd.clear() 太頻繁會閃爍；比較好的做法是印完數字後補幾個空白。',
    ],
    solution: {
      mode: 'code',
      code: `#include <DHT.h>
#include <LiquidCrystal_I2C.h>

DHT dht(2, DHT22);
LiquidCrystal_I2C lcd(0x27, 16, 2);
unsigned long lastRead = 0;

void setup() {
  dht.begin();
  lcd.init();
  lcd.backlight();
}

void loop() {
  if (millis() - lastRead < 2000) return;
  lastRead = millis();
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(t, 1);
  lcd.print(" C    ");     // 後面補空白，蓋掉舊的字

  lcd.setCursor(0, 1);
  lcd.print("Hum:  ");
  lcd.print(h, 0);
  lcd.print(" %    ");
}
`,
    },
    async check(ctx) {
      const lcd = ctx.parts('lcd')[0], dht = ctx.parts('dht').find(d => ctx.linked(d.id + ':SDA', 'uno:2'));
      ctx.expect(lcd && dht, 'LCD 與 DHT22 都在', '找不到 LCD 或接在 D2 的 DHT22，可按「重設關卡」');
      const nums = line => [...line.matchAll(/-?\d+(?:\.\d+)?/g)].map(m => +m[0]);
      const steps = [[26.5, 62, ''], [31.2, 100, ''], [5.4, 9, '（數字變短，檢查殘影）']];
      let prev = null;
      for (const [t, h, note] of steps) {
        ctx.setProp(dht, 'temp', t); ctx.setProp(dht, 'hum', h);
        await ctx.wait(2600);
        const lines = ctx.lcdLines(lcd);
        ctx.expect(lines, 'LCD 有收到資料', 'LCD 沒有顯示：確認 SDA→A4、SCL→A5，並呼叫 lcd.init()');
        const [l1, l2] = lines.map(x => x.trimEnd());
        const n1 = nums(l1), n2 = nums(l2);
        ctx.expect(n1.length === 1 && Math.abs(n1[0] - t) < 0.06 && /\d\.\d/.test(l1), `溫度 ${t}°C：第 1 行「${l1}」`,
          n1.length > 1 ? `第 1 行「${l1}」出現多個數字——舊的字沒有清掉${note}` : `第 1 行「${l1}」應該顯示溫度 ${t.toFixed(1)}（小數 1 位）`);
        ctx.expect(n2.length === 1 && Math.abs(n2[0] - h) < 0.6, `濕度 ${h}%：第 2 行「${l2}」`,
          n2.length > 1 ? `第 2 行「${l2}」出現多個數字——舊的字沒有清掉${note}` : `第 2 行「${l2}」應該顯示濕度 ${h}`);
        if (prev && note) {
          // 數字變短了，畫面上的字也應該跟著變短；沒變短就是殘影
          ctx.expect(l1.length < prev[0].length, '溫度數字變短後沒有殘影', `第 1 行「${l1}」比上一次「${prev[0]}」沒有變短——後面還留著舊的字（殘影）`);
          ctx.expect(l2.length <= prev[1].length - 2, '濕度數字變短後沒有殘影', `第 2 行「${l2}」比上一次「${prev[1]}」沒有變短——後面還留著舊的字（殘影）`);
        }
        prev = [l1, l2];
      }
    },
  },
  {
    id: '6-3', island: 6, title: '燈條音量表', brief: '旋鈕越大亮越多顆：綠、黃、紅',
    goal: [
      'WS2812 燈條（8 顆）DIN → <b>D6</b>，旋鈕 SIG → <b>A0</b>（電路已接好）',
      '旋鈕 0~1023 對應亮 <b>0~8 顆</b>，從第 0 顆開始亮',
      '顏色：第 0~4 顆<b>綠</b>、第 5~6 顆<b>黃</b>、第 7 顆<b>紅</b>',
      '沒輪到的燈要<b>熄滅</b>（旋鈕轉小時，多出來的燈要關掉）',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'strip1', type: 'strip', x: 380, y: 100 }, { id: 'pot1', type: 'pot', x: 420, y: 480, props: { value: 512 } }],
        wires: [{ a: 'strip1:DIN', b: 'uno:6', color: '#2e7d32' }, { a: 'strip1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'strip1:GND', b: 'uno:GND.1', color: '#222' },
          { a: 'pot1:SIG', b: 'uno:A0', color: '#1565c0' }, { a: 'pot1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'pot1:GND', b: 'uno:GND.2', color: '#222' }],
      }),
      code: `#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);

void setup() {
  strip.begin();
  strip.setPixelColor(0, strip.Color(0, 255, 0));
  strip.show();          // 設定完要 show() 才會更新
}

void loop() {

}
`,
    },
    hints: [
      'int n = map(analogRead(A0), 0, 1023, 0, 8); 算出要亮幾顆。',
      'for (int i = 0; i < 8; i++) { if (i < n) 設定顏色; else 設成 strip.Color(0, 0, 0); } 最後 strip.show();',
      '顏色可以寫成函式：uint32_t colorAt(int i) { if (i < 5) return 綠; if (i < 7) return 黃; return 紅; }',
    ],
    solution: {
      mode: 'code',
      code: `#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);

uint32_t colorAt(int i) {
  if (i < 5) return strip.Color(0, 200, 0);     // 綠
  if (i < 7) return strip.Color(200, 160, 0);   // 黃
  return strip.Color(220, 0, 0);                // 紅
}

void setup() {
  strip.begin();
}

void loop() {
  int n = map(analogRead(A0), 0, 1023, 0, 8);
  for (int i = 0; i < 8; i++) {
    strip.setPixelColor(i, i < n ? colorAt(i) : strip.Color(0, 0, 0));
  }
  strip.show();
  delay(30);
}
`,
    },
    async check(ctx) {
      const st = ctx.parts('strip').find(s => ctx.linked(s.id + ':DIN', 'uno:6'));
      const pot = ctx.parts('pot').find(p => ctx.linked(p.id + ':SIG', 'uno:A0'));
      ctx.expect(st && pot, '燈條接 D6、旋鈕接 A0', '找不到 DIN 接 D6 的燈條或 SIG 接 A0 的旋鈕，可按「重設關卡」');
      const lit = px => px.map(p => Math.max(p.r, p.g, p.b) > 30);
      const read = async v => { ctx.setProp(pot, 'value', v); await ctx.wait(500); return ctx.stripColors(st); };
      let px = await read(1023);
      ctx.expect(px, '燈條有收到資料', '燈條沒有反應：記得 strip.begin()，設定完要 strip.show()');
      let L = lit(px);
      ctx.expect(L.every(Boolean), '旋鈕最大：8 顆全亮', `旋鈕最大時只亮了 ${L.filter(Boolean).length} 顆，要 8 顆全亮`);
      const isG = p => p.g > 100 && p.r < 90 && p.b < 90, isY = p => p.r > 100 && p.g > 100 && p.b < 90, isR = p => p.r > 100 && p.g < 90 && p.b < 90;
      ctx.expect(px.slice(0, 5).every(isG) && px.slice(5, 7).every(isY) && isR(px[7]), '顏色正確：綠 ×5、黃 ×2、紅 ×1',
        `顏色不對：${px.map(p => isG(p) ? '綠' : isY(p) ? '黃' : isR(p) ? '紅' : `(${p.r},${p.g},${p.b})`).join(' ')}`);
      px = await read(512); L = lit(px);
      const n512 = L.filter(Boolean).length;
      ctx.expect(n512 >= 3 && n512 <= 5 && L.slice(0, n512).every(Boolean), `旋鈕一半：亮 ${n512} 顆`, `旋鈕一半時亮了 ${n512} 顆（要從第 0 顆連續亮約 4 顆）`);
      ctx.expect(!L.slice(n512).some(Boolean), '旋鈕轉小後，多出來的燈都熄了', '旋鈕轉小後，後面的燈還亮著——沒輪到的燈要設成 Color(0,0,0)');
      px = await read(0); L = lit(px);
      ctx.expect(!L.some(Boolean), '旋鈕 0：全部熄滅', `旋鈕轉到 0 還亮著 ${L.filter(Boolean).length} 顆`);
    },
  },
  // ================= 第 7 顆星球 專題星 =================
  {
    id: '7-1', island: 7, title: '智慧停車場', brief: '超音波偵測車輛、伺服閘門、LCD 顯示剩餘車位',
    goal: [
      '停車場有 <b>3 個車位</b>。入口超音波（TRIG D8、ECHO D7）偵測到車子（<b>&lt; 15 cm</b>）且有空位：閘門（伺服 D9）<b>開到 90°</b>、車位減 1',
      '車子通過（距離 <b>&gt; 30 cm</b>）後等 <b>1 秒</b>再關閘（0°）；<b>同一台車只能算一次</b>',
      'LCD 第 1 行顯示 <code>Spaces: N</code>，車位為 0 時改顯示 <code>FULL</code>，並亮起滿位紅燈（D12）',
      '滿位時車子來了<b>不開門</b>；出口按鈕（D2）代表有車離場，車位加 1',
      '提示：用 <code>state</code> 變數設計「等車 → 開閘 → 等待關閘」的狀態機',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'sr04_1', type: 'sr04', x: 380, y: 470, props: { distance: 100 } }, { id: 'gate', type: 'servo', x: 420, y: 250 },
          { id: 'lcd1', type: 'lcd', x: 320, y: 30 }, { id: 'btn1', type: 'button', x: 600, y: 260 },
          { id: 'r1', type: 'resistor', x: 560, y: 400 }, { id: 'led1', type: 'led', x: 640, y: 330, props: { color: 'red' } }],
        wires: [{ a: 'sr04_1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'sr04_1:GND', b: 'uno:GND.3', color: '#222' }, { a: 'sr04_1:TRIG', b: 'uno:8', color: '#1565c0' }, { a: 'sr04_1:ECHO', b: 'uno:7', color: '#2e7d32' },
          { a: 'gate:PWM', b: 'uno:9', color: '#e67e22' }, { a: 'gate:V+', b: 'uno:5V', color: '#d32f2f' }, { a: 'gate:GND', b: 'uno:GND.1', color: '#222' },
          { a: 'lcd1:SDA', b: 'uno:A4', color: '#1565c0' }, { a: 'lcd1:SCL', b: 'uno:A5', color: '#f1c40f' }, { a: 'lcd1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'lcd1:GND', b: 'uno:GND.2', color: '#222' },
          { a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' },
          { a: 'uno:12', b: 'r1:1', color: '#e67e22' }, { a: 'r1:2', b: 'led1:A', color: '#e67e22' }, { a: 'led1:C', b: 'uno:GND.1', color: '#222' }],
      }),
      code: `#include <Servo.h>
#include <LiquidCrystal_I2C.h>

const int TRIG = 8, ECHO = 7, BTN = 2, FULL_LED = 12;
const int CAPACITY = 3;

Servo gate;
LiquidCrystal_I2C lcd(0x27, 16, 2);
int spaces = CAPACITY;
int state = 0;     // 0 = 等車、1 = 閘門開啟（等車通過）、2 = 等待關閘

float readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58.0;
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BTN, INPUT_PULLUP);
  pinMode(FULL_LED, OUTPUT);
  gate.attach(9);
  gate.write(0);
  lcd.init();
  lcd.backlight();
}

void loop() {

}
`,
    },
    hints: [
      '先寫 showSpaces()：在 LCD 印出車位（記得補空白蓋掉舊字），並依 spaces == 0 控制紅燈。',
      'state 0：偵測到車且 spaces > 0 → 開閘、spaces--、state = 1。state 1：距離 > 30 → 記下時間、state = 2。state 2：滿 1 秒就關閘回到 state 0（期間車子又靠近就回 state 1）。',
      '出口按鈕要偵測「剛按下」的瞬間，spaces 不能超過 CAPACITY。',
    ],
    solution: {
      mode: 'code',
      code: `#include <Servo.h>
#include <LiquidCrystal_I2C.h>

const int TRIG = 8, ECHO = 7, BTN = 2, FULL_LED = 12;
const int CAPACITY = 3;

Servo gate;
LiquidCrystal_I2C lcd(0x27, 16, 2);
int spaces = CAPACITY;
int state = 0;     // 0 = 等車、1 = 閘門開啟（等車通過）、2 = 等待關閘
unsigned long t0 = 0;
int lastBtn = HIGH;
unsigned long lastPress = 0;

float readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  return pulseIn(ECHO, HIGH) / 58.0;
}

void showSpaces() {
  lcd.setCursor(0, 0);
  if (spaces > 0) {
    lcd.print("Spaces: ");
    lcd.print(spaces);
    lcd.print("      ");
  } else {
    lcd.print("FULL            ");
  }
  digitalWrite(FULL_LED, spaces == 0);
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BTN, INPUT_PULLUP);
  pinMode(FULL_LED, OUTPUT);
  gate.attach(9);
  gate.write(0);
  lcd.init();
  lcd.backlight();
  showSpaces();
}

void loop() {
  // 出口按鈕：有車離場
  int b = digitalRead(BTN);
  if (lastBtn == HIGH && b == LOW && millis() - lastPress > 50) {
    lastPress = millis();
    if (spaces < CAPACITY) { spaces++; showSpaces(); }
  }
  lastBtn = b;

  float d = readDistance();
  bool car = d > 0 && d < 15;

  if (state == 0) {
    if (car && spaces > 0) {
      gate.write(90);
      spaces--;
      showSpaces();
      state = 1;
    }
  } else if (state == 1) {
    if (d > 30) { state = 2; t0 = millis(); }
  } else if (state == 2) {
    if (car) state = 1;
    else if (millis() - t0 >= 1000) { gate.write(0); state = 0; }
  }
  delay(30);
}
`,
    },
    async check(ctx) {
      const sr = ctx.parts('sr04').find(s => ctx.linked(s.id + ':ECHO', 'uno:7'));
      const gate = ctx.parts('servo').find(x => ctx.linked(x.id + ':PWM', 'uno:9'));
      const lcd = ctx.parts('lcd')[0];
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:2') || ctx.linked(b.id + ':2.l', 'uno:2'));
      const red = ctx.ledOnPin(12);
      ctx.expect(sr && gate && lcd && btn && red, '超音波、閘門、LCD、出口按鈕、滿位燈都接好了', '有零件沒接好，可按「重設關卡」');
      const angle = () => ctx.servoAngle(gate) ?? 0;
      const line = () => (ctx.lcdLines(lcd) || ['', ''])[0];
      const shows = n => n === 0 ? /FULL/i.test(line()) : new RegExp(`(^|\\D)${n}(\\D|$)`).test(line()) && !/FULL/i.test(line());
      ctx.setProp(sr, 'distance', 100); await ctx.wait(800);
      ctx.expect(angle() <= 10, '開機：閘門關閉', `開機時閘門角度 ${Math.round(angle())}°，應該關著（0°）`);
      ctx.expect(shows(3), `LCD 顯示「${line().trim()}」`, `LCD 第 1 行是「${line().trim()}」，應該顯示剩餘 3 個車位`);
      for (let k = 1; k <= 3; k++) {
        ctx.setProp(sr, 'distance', 8); await ctx.wait(900);
        ctx.expect(angle() >= 80, `第 ${k} 台車到達：閘門打開`, `第 ${k} 台車到了，閘門沒有打開（角度 ${Math.round(angle())}°）`);
        ctx.expect(shows(3 - k), `車位剩 ${3 - k}：LCD「${line().trim()}」`, `車子停在閘門前 0.9 秒後，LCD 是「${line().trim()}」，應該剩 ${3 - k}${3 - k === 0 ? '（顯示 FULL）' : ''}——同一台車只能算一次`);
        ctx.setProp(sr, 'distance', 100); await ctx.wait(400);
        ctx.expect(angle() >= 80, '車子剛通過：閘門還開著', '車子一通過閘門就馬上關了，要等 1 秒');
        await ctx.wait(1300);
        ctx.expect(angle() <= 10, '1 秒後關閘', `車子通過 1.7 秒後閘門還開著（${Math.round(angle())}°）`);
      }
      ctx.expect(ctx.ledOn(red), '滿位紅燈亮起', '車位滿了，紅燈（D12）沒有亮');
      ctx.setProp(sr, 'distance', 8); await ctx.wait(1500);
      ctx.expect(angle() <= 10, '滿位時第 4 台車來：閘門不開', '已經滿位了，閘門卻打開了');
      ctx.press(btn); await ctx.wait(150); ctx.release(btn); await ctx.wait(1000);
      ctx.expect(angle() >= 80, '有車離場後，等待中的車可以進場', '按出口按鈕（有車離場）後，等在門口的車沒有被放行');
      ctx.expect(shows(0) && ctx.ledOn(red), '進場後再次 FULL', `LCD「${line().trim()}」——放行後車位又滿了，應該顯示 FULL`);
      ctx.setProp(sr, 'distance', 100);
    },
  },
  {
    id: '7-2', island: 7, title: '自動澆花系統', brief: '濕度遲滯控制，加上最長澆水時間與休息時間',
    goal: [
      '土壤濕度感測器 AO → <b>A0</b>（乾燥約 900、濕透約 200），換算成 <b>0~100%</b> 顯示在 LCD 第 1 行',
      '抽水馬達由繼電器（<b>D4</b>）控制：濕度 <b>&lt; 30%</b> 開始澆水，達到 <b>60%</b> 停止',
      '安全機制 1：每次最多澆 <b>3 秒</b>（感測器壞掉也不會一直抽水）',
      '安全機制 2：停止後<b>休息 5 秒</b>讓水滲透，期間就算很乾也不澆',
      'LCD 第 2 行顯示 <code>Pump: ON</code> 或 <code>Pump: OFF</code>',
    ],
    starter: {
      mode: 'code',
      circuit: circuit({
        parts: [{ id: 'soil1', type: 'soil', x: 400, y: 470, props: { moisture: 50 } }, { id: 'lcd1', type: 'lcd', x: 320, y: 30 },
          { id: 'relay1', type: 'relay', x: 380, y: 280 }, { id: 'pump', type: 'motor', x: 560, y: 220 }],
        wires: [{ a: 'soil1:AO', b: 'uno:A0', color: '#2e7d32' }, { a: 'soil1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'soil1:GND', b: 'uno:GND.3', color: '#222' },
          { a: 'lcd1:SDA', b: 'uno:A4', color: '#1565c0' }, { a: 'lcd1:SCL', b: 'uno:A5', color: '#f1c40f' }, { a: 'lcd1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'lcd1:GND', b: 'uno:GND.2', color: '#222' },
          { a: 'relay1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'relay1:GND', b: 'uno:GND.2', color: '#222' }, { a: 'relay1:IN', b: 'uno:4', color: '#e67e22' },
          { a: 'relay1:COM', b: 'uno:5V', color: '#d32f2f' }, { a: 'relay1:NO', b: 'pump:M1', color: '#d32f2f' }, { a: 'pump:M2', b: 'uno:GND.1', color: '#222' }],
      }),
      code: `#include <LiquidCrystal_I2C.h>

const int SOIL = A0, PUMP = 4;
const int DRY = 900, WET = 200;          // 校正值
const int START = 30, STOP = 60;         // 遲滯：30% 開始、60% 停止
const unsigned long MAX_RUN = 3000;      // 每次最多澆 3 秒
const unsigned long REST = 5000;         // 停止後休息 5 秒

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  pinMode(PUMP, OUTPUT);
  lcd.init();
  lcd.backlight();
}

void loop() {

}
`,
    },
    hints: [
      'int moisture = constrain(map(analogRead(SOIL), DRY, WET, 0, 100), 0, 100);（DRY 比 WET 大，map 一樣能用）',
      '狀態：bool pumping、unsigned long since（這次開始澆的時間）、unsigned long restUntil（休息到什麼時候）。',
      '沒在澆：moisture < START 且 millis() >= restUntil 才開始。正在澆：moisture >= STOP 或 澆滿 MAX_RUN 就停，並設定 restUntil = millis() + REST。',
    ],
    solution: {
      mode: 'code',
      code: `#include <LiquidCrystal_I2C.h>

const int SOIL = A0, PUMP = 4;
const int DRY = 900, WET = 200;
const int START = 30, STOP = 60;
const unsigned long MAX_RUN = 3000;
const unsigned long REST = 5000;

LiquidCrystal_I2C lcd(0x27, 16, 2);
bool pumping = false;
unsigned long since = 0;
unsigned long restUntil = 0;

int readMoisture() {
  return constrain(map(analogRead(SOIL), DRY, WET, 0, 100), 0, 100);
}

void setPump(bool on) {
  pumping = on;
  digitalWrite(PUMP, on ? HIGH : LOW);
  since = millis();
  if (!on) restUntil = millis() + REST;
}

void setup() {
  pinMode(PUMP, OUTPUT);
  lcd.init();
  lcd.backlight();
}

void loop() {
  int m = readMoisture();
  if (!pumping) {
    if (m < START && millis() >= restUntil) setPump(true);
  } else if (m >= STOP || millis() - since >= MAX_RUN) {
    setPump(false);
  }

  lcd.setCursor(0, 0);
  lcd.print("Soil: ");
  lcd.print(m);
  lcd.print(" %    ");
  lcd.setCursor(0, 1);
  lcd.print(pumping ? "Pump: ON " : "Pump: OFF");
  delay(100);
}
`,
    },
    async check(ctx) {
      const soil = ctx.parts('soil').find(s => ctx.linked(s.id + ':AO', 'uno:A0'));
      const lcd = ctx.parts('lcd')[0], pump = ctx.parts('motor')[0];
      ctx.expect(soil && lcd && pump && ctx.parts('relay').some(r => ctx.linked(r.id + ':IN', 'uno:4')), '感測器、LCD、繼電器、抽水馬達都接好了', '有零件沒接好，可按「重設關卡」');
      const on = () => ctx.motor(pump) > 0.5;
      const lines = () => ctx.lcdLines(lcd) || ['', ''];
      const setM = v => ctx.setProp(soil, 'moisture', v);
      // 物理模擬：抽水時土壤每 0.1 秒變濕 2%
      let physics = false, alive = true;
      (async () => { while (alive) { if (physics && on()) setM(Math.min(100, soil.props.moisture + 2)); await ctx.wait(100); } })();
      try {
        setM(50); await ctx.wait(700);
        const n1 = (lines()[0].match(/\d+/) || [])[0];
        ctx.expect(n1 && Math.abs(+n1 - 50) <= 3, `濕度 50%：LCD「${lines()[0].trim()}」`, `濕度 50% 時 LCD 第 1 行是「${lines()[0].trim()}」——要用 map 把讀值換算成百分比`);
        ctx.expect(!on() && /OFF/i.test(lines()[1]), '濕度夠：不澆水，LCD 顯示 OFF', '濕度 50% 時不該澆水，LCD 第 2 行要顯示 Pump: OFF');
        setM(20); await ctx.wait(600);
        ctx.expect(on() && /ON/i.test(lines()[1]), '濕度降到 20%：開始澆水', '濕度 20% 了還沒開始澆水（或 LCD 沒顯示 ON）');
        physics = true;
        const s = await ctx.sample(() => ({ on: on(), m: soil.props.moisture }), 3500, 50);
        const stopAt = s.find(x => !x.v.on);
        ctx.expect(stopAt && stopAt.v.m >= 56 && stopAt.v.m <= 68, `澆到 ${stopAt?.v.m}% 停止`, stopAt ? `澆到 ${stopAt.v.m}% 就停了，要到 60%` : '濕度已經超過 60% 還在澆');
        physics = false;
        setM(20);
        const rest = await ctx.sample(on, 3500, 50);
        ctx.expect(!rest.some(x => x.v), '停止後休息中：就算又變乾也先不澆', '剛停止就又開始澆水了——停止後要休息 5 秒讓水滲透');
        await ctx.wait(2300);
        ctx.expect(on(), '休息 5 秒後：恢復澆水', '休息時間過了，土壤還是很乾，卻沒有再次澆水');
        ctx.note('模擬感測器故障：澆水時濕度都不上升…');
        const run = await ctx.sample(on, 3800, 50);
        const offAt = run.findIndex(x => !x.v);
        ctx.expect(offAt >= 0 && offAt * 50 <= 3400, `澆了約 ${((offAt * 50 + 600) / 1000).toFixed(1)} 秒自動停止（最長 3 秒）`, '濕度一直沒上升，抽水機卻澆超過 3 秒——要加上最長澆水時間');
      } finally { alive = false; }
    },
  },
  {
    id: '7-3', island: 7, title: '行人觸動號誌', brief: '按鈕請求過馬路，七段顯示器倒數',
    goal: [
      '車道燈：紅 D12、黃 D11、綠 D10；行人燈：紅 <b>A0</b>、綠 <b>A1</b>（類比腳位也能當數位輸出）；請求按鈕 D9；七段顯示器 A~G 接 D2~D8',
      '平時：<b>車道綠燈、行人紅燈</b>，七段顯示器不亮',
      '行人按下按鈕 → 車道綠燈<b>至少要亮滿 3 秒</b>才切換 → 黃燈 <b>1 秒</b> → 車道紅燈、行人綠燈',
      '行人綠燈共 <b>5 秒</b>：前 3 秒恆亮、後 2 秒<b>閃爍</b>；七段顯示器倒數 <b>5、4、3、2、1</b>',
      '結束後回到車道綠燈、行人紅燈',
    ],
    starter: {
      mode: 'code',
      circuit: (() => {
        const kit = (pin, n, x, y, color, gnd) => ({
          parts: [{ id: 'r' + n, type: 'resistor', x: x - 40, y: y + 70 }, { id: 'led' + n, type: 'led', x: x + 30, y, props: { color } }],
          wires: [{ a: 'uno:' + pin, b: `r${n}:1`, color: '#e67e22' }, { a: `r${n}:2`, b: `led${n}:A`, color: '#e67e22' }, { a: `led${n}:C`, b: 'uno:' + gnd, color: '#222' }],
        });
        return circuit(kit(12, 1, 150, 90, 'red', 'GND.1'), kit(11, 2, 240, 90, 'yellow', 'GND.1'), kit(10, 3, 330, 90, 'green', 'GND.1'),
          kit('A0', 4, 390, 490, 'red', 'GND.2'), kit('A1', 5, 480, 490, 'green', 'GND.2'), {
            parts: [{ id: 'seg1', type: 'seg7', x: 600, y: 60 }, { id: 'btn1', type: 'button', x: 560, y: 300 }],
            wires: [['A', 2], ['B', 3], ['C', 4], ['D', 5], ['E', 6], ['F', 7], ['G', 8]].map(([sg, p], k) => ({ a: 'seg1:' + sg, b: 'uno:' + p, color: ['#d32f2f', '#e67e22', '#f1c40f', '#2e7d32', '#1565c0', '#8e44ad', '#795548'][k] }))
              .concat([{ a: 'seg1:COM.1', b: 'uno:GND.1', color: '#222' }, { a: 'btn1:1.l', b: 'uno:9', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.3', color: '#222' }]),
          });
      })(),
      code: `const int CR = 12, CY = 11, CG = 10;   // 車道燈
const int PR = A0, PG = A1;              // 行人燈
const int BTN = 9, FIRST = 2;            // 按鈕、七段 A 接 D2

const byte DIGITS[10][7] = {
  {1,1,1,1,1,1,0}, {0,1,1,0,0,0,0}, {1,1,0,1,1,0,1}, {1,1,1,1,0,0,1}, {0,1,1,0,0,1,1},
  {1,0,1,1,0,1,1}, {1,0,1,1,1,1,1}, {1,1,1,0,0,0,0}, {1,1,1,1,1,1,1}, {1,1,1,1,0,1,1}
};

// 狀態：0 = 車道綠、1 = 車道黃、2 = 行人通行
int state = 0;
unsigned long t0 = 0;       // 進入目前狀態的時間
bool request = false;       // 有人按了按鈕

void setup() {
  int outs[] = {CR, CY, CG, PR, PG};
  for (int i = 0; i < 5; i++) pinMode(outs[i], OUTPUT);
  for (int i = 0; i < 7; i++) pinMode(FIRST + i, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
}

void loop() {

}
`,
    },
    hints: [
      '寫 enter(int s) { state = s; t0 = millis(); } 切換狀態，用 millis() - t0 算出「這個狀態已經過了多久」。',
      '按鈕只負責把 request 設成 true；狀態 0 裡判斷「request 且已經綠燈 ≥ 3 秒」才進入狀態 1。',
      '行人通行時：倒數 = 5 - t / 1000；閃爍 = t >= 3000 時用 (t / 250) % 2 決定亮或滅。',
    ],
    solution: {
      mode: 'code',
      code: `const int CR = 12, CY = 11, CG = 10;
const int PR = A0, PG = A1;
const int BTN = 9, FIRST = 2;

const byte DIGITS[10][7] = {
  {1,1,1,1,1,1,0}, {0,1,1,0,0,0,0}, {1,1,0,1,1,0,1}, {1,1,1,1,0,0,1}, {0,1,1,0,0,1,1},
  {1,0,1,1,0,1,1}, {1,0,1,1,1,1,1}, {1,1,1,0,0,0,0}, {1,1,1,1,1,1,1}, {1,1,1,1,0,1,1}
};

int state = 0;
unsigned long t0 = 0;
bool request = false;
int lastBtn = HIGH;

void enter(int s) { state = s; t0 = millis(); }

void lights(int cr, int cy, int cg, int pr, int pg) {
  digitalWrite(CR, cr); digitalWrite(CY, cy); digitalWrite(CG, cg);
  digitalWrite(PR, pr); digitalWrite(PG, pg);
}

void showDigit(int n) {            // n < 0 表示不顯示
  for (int s = 0; s < 7; s++) digitalWrite(FIRST + s, n < 0 ? 0 : DIGITS[n][s]);
}

void setup() {
  int outs[] = {CR, CY, CG, PR, PG};
  for (int i = 0; i < 5; i++) pinMode(outs[i], OUTPUT);
  for (int i = 0; i < 7; i++) pinMode(FIRST + i, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  enter(0);
}

void loop() {
  int b = digitalRead(BTN);
  if (lastBtn == HIGH && b == LOW) request = true;
  lastBtn = b;

  unsigned long t = millis() - t0;
  if (state == 0) {                       // 車道綠
    lights(0, 0, 1, 1, 0);
    showDigit(-1);
    if (request && t >= 3000) { request = false; enter(1); }
  } else if (state == 1) {                // 車道黃
    lights(0, 1, 0, 1, 0);
    if (t >= 1000) enter(2);
  } else if (state == 2) {                // 行人通行 5 秒
    bool walk = t < 3000 || (t / 250) % 2 == 0;
    lights(1, 0, 0, 0, walk);
    showDigit(5 - t / 1000);
    if (t >= 5000) { request = false; enter(0); }
  }
  delay(10);
}
`,
    },
    async check(ctx) {
      const cr = needLed(ctx, 12), cy = needLed(ctx, 11), cg = needLed(ctx, 10), pr = needLed(ctx, 14), pg = needLed(ctx, 15);
      const seg = ctx.parts('seg7').find(x => ctx.linked(x.id + ':A', 'uno:2'));
      const btn = ctx.parts('button').find(b => ctx.linked(b.id + ':1.l', 'uno:9') || ctx.linked(b.id + ':2.l', 'uno:9'));
      ctx.expect(seg && btn, '七段顯示器與請求按鈕都接好了', '找不到七段顯示器（A 接 D2）或接在 D9 的按鈕');
      const st = () => ['R', 'Y', 'G'].filter((k, i) => ctx.ledOn([cr, cy, cg][i])).join('') + '/' + (ctx.ledOn(pr) ? 'r' : '') + (ctx.ledOn(pg) ? 'g' : '');
      const click = async () => { ctx.press(btn); await ctx.wait(150); ctx.release(btn); };
      await ctx.wait(600);
      ctx.expect(st() === 'G/r', '平時：車道綠、行人紅', `平時的燈號是「${st()}」，應該是車道綠燈、行人紅燈`);
      ctx.expect(ctx.seg7Digit(seg) === '空白', '平時七段顯示器不亮', '平時七段顯示器應該不亮');
      await ctx.wait(3000);
      await click();
      await ctx.wait(300);
      ctx.expect(st() === 'Y/r', '按下按鈕（綠燈已超過 3 秒）：車道轉黃燈', `按下按鈕 0.3 秒後是「${st()}」，綠燈已經超過 3 秒，應該轉黃燈`);
      await ctx.wait(900);
      ctx.expect(st() === 'R/g', '黃燈 1 秒後：車道紅、行人綠', `黃燈後應該車道紅、行人綠，現在是「${st()}」`);
      ctx.note('記錄行人通行 5 秒…');
      const walk = await ctx.sample(() => ({ d: ctx.seg7Digit(seg), g: ctx.ledOn(pg), s: st() }), 4500, 20);
      const digits = segments(walk, v => v.d).filter(x => x.dur > 300).map(x => x.k);
      ctx.expect(digits.slice(0, 5).join('') === '54321', `七段倒數：${digits.join(' → ')}`, `七段顯示 ${digits.join(' → ')}，應該是 5 → 4 → 3 → 2 → 1`);
      const steady = walk.filter(x => x.t < 2700).every(x => x.v.g);
      const blinkSegs = segments(walk.filter(x => x.t > 3150), v => v.g).filter(x => !x.k && x.dur >= 100).length;
      ctx.expect(steady, '前 3 秒行人綠燈恆亮', '行人綠燈前 3 秒應該一直亮著');
      ctx.expect(blinkSegs >= 2, '最後 2 秒行人綠燈閃爍', '最後 2 秒行人綠燈要閃爍（亮、滅交替）');
      ctx.expect(walk.every(x => x.v.s.startsWith('R/')), '行人通行期間車道一直是紅燈', '行人通行期間車道燈不是紅燈！');
      await ctx.wait(500);
      ctx.expect(st() === 'G/r' && ctx.seg7Digit(seg) === '空白', '結束：回到車道綠、行人紅，七段熄滅', `行人時間結束後是「${st()}」，應該回到車道綠、行人紅（七段熄滅）`);
      await click();
      const hold = await ctx.sample(st, 2300, 50);
      ctx.expect(hold.every(x => x.v === 'G/r'), '綠燈才剛亮就按：車道綠燈仍維持到滿 3 秒', '車道綠燈才剛亮，按下按鈕就馬上切換了——綠燈至少要亮滿 3 秒');
      await ctx.wait(1200);
      ctx.expect(st() === 'Y/r' || st() === 'R/g', '滿 3 秒後接著切換黃燈', `綠燈滿 3 秒後應該切換，現在是「${st()}」——按下的請求要被記住`);
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
