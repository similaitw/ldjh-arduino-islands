// Arduino C 子集 → 非同步 JavaScript 轉譯器
// 目標：涵蓋教學常用語法；不支援指標、struct/class 自訂、template。

const TYPE_LIST = [
  'unsigned long long', 'unsigned long', 'unsigned int', 'unsigned char', 'unsigned short',
  'long long', 'long', 'int', 'float', 'double', 'bool', 'boolean', 'byte', 'char', 'String',
  'short', 'word', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'size_t',
];
const TYPES_RE = TYPE_LIST.map(t => t.replace(/ /g, '\\s+')).join('|');
const NON_INT = new Set(['float', 'double', 'bool', 'boolean', 'String', 'char']);
const LIB_CLASSES = ['Servo', 'DHT'];
const ASYNC_BUILTINS = ['delay', 'delayMicroseconds', 'pulseIn'];

export class TranspileError extends Error {
  constructor(msg, line) { super(msg); this.line = line; }
}

// 移除註解（保留換行與字串內容）
function stripComments(src) {
  let out = '', i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, j + 1); i = j + 1;
    } else if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') i++;
    } else if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++; }
      i += 2;
    } else { out += c; i++; }
  }
  return out;
}

// 把字串常數換成佔位符，避免後續正規式誤改
function protectStrings(src) {
  const strs = [];
  const out = src.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, m => {
    strs.push(m); return `\u0002${strs.length - 1}\u0003`;
  });
  return { out, strs };
}
function restoreStrings(src, strs) {
  return src.replace(/\u0002(\d+)\u0003/g, (_, k) => strs[+k]);
}

