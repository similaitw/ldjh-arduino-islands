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
  { id: 4, name: '感測星', icon: '🌡️', color: '#e07a5f', theme: '感測器：校正、遲滯、濾波', desc: '真實世界的感測器數值會漂移、跳動、有雜訊。學會用校正、遲滯與濾波，讓機器做出穩定的判斷。' },
  { id: 5, name: '動力星', icon: '⚙️', color: '#9b8ec4', theme: '伺服、馬達與繼電器', desc: '讓東西動起來：伺服的平滑控制、用驅動板控制馬達轉速與方向、用繼電器開關大電流負載。' },
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
];

export const levelById = id => LEVELS.find(l => l.id === id);
export function nextLevel(id) {
  const i = LEVELS.findIndex(l => l.id === id);
  return LEVELS[i + 1] || null;
}

const PKEY = 'ardu-progress-v1';
export function getProgress() { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } }
export function markDone(id) { try { const p = getProgress(); p[id] = Date.now(); localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) { /* 無法儲存 */ } }
