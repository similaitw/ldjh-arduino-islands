// 範例：電路 + 程式（部分附積木）
const num = n => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const chain = (...bs) => bs.reduceRight((next, b) => (next ? { ...b, next: { block: next } } : b), null);
const prog = (setup, loop, variables) => ({
  blocks: { languageVersion: 0, blocks: [{ type: 'arduino_program', x: 20, y: 20, deletable: false,
    inputs: Object.fromEntries([['SETUP', setup], ['LOOP', loop]].filter(([, b]) => b).map(([k, b]) => [k, { block: b }])) }] },
  ...(variables ? { variables } : {}),
});
const UNO = { id: 'uno', type: 'uno', x: 60, y: 240 };
const ledOn = (pin, ledId, rId, x, color = 'red') => ({
  parts: [{ id: rId, type: 'resistor', x: x - 40, y: 160 }, { id: ledId, type: 'led', x: x + 30, y: 90, props: { color } }],
  wires: [{ a: 'uno:' + pin, b: rId + ':1', color: '#e67e22' }, { a: rId + ':2', b: ledId + ':A', color: '#e67e22' }, { a: ledId + ':C', b: 'uno:GND.1', color: '#222' }],
});
const merge = (...cs) => ({ parts: [UNO, ...cs.flatMap(c => c.parts)], wires: cs.flatMap(c => c.wires) });