function splitTopLevel(s, sep = ',') {
  const parts = []; let depth = 0, cur = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (ch === sep && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function matchParen(s, openIdx) {
  const open = s[openIdx], close = { '(': ')', '[': ']', '{': '}' }[open];
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function prevNonWs(s, idx) {
  let i = idx - 1;
  while (i >= 0 && /\s/.test(s[i])) i--;
  return i >= 0 ? s[i] : '';
}

export function transpile(source) {
  const info = { functions: [], intVars: new Set(), usesServo: false, usesDHT: false, warnings: [] };
  let s = stripComments(source.replace(/\r\n?/g, '\n'));
  const prot = protectStrings(s); s = prot.out;

  // 不支援語法偵測
  if (/->|\bstruct\b|\bclass\b|\btemplate\b|\bnew\s+\w|\bmalloc\b/.test(s)) {
    info.warnings.push('偵測到 struct / class / 指標等進階語法，模擬器尚未支援，可能無法執行。');
  }

  // 前置處理器
  s = s.replace(/^[ \t]*#\s*include[^\n]*/gm, '');
  s = s.replace(/^[ \t]*#\s*define[ \t]+(\w+)[ \t]+([^\n]+)/gm, (_, name, val) => `const ${name} = ${val.trim().replace(/;$/, '')};`);
  s = s.replace(/^[ \t]*#[^\n]*/gm, '');

  // 數字字尾、B 二進位
  s = s.replace(/\b(0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)(?:[uU]?[lL]{1,2}|[uU]|[fF])\b/g, '$1');
  s = s.replace(/\bB([01]{1,8})\b/g, '0b$1');
  s = s.replace(/\b(static|volatile|inline|register|PROGMEM|unsigned(?=\s*[;=,)]))\s*/g, '');

  // 函式原型宣告 → 移除
  s = s.replace(new RegExp(`(^|[;}\\n])([ \\t]*)(?:const\\s+)?(?:${TYPES_RE}|void)\\s*\\*?\\s+\\w+\\s*\\([^)]*\\)\\s*;`, 'g'), '$1$2');

  // 函式定義
  s = s.replace(new RegExp(`(^|[;}\\n])([ \\t]*)(?:const\\s+)?(?:${TYPES_RE}|void)\\s*\\*?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'),
    (full, pre, ws, name, params) => {
      const rt = full.slice(pre.length + ws.length).replace(/^const\s+/, '').match(/^[\w\s]+?(?=\s*\*?\s+\w+\s*\()/);
      if (rt && !NON_INT.has(rt[0].trim().split(/\s+/).pop()) && rt[0].trim() !== 'void') info.intFns = [...(info.intFns || []), name];
      const ps = params.trim() === '' || params.trim() === 'void' ? [] :
        splitTopLevel(params).map(p => {
          const [decl, def] = p.split('=');
          const m = decl.trim().match(/(\w+)\s*(\[\s*\w*\s*\])*\s*$/);
          if (!m) throw new TranspileError(`無法解析函式 ${name} 的參數：${p.trim()}`);
          return def !== undefined ? `${m[1]} = ${def.trim()}` : m[1];
        });
      info.functions.push(name);
      return `${pre}${ws}async function ${name}(${ps.join(', ')}) {`;
    });

  // int 回傳值取整數
  for (const fn of info.intFns || []) {
    const at = s.indexOf(`async function ${fn}(`);
    const open = s.indexOf('{', at), close = matchParen(s, open);
    if (at < 0 || close < 0) continue;
    const body = s.slice(open, close).replace(/\breturn\s+([^;]+);/g, 'return __i($1);');
    s = s.slice(0, open) + body + s.slice(close);
  }

  // 函式庫物件宣告：Servo s;  DHT dht(2, DHT22);
  s = s.replace(new RegExp(`\\b(${LIB_CLASSES.join('|')})\\s+(\\w+)\\s*(?:\\(([^)]*)\\))?\\s*;`, 'g'), (_, cls, name, args) => {
    if (cls === 'Servo') info.usesServo = true;
    if (cls === 'DHT') info.usesDHT = true;
    return `let ${name} = new ${cls}(${args || ''});`;
  });

  // 型別轉換 (int)x → __i(x)；(float)x → (x)
  s = convertCasts(s);

  // 變數宣告
  s = convertDeclarations(s, info);

  // int 變數的指定 → 取整數（模擬整數除法）
  if (info.intVars.size) s = wrapIntAssignments(s, info.intVars);
  s = s.replace(/\u0001/g, '');

  // String 方法差異
  s = s.replace(/\.length\(\s*\)/g, '.length');

  // 非同步呼叫：delay、使用者函式
  const asyncNames = [...ASYNC_BUILTINS, ...info.functions];
  if (asyncNames.length) {
    s = s.replace(new RegExp(`(?<![\\w.])(?<!function\\s)(${asyncNames.join('|')})\\s*\\(`, 'g'), 'await $1(');
  }

  // 迴圈插入讓步點，避免無窮迴圈卡住瀏覽器
  s = insertLoopTicks(s);

  s = restoreStrings(s, prot.strs);
  return { js: s, info };
}

// 找出從 i 開始的運算式結尾（頂層的 ; , 或不成對的 ) ]）
function exprEnd(s, i) {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth === 0) return i; depth--; }
    else if ((c === ';' || c === ',') && depth === 0) return i;
  }
  return i;
}

function wrapIntAssignments(s, intVars) {
  const re = new RegExp(`(?<![\\w.\\u0001\\]])(${[...intVars].join('|')})\\s*(\\/=|=(?!=))`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    const p = s[m.index - 1];
    if (p && '=!<>'.includes(p)) continue;
    const start = re.lastIndex, end = exprEnd(s, start);
    const expr = s.slice(start, end).trim();
    out += s.slice(last, m.index);
    if (/^__i\(/.test(expr)) out += `${m[1]} = ${expr}`;
    else if (m[2] === '/=') out += `${m[1]} = __i(${m[1]} / (${expr}))`;
    else out += `${m[1]} = __i(${expr})`;
    last = end; re.lastIndex = end;
  }
  return out + s.slice(last);
}

function convertCasts(s) {
  const re = /\(\s*(?:unsigned\s+)?(int|long|byte|short|word|uint8_t|uint16_t|uint32_t|int16_t|int32_t|float|double)\s*\)\s*/g;
  let m, out = '', last = 0;
  while ((m = re.exec(s))) {
    out += s.slice(last, m.index);
    let i = re.lastIndex, end = i;
    if (s[i] === '(') end = matchParen(s, i) + 1;
    else {
      const id = s.slice(i).match(/^[-+]?[\w.]+/);
      end = i + (id ? id[0].length : 0);
      while (s[end] === '(' || s[end] === '[') end = matchParen(s, end) + 1;
    }
    const operand = s.slice(i, end);
    const isInt = !['float', 'double'].includes(m[1]);
    out += isInt ? `__i(${operand})` : `(${operand})`;
    last = end; re.lastIndex = end;
  }
  return out + s.slice(last);
}

function convertDeclarations(s, info) {
  const re = new RegExp(`\\b(const\\s+)?(${TYPES_RE})\\s+(?=[A-Za-z_])`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    const p = prevNonWs(s, m.index);
    const before = s.slice(Math.max(0, m.index - 6), m.index);
    if (!(p === '' || ';{}():'.includes(p) || /else\s*$/.test(before))) continue;
    // 找宣告結尾（頂層的 ; ）
    let depth = 0, j = re.lastIndex;
    for (; j < s.length; j++) {
      const ch = s[j];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) { if (depth === 0) break; depth--; }
      else if (ch === ';' && depth === 0) break;
    }
    const body = s.slice(re.lastIndex, j);
    const type = m[2].replace(/\s+/g, ' ');
    const baseType = type.split(' ').pop();
    const isInt = !NON_INT.has(baseType);
    const decls = splitTopLevel(body).map(d => convertDeclarator(d, type, isInt, info));
    out += s.slice(last, m.index) + (m[1] ? 'const ' : 'let ') + decls.join(', ');
    last = j; re.lastIndex = j;
  }
  return out + s.slice(last);
}

function convertDeclarator(d, type, isInt, info) {
  const eq = (() => { let depth = 0; for (let i = 0; i < d.length; i++) { const c = d[i]; if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--; else if (c === '=' && depth === 0 && d[i + 1] !== '=') return i; } return -1; })();
  const lhs = (eq >= 0 ? d.slice(0, eq) : d).trim();
  const rhs = eq >= 0 ? d.slice(eq + 1).trim() : null;
  const m = lhs.match(/^(\w+)\s*((?:\[\s*[^\]]*\s*\])*)$/);
  if (!m) throw new TranspileError(`無法解析宣告：${type} ${d.trim()}`);
  const name = m[1];
  const dims = [...m[2].matchAll(/\[\s*([^\]]*)\s*\]/g)].map(x => x[1].trim());
  if (dims.length) {
    if (rhs) {
      if (rhs.startsWith('{')) return `${name} = ${rhs.replace(/\{/g, '[').replace(/\}/g, ']')}`;
      return `${name} = ${rhs}`; // char 陣列字串
    }
    const fill = isInt || type !== 'String' ? '0' : '""';
    if (dims.length === 1) return `${name} = new Array(${dims[0] || 0}).fill(${fill})`;
    return `${name} = Array.from({length: ${dims[0]}}, () => new Array(${dims[1]}).fill(${fill}))`;
  }
  if (isInt) info.intVars.add(name);
  if (rhs === null) {
    const def = type === 'String' ? '""' : (type === 'bool' || type === 'boolean') ? 'false' : '0';
    return `${name}\u0001 = ${def}`;
  }
  return isInt ? `${name}\u0001 = __i(${rhs})` : `${name}\u0001 = ${rhs}`;
}

function insertLoopTicks(s) {
  s = s.replace(/\bdo\s*\{/g, 'do { await __tick();');
  const re = /\b(while|for)\s*\(/g;
  let m, out = '', last = 0;
  while ((m = re.exec(s))) {
    const open = re.lastIndex - 1;
    const close = matchParen(s, open);
    if (close < 0) continue;
    let k = close + 1;
    while (k < s.length && /\s/.test(s[k])) k++;
    out += s.slice(last, close + 1);
    if (s[k] === '{') {
      out += s.slice(close + 1, k + 1) + ' await __tick();';
      last = k + 1;
    } else if (s[k] === ';') {
      // do-while 的結尾 或 空迴圈 while(cond);
      if (m[1] === 'while' && prevNonWs(s, m.index) === '}') { last = close + 1; }
      else { out += ' { await __tick(); }'; last = k + 1; }
    } else {
      const semi = s.indexOf(';', k);
      out += ' { await __tick(); ' + s.slice(k, semi + 1) + ' }';
      last = semi + 1;
    }
    re.lastIndex = last;
  }
  return out + s.slice(last);
}
