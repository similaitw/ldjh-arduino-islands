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
  dht: { tag: 'wokwi-dht22', name: 'DHT22 溫溼度', cat: 'env', prefix: 'dht', props: { temp: 25, hum: 60 },
    desc: 'SDA 接數位腳位，使用 DHT 函式庫：dht.readTemperature()、dht.readHumidity()。' },
  sr04: { tag: 'wokwi-hc-sr04', name: 'HC-SR04 超音波', cat: 'distance', prefix: 'sr04', props: { distance: 100 },
    desc: 'TRIG 送 10µs 脈衝，用 pulseIn(ECHO, HIGH) 量回波時間，距離 = 時間 / 58（公分）。' },
  pir: { tag: 'wokwi-pir-motion-sensor', name: 'PIR 人體感測', cat: 'distance', prefix: 'pir', props: { motion: false },
    desc: 'OUT 偵測到人時輸出 HIGH。' },
  servo: { tag: 'wokwi-servo', name: '伺服馬達 SG90', cat: 'motion', prefix: 'servo',
    desc: 'PWM 接數位腳位，V+ 接 5V，使用 Servo 函式庫：s.attach(9); s.write(90);' },
  resistor: { tag: 'wokwi-resistor', name: '電阻', cat: 'passive', prefix: 'r', props: { value: 220 },
    desc: 'LED 限流常用 220Ω；按鈕下拉電阻常用 10kΩ。' },
};

// 規劃中、尚未開放的零件（顯示在零件庫中）
export const COMING = {
  output: ['WS2812 燈條'],
  input: ['類比搖桿', '4×4 薄膜鍵盤', '紅外線遙控接收'],
  env: ['土壤濕度', '雨滴感測', '聲音感測'],
  distance: ['紅外線循跡', '傾斜開關'],
  motion: ['直流馬達 + L298N', '繼電器'],
  display: ['LCD1602 (I2C)', '七段顯示器', 'OLED 128×64'],
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
