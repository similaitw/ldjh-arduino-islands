// 零件定義與分類
export const CATEGORIES = [
  { id: 'output', name: '💡 基本輸出' },
  { id: 'input', name: '🔘 基本輸入' },
  { id: 'env', name: '🌡️ 環境感測' },
  { id: 'distance', name: '📏 距離與動作' },
  { id: 'motion', name: '⚙️ 動力' },
  { id: 'display', name: '🖥️ 顯示' },
  { id: 'passive', name: '🔩 被動元件' },
];

export const PARTS = {
  uno: { tag: 'wokwi-arduino-uno', name: 'Arduino Uno', prefix: 'uno' },
  led: { tag: 'wokwi-led', name: 'LED', cat: 'output', prefix: 'led', props: { color: 'red' },
    desc: '長腳 A（陽極）接腳位，短腳 C（陰極）接 GND，記得串電阻。' },
  rgb: { tag: 'wokwi-rgb-led', name: 'RGB LED（共陰）', cat: 'output', prefix: 'rgb',
    desc: 'COM 接 GND，R/G/B 各接一支 PWM 腳位即可調色。' },
  buzzer: { tag: 'wokwi-buzzer', name: '蜂鳴器（無源）', cat: 'output', prefix: 'bz',
    desc: '用 tone(腳位, 頻率) 發聲，另一腳接 GND。' },
  button: { tag: 'wokwi-pushbutton', name: '按鈕', cat: 'input', prefix: 'btn', props: { color: 'green' },
    desc: '同側 1.l/1.r 相通、2.l/2.r 相通；按下時 1 與 2 導通。搭配 INPUT_PULLUP 最方便。' },
  pot: { tag: 'wokwi-potentiometer', name: '可變電阻', cat: 'input', prefix: 'pot',
    desc: 'VCC 接 5V、GND 接 GND、SIG 接類比腳位 A0~A5。拖曳旋鈕即可改變數值。' },
  ldr: { tag: 'wokwi-photoresistor-sensor', name: '光敏電阻模組', cat: 'env', prefix: 'ldr', props: { lux: 500, threshold: 512 },
    desc: 'AO 為類比輸出（越暗數值越大），DO 為數位輸出（比門檻暗時為 HIGH）。' },
  soil: { tag: 'ardu-soil', name: '土壤濕度感測器', cat: 'env', prefix: 'soil', props: { moisture: 50 },
    desc: 'AO 接類比腳位。越濕讀值越小：完全乾燥約 900、泡在水裡約 200。' },
  dht: { tag: 'wokwi-dht22', name: 'DHT22 溫溼度', cat: 'env', prefix: 'dht', props: { temp: 25, hum: 60 },
    desc: 'SDA 接數位腳位，使用 DHT 函式庫：dht.readTemperature()、dht.readHumidity()。' },
  sr04: { tag: 'wokwi-hc-sr04', name: 'HC-SR04 超音波', cat: 'distance', prefix: 'sr04', props: { distance: 100 },
    desc: 'TRIG 送 10µs 脈衝，用 pulseIn(ECHO, HIGH) 量回波時間，距離 = 時間 / 58（公分）。' },
  pir: { tag: 'wokwi-pir-motion-sensor', name: 'PIR 人體感測', cat: 'distance', prefix: 'pir', props: { motion: false },
    desc: 'OUT 偵測到人時輸出 HIGH。' },
  servo: { tag: 'wokwi-servo', name: '伺服馬達 SG90', cat: 'motion', prefix: 'servo',
    desc: 'PWM 接數位腳位，V+ 接 5V，使用 Servo 函式庫：s.attach(9); s.write(90);' },
  motor: { tag: 'ardu-dc-motor', name: '直流馬達', cat: 'motion', prefix: 'motor',
    desc: '轉速與方向取決於 M1、M2 的電壓差。不能直接接 Arduino 腳位（電流太大），要透過 L298N 或繼電器。' },
  l298n: { tag: 'ardu-l298n', name: 'L298N 馬達驅動板', cat: 'motion', prefix: 'drv',
    desc: 'IN1/IN2 控制方向（一高一低轉、相同則停），ENA 接 PWM 腳位控制轉速（ENA 不接 = 全速）。OUT1/OUT2 接馬達，VCC 接 5V。' },
  relay: { tag: 'ardu-relay', name: '繼電器模組', cat: 'motion', prefix: 'relay',
    desc: 'IN 為 HIGH 時吸合：COM 與 NO 導通；平時 COM 與 NC 導通。用小訊號控制大電流負載（抽水馬達、燈泡）。（真實模組有些是低電位觸發）' },
  seg7: { tag: 'wokwi-7segment', name: '七段顯示器（共陰）', cat: 'display', prefix: 'seg', props: { color: 'red' },
    desc: 'COM 接 GND；A~G 各段接數位腳位，輸出 HIGH 該段就亮。真實電路每段要串電阻。' },
  lcd: { tag: 'wokwi-lcd1602', name: 'LCD1602（I2C）', cat: 'display', prefix: 'lcd',
    desc: 'SDA→A4、SCL→A5、VCC→5V。使用 LiquidCrystal_I2C：lcd.init(); lcd.backlight(); lcd.setCursor(格, 行); lcd.print(...)' },
  strip: { tag: 'wokwi-neopixel-matrix', name: 'WS2812 燈條（8 顆）', cat: 'display', prefix: 'strip',
    desc: 'DIN 接數位腳位，VCC→5V。使用 Adafruit_NeoPixel：strip.setPixelColor(i, strip.Color(r, g, b)); strip.show();' },
  resistor: { tag: 'wokwi-resistor', name: '電阻', cat: 'passive', prefix: 'r', props: { value: 220 },
    desc: 'LED 限流常用 220Ω；按鈕下拉電阻常用 10kΩ。' },
};

// 規劃中、尚未開放的零件（顯示在零件庫中）
export const COMING = {
  output: [],
  input: ['類比搖桿', '4×4 薄膜鍵盤', '紅外線遙控接收'],
  env: ['雨滴感測', '聲音感測'],
  distance: ['紅外線循跡', '傾斜開關'],
  motion: ['步進馬達'],
  display: ['OLED 128×64', '四位數七段'],
  passive: [],
};

export const UNO_PINS = {
  digital: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'],
  analog: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
  pwm: [3, 5, 6, 9, 10, 11],
};

export function pinNumberToName(p) {
  return p >= 14 && p <= 19 ? 'A' + (p - 14) : String(p);
}
export function pinNameToNumber(n) {
  if (/^A[0-5]$/.test(n)) return 14 + +n[1];
  if (/^\d+$/.test(n)) return +n;
  return null;
}
