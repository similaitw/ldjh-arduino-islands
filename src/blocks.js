// Blockly 積木定義 + Arduino C 產生器
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { javascriptGenerator as gen, Order } from 'blockly/javascript';
import * as zhHant from 'blockly/msg/zh-hant';

Blockly.setLocale(zhHant);

const DIGITAL = [...Array(14).keys()].map(i => [String(i), String(i)]).concat(['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map(a => [a, a]));
const PWM = ['3', '5', '6', '9', '10', '11'].map(p => ['~' + p, p]);
const ANALOG = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map(a => [a, a]);

const C_MOTOR = '#7b5fc4', C_DISPLAY = '#16a085';
const C_IO = '#2f80ed', C_TIME = '#27ae60', C_SERIAL = '#8e44ad', C_SENSOR = '#e67e22', C_OUT = '#c0392b', C_MATH = '#5b67a5';

Blockly.common.defineBlocksWithJsonArray([
  { type: 'arduino_program', message0: '⚙ 開機時執行一次（setup）%1 %2', args0: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'SETUP' }],
    message1: '🔁 不斷重複執行（loop）%1 %2', args1: [{ type: 'input_dummy' }, { type: 'input_statement', name: 'LOOP' }],
    colour: '#00838f', tooltip: '每個 Arduino 程式都由 setup() 與 loop() 組成', deletable: false },
  { type: 'io_pinmode', message0: '設定腳位 %1 為 %2', args0: [
    { type: 'field_dropdown', name: 'PIN', options: DIGITAL },
    { type: 'field_dropdown', name: 'MODE', options: [['輸出 OUTPUT', 'OUTPUT'], ['輸入 INPUT', 'INPUT'], ['輸入上拉 INPUT_PULLUP', 'INPUT_PULLUP']] }],
    previousStatement: null, nextStatement: null, colour: C_IO, tooltip: 'pinMode(腳位, 模式)' },
  { type: 'io_digitalwrite', message0: '數位輸出 腳位 %1 設為 %2', args0: [
    { type: 'field_dropdown', name: 'PIN', options: DIGITAL },
    { type: 'field_dropdown', name: 'VAL', options: [['HIGH（高電位）', 'HIGH'], ['LOW（低電位）', 'LOW']] }],
    previousStatement: null, nextStatement: null, colour: C_IO, tooltip: 'digitalWrite(腳位, HIGH/LOW)' },
  { type: 'io_digitalwrite_var', message0: '數位輸出 腳位 %1 設為 %2', args0: [
    { type: 'field_dropdown', name: 'PIN', options: DIGITAL }, { type: 'input_value', name: 'VAL' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_IO, tooltip: 'digitalWrite(腳位, 值)；值可以是 HIGH/LOW 或變數' },
  { type: 'io_highlow', message0: '%1', args0: [{ type: 'field_dropdown', name: 'VAL', options: [['HIGH', 'HIGH'], ['LOW', 'LOW']] }], output: 'Number', colour: C_IO },
  { type: 'io_digitalread', message0: '數位讀取 腳位 %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL }], output: 'Number', colour: C_IO, tooltip: 'digitalRead(腳位) 回傳 HIGH(1) 或 LOW(0)' },
  { type: 'io_analogwrite', message0: '類比輸出 PWM 腳位 %1 值 %2', args0: [
    { type: 'field_dropdown', name: 'PIN', options: PWM }, { type: 'input_value', name: 'VAL', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_IO, tooltip: 'analogWrite(腳位, 0~255)，只有 ~ 腳位支援' },
  { type: 'io_analogread', message0: '類比讀取 腳位 %1', args0: [{ type: 'field_dropdown', name: 'PIN', options: ANALOG }], output: 'Number', colour: C_IO, tooltip: 'analogRead(A0~A5) 回傳 0~1023' },
  { type: 'time_delay', message0: '等待 %1 毫秒', args0: [{ type: 'input_value', name: 'MS', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_TIME, tooltip: 'delay(毫秒)：等待期間程式完全停住' },
  { type: 'time_millis', message0: '開機經過毫秒 millis()', output: 'Number', colour: C_TIME, tooltip: '不會卡住程式的計時方式，適合多工' },
  { type: 'serial_begin', message0: '序列埠開始 鮑率 %1', args0: [{ type: 'field_dropdown', name: 'BAUD', options: [['9600', '9600'], ['115200', '115200']] }],
    previousStatement: null, nextStatement: null, colour: C_SERIAL },
  { type: 'serial_print', message0: '序列埠 %1 %2', args0: [
    { type: 'field_dropdown', name: 'MODE', options: [['印出並換行', 'println'], ['印出', 'print']] }, { type: 'input_value', name: 'VAL' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_SERIAL },
  { type: 'math_map', message0: '對應 %1 從 %2 ~ %3 到 %4 ~ %5', args0: [
    { type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' },
    { type: 'input_value', name: 'C', check: 'Number' }, { type: 'input_value', name: 'D', check: 'Number' }], inputsInline: true, output: 'Number', colour: C_MATH, tooltip: 'map()：把數值從一個範圍等比例換算到另一個範圍' },
  { type: 'math_constrain2', message0: '限制 %1 介於 %2 ~ %3', args0: [
    { type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true, output: 'Number', colour: C_MATH },
  { type: 'math_random2', message0: '隨機整數 %1 ~ %2 （不含）', args0: [
    { type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true, output: 'Number', colour: C_MATH },
  { type: 'tone_play', message0: '蜂鳴器 腳位 %1 發出 %2 Hz', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL }, { type: 'input_value', name: 'F', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_OUT },
  { type: 'tone_stop', message0: '蜂鳴器 腳位 %1 停止', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL }], previousStatement: null, nextStatement: null, colour: C_OUT },
  { type: 'servo_write', message0: '伺服馬達 腳位 %1 轉到 %2 度', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL.slice(2, 14) }, { type: 'input_value', name: 'A', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_OUT },
  { type: 'sr04_read', message0: '超音波距離(cm) Trig %1 Echo %2', args0: [{ type: 'field_dropdown', name: 'TRIG', options: DIGITAL.slice(2, 14) }, { type: 'field_dropdown', name: 'ECHO', options: DIGITAL.slice(2, 14) }], output: 'Number', colour: C_SENSOR },
  { type: 'dht_read', message0: 'DHT22 腳位 %1 讀取 %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL.slice(2, 14) }, { type: 'field_dropdown', name: 'WHAT', options: [['溫度 °C', 'T'], ['濕度 %', 'H']] }], output: 'Number', colour: C_SENSOR },
  { type: 'motor_drive', message0: '馬達（L298N）ENA %1 IN1 %2 IN2 %3 %4 速度 %5', args0: [
    { type: 'field_dropdown', name: 'ENA', options: PWM }, { type: 'field_dropdown', name: 'IN1', options: DIGITAL.slice(2, 14) }, { type: 'field_dropdown', name: 'IN2', options: DIGITAL.slice(2, 14) },
    { type: 'field_dropdown', name: 'DIR', options: [['正轉 ↻', 'F'], ['反轉 ↺', 'B'], ['停止', 'S']] }, { type: 'input_value', name: 'SPEED', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_MOTOR, tooltip: 'IN1/IN2 決定方向，ENA 用 PWM 0~255 控制速度' },
  { type: 'relay_set', message0: '繼電器 腳位 %1 %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL }, { type: 'field_dropdown', name: 'ST', options: [['吸合 ON（COM↔NO）', 'HIGH'], ['放開 OFF（COM↔NC）', 'LOW']] }],
    previousStatement: null, nextStatement: null, colour: C_MOTOR },
  { type: 'seg7_show', message0: '七段顯示器（共陰，a~g 接 D%1 起）顯示 %2', args0: [{ type: 'field_dropdown', name: 'START', options: [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']] }, { type: 'input_value', name: 'N', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_DISPLAY, tooltip: '顯示 0~9；a、b、c、d、e、f、g 依序接連續的腳位' },
  { type: 'lcd_print', message0: 'LCD 第 %1 行 第 %2 格起 顯示 %3', args0: [{ type: 'field_dropdown', name: 'ROW', options: [['1', '0'], ['2', '1']] }, { type: 'input_value', name: 'COL', check: 'Number' }, { type: 'input_value', name: 'VAL' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_DISPLAY, tooltip: 'LCD1602 I2C（SDA→A4、SCL→A5），格數從 0 開始' },
  { type: 'lcd_clear', message0: 'LCD 清除畫面', previousStatement: null, nextStatement: null, colour: C_DISPLAY },
  { type: 'strip_set', message0: '燈條 腳位 %1 第 %2 顆 紅 %3 綠 %4 藍 %5', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL.slice(2, 14) }, { type: 'input_value', name: 'I', check: 'Number' },
    { type: 'input_value', name: 'R', check: 'Number' }, { type: 'input_value', name: 'G', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], inputsInline: true,
    previousStatement: null, nextStatement: null, colour: C_DISPLAY, tooltip: 'WS2812 燈條，第 0 顆開始；設定後要「燈條顯示」才會更新' },
  { type: 'strip_show', message0: '燈條 腳位 %1 %2', args0: [{ type: 'field_dropdown', name: 'PIN', options: DIGITAL.slice(2, 14) }, { type: 'field_dropdown', name: 'OP', options: [['顯示 show', 'show'], ['全部熄滅 clear', 'clear']] }],
    previousStatement: null, nextStatement: null, colour: C_DISPLAY },
]);

// ---------- 產生器 ----------
const pinExpr = p => p;

gen.forBlock.arduino_program = (b) => {
  gen._setup = gen.statementToCode(b, 'SETUP');
  gen._loop = gen.statementToCode(b, 'LOOP');
  return '';
};
gen.forBlock.io_pinmode = b => `pinMode(${pinExpr(b.getFieldValue('PIN'))}, ${b.getFieldValue('MODE')});\n`;
gen.forBlock.io_digitalwrite = b => `digitalWrite(${b.getFieldValue('PIN')}, ${b.getFieldValue('VAL')});\n`;
gen.forBlock.io_digitalwrite_var = b => `digitalWrite(${b.getFieldValue('PIN')}, ${gen.valueToCode(b, 'VAL', Order.NONE) || 'LOW'});\n`;
gen.forBlock.io_highlow = b => [b.getFieldValue('VAL'), Order.ATOMIC];
gen.forBlock.io_digitalread = b => [`digitalRead(${b.getFieldValue('PIN')})`, Order.FUNCTION_CALL];
gen.forBlock.io_analogwrite = b => `analogWrite(${b.getFieldValue('PIN')}, ${gen.valueToCode(b, 'VAL', Order.NONE) || 0});\n`;
gen.forBlock.io_analogread = b => [`analogRead(${b.getFieldValue('PIN')})`, Order.FUNCTION_CALL];
gen.forBlock.time_delay = b => `delay(${gen.valueToCode(b, 'MS', Order.NONE) || 0});\n`;
gen.forBlock.time_millis = () => ['millis()', Order.FUNCTION_CALL];
gen.forBlock.serial_begin = b => `Serial.begin(${b.getFieldValue('BAUD')});\n`;
gen.forBlock.serial_print = b => `Serial.${b.getFieldValue('MODE')}(${gen.valueToCode(b, 'VAL', Order.NONE) || '""'});\n`;
gen.forBlock.math_map = b => {
  const v = k => gen.valueToCode(b, k, Order.NONE) || 0;
  return [`map(${v('X')}, ${v('A')}, ${v('B')}, ${v('C')}, ${v('D')})`, Order.FUNCTION_CALL];
};
gen.forBlock.math_constrain2 = b => {
  const v = k => gen.valueToCode(b, k, Order.NONE) || 0;
  return [`constrain(${v('X')}, ${v('A')}, ${v('B')})`, Order.FUNCTION_CALL];
};
gen.forBlock.math_random2 = b => [`random(${gen.valueToCode(b, 'A', Order.NONE) || 0}, ${gen.valueToCode(b, 'B', Order.NONE) || 10})`, Order.FUNCTION_CALL];
gen.forBlock.tone_play = b => `tone(${b.getFieldValue('PIN')}, ${gen.valueToCode(b, 'F', Order.NONE) || 440});\n`;
gen.forBlock.tone_stop = b => `noTone(${b.getFieldValue('PIN')});\n`;
gen.forBlock.servo_write = b => {
  const p = b.getFieldValue('PIN');
  gen._includes.add('#include <Servo.h>');
  gen._defs[`servo_${p}`] = `Servo servo_${p};`;
  gen._setups[`servo_${p}`] = `servo_${p}.attach(${p});`;
  return `servo_${p}.write(${gen.valueToCode(b, 'A', Order.NONE) || 90});\n`;
};
gen.forBlock.sr04_read = b => {
  const t = b.getFieldValue('TRIG'), e = b.getFieldValue('ECHO');
  gen._defs.readDistanceCM = `float readDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration / 58.0;
}`;
  gen._setups[`sr04_${t}`] = `pinMode(${t}, OUTPUT);\n  pinMode(${e}, INPUT);`;
  return [`readDistanceCM(${t}, ${e})`, Order.FUNCTION_CALL];
};
gen.forBlock.dht_read = b => {
  const p = b.getFieldValue('PIN');
  gen._includes.add('#include <DHT.h>');
  gen._defs[`dht_${p}`] = `DHT dht_${p}(${p}, DHT22);`;
  gen._setups[`dht_${p}`] = `dht_${p}.begin();`;
  return [`dht_${p}.${b.getFieldValue('WHAT') === 'T' ? 'readTemperature' : 'readHumidity'}()`, Order.FUNCTION_CALL];
};

gen.forBlock.motor_drive = b => {
  const ena = b.getFieldValue('ENA'), i1 = b.getFieldValue('IN1'), i2 = b.getFieldValue('IN2'), dir = b.getFieldValue('DIR');
  gen._setups[`motor_${ena}`] = `pinMode(${ena}, OUTPUT);\n  pinMode(${i1}, OUTPUT);\n  pinMode(${i2}, OUTPUT);`;
  const sp = dir === 'S' ? '0' : (gen.valueToCode(b, 'SPEED', Order.NONE) || '255');
  return `digitalWrite(${i1}, ${dir === 'F' ? 'HIGH' : 'LOW'});\ndigitalWrite(${i2}, ${dir === 'B' ? 'HIGH' : 'LOW'});\nanalogWrite(${ena}, ${sp});\n`;
};
gen.forBlock.relay_set = b => {
  const p = b.getFieldValue('PIN');
  gen._setups[`relay_${p}`] = `pinMode(${p}, OUTPUT);`;
  return `digitalWrite(${p}, ${b.getFieldValue('ST')});\n`;
};
gen.forBlock.seg7_show = b => {
  const st = +b.getFieldValue('START');
  gen._defs.seg7Table = `const byte DIGITS[10][7] = {
  {1,1,1,1,1,1,0}, {0,1,1,0,0,0,0}, {1,1,0,1,1,0,1}, {1,1,1,1,0,0,1}, {0,1,1,0,0,1,1},
  {1,0,1,1,0,1,1}, {1,0,1,1,1,1,1}, {1,1,1,0,0,0,0}, {1,1,1,1,1,1,1}, {1,1,1,1,0,1,1}
};`;
  gen._defs.seg7Fn = `void showDigit(int first, int n) {
  for (int s = 0; s < 7; s++) {
    digitalWrite(first + s, DIGITS[n % 10][s]);
  }
}`;
  gen._setups[`seg7_${st}`] = `for (int s = 0; s < 7; s++) pinMode(${st} + s, OUTPUT);`;
  return `showDigit(${st}, ${gen.valueToCode(b, 'N', Order.NONE) || 0});\n`;
};
const lcdSetup = () => {
  gen._includes.add('#include <LiquidCrystal_I2C.h>');
  gen._defs.lcd = 'LiquidCrystal_I2C lcd(0x27, 16, 2);';
  gen._setups.lcd = 'lcd.init();\n  lcd.backlight();';
};
gen.forBlock.lcd_print = b => {
  lcdSetup();
  return `lcd.setCursor(${gen.valueToCode(b, 'COL', Order.NONE) || 0}, ${b.getFieldValue('ROW')});\nlcd.print(${gen.valueToCode(b, 'VAL', Order.NONE) || '""'});\n`;
};
gen.forBlock.lcd_clear = () => { lcdSetup(); return 'lcd.clear();\n'; };
const stripSetup = p => {
  gen._includes.add('#include <Adafruit_NeoPixel.h>');
  gen._defs[`strip_${p}`] = `Adafruit_NeoPixel strip_${p}(8, ${p}, NEO_GRB + NEO_KHZ800);`;
  gen._setups[`strip_${p}`] = `strip_${p}.begin();`;
};
gen.forBlock.strip_set = b => {
  const p = b.getFieldValue('PIN'); stripSetup(p);
  const v = k => gen.valueToCode(b, k, Order.NONE) || 0;
  return `strip_${p}.setPixelColor(${v('I')}, strip_${p}.Color(${v('R')}, ${v('G')}, ${v('B')}));\n`;
};
gen.forBlock.strip_show = b => {
  const p = b.getFieldValue('PIN'); stripSetup(p);
  return `strip_${p}.${b.getFieldValue('OP')}();\n`;
};

// 標準積木的 C 版本覆寫
gen.forBlock.text = b => [JSON.stringify(b.getFieldValue('TEXT')), Order.ATOMIC];
gen.forBlock.math_change = b => {
  const v = gen.getVariableName(b.getFieldValue('VAR'));
  return `${v} += ${gen.valueToCode(b, 'DELTA', Order.ADDITION) || 0};\n`;
};
const origArith = gen.forBlock.math_arithmetic;
gen.forBlock.math_arithmetic = (b, g) => {
  if (b.getFieldValue('OP') === 'POWER') {
    return [`pow(${g.valueToCode(b, 'A', Order.NONE) || 0}, ${g.valueToCode(b, 'B', Order.NONE) || 0})`, Order.FUNCTION_CALL];
  }
  return origArith(b, g);
};

export function generateC(ws) {
  gen.init(ws);
  gen._includes = new Set(); gen._defs = {}; gen._setups = {}; gen._setup = ''; gen._loop = '';
  const top = ws.getTopBlocks(true).find(b => b.type === 'arduino_program');
  if (top) gen.blockToCode(top);
  const vars = ws.getVariableMap().getAllVariables().map(v => gen.getVariableName(v.getId()));
  const lines = [];
  if (gen._includes.size) lines.push(...gen._includes, '');
  const defs = Object.values(gen._defs);
  const varDecl = vars.map(v => `int ${v} = 0;`);
  if (varDecl.length) lines.push(...varDecl, '');
  const objDefs = defs.filter(d => !d.includes('{'));
  const fnDefs = defs.filter(d => d.includes('{'));
  if (objDefs.length) lines.push(...objDefs, '');
  if (fnDefs.length) lines.push(...fnDefs, '');
  const extra = Object.values(gen._setups).map(s => '  ' + s + '\n').join('');
  lines.push(`void setup() {\n${extra}${gen._setup}}`, '', `void loop() {\n${gen._loop}}`);
  return lines.join('\n').replace(/\bvar /g, 'int ') + '\n';
}

export const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: '腳位 I/O', colour: C_IO, contents: [
      { kind: 'block', type: 'io_pinmode' }, { kind: 'block', type: 'io_digitalwrite' },
      { kind: 'block', type: 'io_digitalwrite_var', inputs: { VAL: { shadow: { type: 'io_highlow' } } } },
      { kind: 'block', type: 'io_digitalread' }, { kind: 'block', type: 'io_highlow' },
      { kind: 'block', type: 'io_analogwrite', inputs: { VAL: { shadow: { type: 'math_number', fields: { NUM: 128 } } } } },
      { kind: 'block', type: 'io_analogread' },
    ] },
    { kind: 'category', name: '時間', colour: C_TIME, contents: [
      { kind: 'block', type: 'time_delay', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 1000 } } } } },
      { kind: 'block', type: 'time_millis' },
    ] },
    { kind: 'category', name: '序列埠', colour: C_SERIAL, contents: [
      { kind: 'block', type: 'serial_begin' },
      { kind: 'block', type: 'serial_print', inputs: { VAL: { shadow: { type: 'text', fields: { TEXT: 'Hello' } } } } },
    ] },
    { kind: 'category', name: '感測器', colour: C_SENSOR, contents: [
      { kind: 'block', type: 'sr04_read' }, { kind: 'block', type: 'dht_read' },
    ] },
    { kind: 'category', name: '聲音', colour: C_OUT, contents: [
      { kind: 'block', type: 'tone_play', inputs: { F: { shadow: { type: 'math_number', fields: { NUM: 440 } } } } },
      { kind: 'block', type: 'tone_stop' },
    ] },
    { kind: 'category', name: '動力', colour: C_MOTOR, contents: [
      { kind: 'block', type: 'servo_write', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
      { kind: 'block', type: 'motor_drive', fields: { ENA: '5', IN1: '7', IN2: '8' }, inputs: { SPEED: { shadow: { type: 'math_number', fields: { NUM: 200 } } } } },
      { kind: 'block', type: 'relay_set', fields: { PIN: '4' } },
    ] },
    { kind: 'category', name: '顯示', colour: C_DISPLAY, contents: [
      { kind: 'block', type: 'seg7_show', inputs: { N: { shadow: { type: 'math_number', fields: { NUM: 8 } } } } },
      { kind: 'block', type: 'lcd_print', inputs: { COL: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, VAL: { shadow: { type: 'text', fields: { TEXT: 'Hello' } } } } },
      { kind: 'block', type: 'lcd_clear' },
      { kind: 'block', type: 'strip_set', fields: { PIN: '6' }, inputs: { I: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, R: { shadow: { type: 'math_number', fields: { NUM: 255 } } }, G: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
      { kind: 'block', type: 'strip_show', fields: { PIN: '6' } },
    ] },
    { kind: 'sep' },
    { kind: 'category', name: '邏輯', categorystyle: 'logic_category', contents: [
      { kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
      { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' },
      { kind: 'block', type: 'logic_negate' }, { kind: 'block', type: 'logic_boolean' },
    ] },
    { kind: 'category', name: '迴圈', categorystyle: 'loop_category', contents: [
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
      { kind: 'block', type: 'controls_whileUntil' },
      { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 255 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 5 } } } } },
      { kind: 'block', type: 'controls_flow_statements' },
    ] },
    { kind: 'category', name: '數學', colour: C_MATH, contents: [
      { kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }, { kind: 'block', type: 'math_modulo' },
      { kind: 'block', type: 'math_map', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1023 } } }, C: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, D: { shadow: { type: 'math_number', fields: { NUM: 255 } } } } },
      { kind: 'block', type: 'math_constrain2', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 255 } } } } },
      { kind: 'block', type: 'math_random2', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
      { kind: 'block', type: 'text' },
    ] },
    { kind: 'category', name: '變數', categorystyle: 'variable_category', custom: 'VARIABLE' },
  ],
};

export { Blockly };