export const EXAMPLES = [
  {
    id: 'blink', name: '1. Blink 閃爍燈（積木）', mode: 'blocks',
    circuit: merge(ledOn(13, 'led1', 'r1', 200)),
    blocks: prog(
      { type: 'io_pinmode', fields: { PIN: '13', MODE: 'OUTPUT' } },
      chain(
        { type: 'io_digitalwrite', fields: { PIN: '13', VAL: 'HIGH' } },
        { type: 'time_delay', inputs: { MS: num(500) } },
        { type: 'io_digitalwrite', fields: { PIN: '13', VAL: 'LOW' } },
        { type: 'time_delay', inputs: { MS: num(500) } },
      )),
  },
  {
    id: 'button', name: '2. 按鈕控制 LED（積木）', mode: 'blocks',
    circuit: merge(ledOn(13, 'led1', 'r1', 200), {
      parts: [{ id: 'btn1', type: 'button', x: 400, y: 120 }],
      wires: [{ a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' }],
    }),
    blocks: prog(
      chain({ type: 'io_pinmode', fields: { PIN: '13', MODE: 'OUTPUT' } }, { type: 'io_pinmode', fields: { PIN: '2', MODE: 'INPUT_PULLUP' } }),
      { type: 'controls_if', extraState: { hasElse: true },
        inputs: {
          IF0: { block: { type: 'logic_compare', fields: { OP: 'EQ' }, inputs: { A: { block: { type: 'io_digitalread', fields: { PIN: '2' } } }, B: { block: { type: 'io_highlow', fields: { VAL: 'LOW' } } } } } },
          DO0: { block: { type: 'io_digitalwrite', fields: { PIN: '13', VAL: 'HIGH' } } },
          ELSE: { block: { type: 'io_digitalwrite', fields: { PIN: '13', VAL: 'LOW' } } },
        } }),
    tip: 'INPUT_PULLUP：沒按時讀到 HIGH，按下（接到 GND）時讀到 LOW。',
  },
  {
    id: 'pot', name: '3. 可變電阻調亮度 PWM（積木）', mode: 'blocks',
    circuit: merge(ledOn(9, 'led1', 'r1', 330), {
      parts: [{ id: 'pot1', type: 'pot', x: 420, y: 480, props: { value: 600 } }],
      wires: [{ a: 'pot1:SIG', b: 'uno:A0', color: '#2e7d32' }, { a: 'pot1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'pot1:GND', b: 'uno:GND.2', color: '#222' }],
    }),
    blocks: (() => {
      const v = { id: 'vv' };
      return prog(
        { type: 'serial_begin', fields: { BAUD: '9600' } },
        chain(
          { type: 'variables_set', fields: { VAR: v }, inputs: { VALUE: { block: { type: 'io_analogread', fields: { PIN: 'A0' } } } } },
          { type: 'io_analogwrite', fields: { PIN: '9' }, inputs: { VAL: { block: { type: 'math_map', inputs: { X: { block: { type: 'variables_get', fields: { VAR: v } } }, A: num(0), B: num(1023), C: num(0), D: num(255) } } } } },
          { type: 'serial_print', fields: { MODE: 'println' }, inputs: { VAL: { block: { type: 'variables_get', fields: { VAR: v } } } } },
          { type: 'time_delay', inputs: { MS: num(100) } },
        ), [{ name: 'value', id: 'vv' }]);
    })(),
    tip: '轉動可變電阻旋鈕，觀察 LED 亮度與序列埠數值。',
  },
  {
    id: 'millis', name: '4. 不用 delay 的多工（millis + 去彈跳）', mode: 'code',
    circuit: merge(ledOn(12, 'led1', 'r1', 160), ledOn(10, 'led2', 'r2', 300, 'green'), {
      parts: [{ id: 'btn1', type: 'button', x: 470, y: 120, props: { color: 'blue' } }, { id: 'led3', type: 'led', x: 560, y: 90, props: { color: 'yellow' } }, { id: 'r3', type: 'resistor', x: 560, y: 175 }],
      wires: [{ a: 'btn1:1.l', b: 'uno:2', color: '#1565c0' }, { a: 'btn1:2.r', b: 'uno:GND.1', color: '#222' },
        { a: 'uno:7', b: 'r3:1', color: '#e67e22' }, { a: 'r3:2', b: 'led3:A', color: '#e67e22' }, { a: 'led3:C', b: 'uno:GND.1', color: '#222' }],
    }),
    code: `// 兩顆 LED 以不同速度閃爍，同時隨時偵測按鈕
// 重點：用 millis() 記錄時間，loop() 永遠不會被 delay() 卡住

const int RED = 12, GREEN = 10, YELLOW = 7, BTN = 2;
unsigned long lastRed = 0, lastGreen = 0, lastDebounce = 0;
bool redOn = false, greenOn = false, yellowOn = false;
int lastReading = HIGH, stableState = HIGH;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  unsigned long now = millis();

  if (now - lastRed >= 300) {      // 紅燈每 300ms 切換
    lastRed = now;
    redOn = !redOn;
    digitalWrite(RED, redOn);
  }
  if (now - lastGreen >= 1000) {   // 綠燈每 1000ms 切換
    lastGreen = now;
    greenOn = !greenOn;
    digitalWrite(GREEN, greenOn);
  }

  // 按鈕去彈跳：讀值穩定 30ms 以上才算數
  int reading = digitalRead(BTN);
  if (reading != lastReading) lastDebounce = now;
  if (now - lastDebounce > 30 && reading != stableState) {
    stableState = reading;
    if (stableState == LOW) {      // 按下的瞬間
      yellowOn = !yellowOn;
      digitalWrite(YELLOW, yellowOn);
      Serial.print("黃燈切換為 ");
      Serial.println(yellowOn ? "ON" : "OFF");
    }
  }
  lastReading = reading;
}
`,
    tip: '試試把紅燈改成 delay() 寫法，按鈕會變得很不靈敏——這就是要學 millis() 的原因。',
  },
  {
    id: 'ldr', name: '5. 自動路燈（光敏電阻）', mode: 'code',
    circuit: merge(ledOn(9, 'led1', 'r1', 330, 'white'), {
      parts: [{ id: 'ldr1', type: 'ldr', x: 420, y: 470, props: { lux: 500, threshold: 512 } }],
      wires: [{ a: 'ldr1:AO', b: 'uno:A0', color: '#2e7d32' }, { a: 'ldr1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'ldr1:GND', b: 'uno:GND.2', color: '#222' }],
    }),
    code: `// 環境越暗，路燈越亮
// 選取 ldr1 後，在右下「零件屬性」拖動亮度滑桿模擬白天/黑夜

const int LDR = A0;
const int LAMP = 9;
const int DARK = 700;    // 校正值：比這個暗才開燈
const int BRIGHT = 300;  // 比這個亮就全關

void setup() {
  pinMode(LAMP, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(LDR);           // 越暗數值越大
  int level = map(raw, BRIGHT, DARK, 0, 255);
  level = constrain(level, 0, 255);
  analogWrite(LAMP, level);

  Serial.print("光感值 = ");
  Serial.print(raw);
  Serial.print("  亮度 = ");
  Serial.println(level);
  delay(200);
}
`,
    tip: '把 lux 拉到 1、10、100、1000，記錄 analogRead 數值，自己決定 DARK / BRIGHT 的校正值。',
  },
  {
    id: 'radar', name: '6. 超音波倒車雷達', mode: 'code',
    circuit: merge({
      parts: [{ id: 'sr04_1', type: 'sr04', x: 300, y: 40, props: { distance: 80 } }, { id: 'bz1', type: 'buzzer', x: 560, y: 300 }],
      wires: [{ a: 'sr04_1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'sr04_1:GND', b: 'uno:GND.1', color: '#222' },
        { a: 'sr04_1:TRIG', b: 'uno:8', color: '#1565c0' }, { a: 'sr04_1:ECHO', b: 'uno:7', color: '#2e7d32' },
        { a: 'bz1:1', b: 'uno:GND.3', color: '#222' }, { a: 'bz1:2', b: 'uno:5', color: '#e67e22' }],
    }),
    code: `// 距離越近，嗶聲越急促（小於 10cm 長鳴）
// 選取 sr04_1，調整距離滑桿模擬障礙物

const int TRIG = 8, ECHO = 7, BUZZER = 5;
unsigned long lastBeep = 0;
bool beeping = false;

float readDistance() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH);
  return duration / 58.0;   // 聲速換算成公分
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(9600);
}

void loop() {
  float d = readDistance();
  Serial.print("距離: ");
  Serial.print(d, 1);
  Serial.println(" cm");

  if (d <= 0 || d > 100) {
    noTone(BUZZER);
  } else if (d < 10) {
    tone(BUZZER, 1000);
  } else {
    int interval = map(d, 10, 100, 80, 800);
    if (millis() - lastBeep >= interval) {
      lastBeep = millis();
      beeping = !beeping;
      if (beeping) tone(BUZZER, 1000); else noTone(BUZZER);
    }
  }
  delay(30);
}
`,
    tip: '想想看：為什麼 duration 要除以 58？（提示：聲速 340 m/s，來回兩趟）',
  },
  {
    id: 'dht', name: '7. 溫溼度監測（DHT22）', mode: 'code',
    circuit: merge(ledOn(13, 'led1', 'r1', 200), {
      parts: [{ id: 'dht1', type: 'dht', x: 430, y: 40, props: { temp: 26.5, hum: 62 } }],
      wires: [{ a: 'dht1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'dht1:GND', b: 'uno:GND.2', color: '#222' }, { a: 'dht1:SDA', b: 'uno:2', color: '#2e7d32' }],
    }),
    code: `#include <DHT.h>

DHT dht(2, DHT22);
const int ALARM = 13;
const float LIMIT = 30.0;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(ALARM, OUTPUT);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("讀取失敗，檢查接線！");
  } else {
    Serial.print("溫度 ");
    Serial.print(t, 1);
    Serial.print(" °C  濕度 ");
    Serial.print(h, 1);
    Serial.println(" %");
    digitalWrite(ALARM, t > LIMIT ? HIGH : LOW);
  }
  delay(2000);   // DHT22 每 2 秒才能讀一次
}
`,
    tip: '把溫度拉過 30°C，警示燈會亮。挑戰：加入「遲滯」，避免溫度在 30 附近時燈一直閃。',
  },
  {
    id: 'servo', name: '8. 旋鈕控制伺服馬達', mode: 'code',
    circuit: merge({
      parts: [{ id: 'servo1', type: 'servo', x: 380, y: 60 }, { id: 'pot1', type: 'pot', x: 420, y: 480, props: { value: 512 } }],
      wires: [{ a: 'servo1:PWM', b: 'uno:9', color: '#e67e22' }, { a: 'servo1:V+', b: 'uno:5V', color: '#d32f2f' }, { a: 'servo1:GND', b: 'uno:GND.1', color: '#222' },
        { a: 'pot1:SIG', b: 'uno:A0', color: '#2e7d32' }, { a: 'pot1:VCC', b: 'uno:5V', color: '#d32f2f' }, { a: 'pot1:GND', b: 'uno:GND.2', color: '#222' }],
    }),
    code: `#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  int angle = map(raw, 0, 1023, 0, 180);
  arm.write(angle);
  Serial.println(angle);
  delay(20);
}
`,
    tip: '挑戰：改成「平滑移動」——每次只往目標角度移動 1 度。',
  },
];

export const EMPTY_BLOCKS = prog(null, null);
export const DEFAULT_CODE = `void setup() {
  // 開機時執行一次
}

void loop() {
  // 不斷重複執行
}
`;
