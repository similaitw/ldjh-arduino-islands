import '@wokwi/elements';
import './custom-parts.js';
import { Blockly, TOOLBOX, generateC } from './blocks.js';
import { Circuit } from './circuit.js';
import { Runtime } from './runtime.js';
import { PARTS, CATEGORIES, COMING } from './parts.js';
import { EXAMPLES, EMPTY_BLOCKS, DEFAULT_CODE } from './examples.js';
import { LEVELS, ISLANDS, levelById, nextLevel, getProgress, markDone } from './levels.js';
import { runCheck } from './checker.js';
import { Plotter } from './plotter.js';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';

const $ = s => document.querySelector(s);
const levelId = (location.hash.match(/^#level-(\d+-\d+)$/) || [])[1];
const LEVEL = levelId ? levelById(levelId) : null;
const STORE = LEVEL ? 'ardu-level-' + LEVEL.id : 'ardu-lab-v1';
window.addEventListener('hashchange', () => location.reload());
let mode = 'blocks';
let suppressSave = false;

// ---------- 電路 ----------
const circuit = new Circuit({
  stage: $('#stage'), wireSvg: $('#wires'), pinLayer: $('#pins'),
  onChange: () => scheduleSave(),
  onSelect: sel => renderInspector(sel),
});

// ---------- 序列埠 ----------
let serialBuf = '';
const serialEl = $('#serial');
const plotter = new Plotter($('#plot'));
const setPlot = on => { $('#plot').hidden = !on; document.body.classList.toggle('plot-on', on); $('#plotBtn').classList.toggle('on', on); plotter.dirty = true; };
$('#plotBtn').addEventListener('click', () => setPlot($('#plot').hidden));
const runtime = new Runtime({
  circuit,
  onSerial: t => { serialBuf += t; plotter.feed(t); },
  onError: msg => { serialBuf += `\n⛔ ${msg}\n`; addWarning(msg, true); },
  onWarn: msg => addWarning(msg),
  onState: running => {
    document.body.classList.toggle('running', running);
    $('#runBtn').textContent = running ? '⟲ 重新執行' : '▶ 執行';
    $('#status').textContent = running ? '● 模擬執行中' : '○ 已停止';
  },
});

function flushSerial() {
  if (!serialBuf) return;
  const atBottom = serialEl.scrollTop + serialEl.clientHeight >= serialEl.scrollHeight - 8;
  serialEl.textContent += serialBuf; serialBuf = '';
  if (serialEl.textContent.length > 20000) serialEl.textContent = serialEl.textContent.slice(-15000);
  if (atBottom || $('#autoscroll').checked) serialEl.scrollTop = serialEl.scrollHeight;
}

// ---------- 提示 ----------
const runtimeWarnings = [];
function addWarning(msg, error = false) {
  if (runtimeWarnings.some(w => w.msg === msg)) return;
  runtimeWarnings.push({ msg, error });
  if (runtimeWarnings.length > 6) runtimeWarnings.shift();
}
let lastWarnKey = null;
function renderWarnings(circuitWarnings) {
  const all = [...runtimeWarnings, ...circuitWarnings.map(msg => ({ msg, error: false }))];
  const key = all.map(w => w.msg).join('|');
  if (key === lastWarnKey) return; lastWarnKey = key;
  const box = $('#warnings');
  box.innerHTML = '';
  box.classList.toggle('empty', !all.length);
  if (!all.length) { box.textContent = '✅ 目前沒有接線或程式問題'; return; }
  for (const w of all) {
    const d = document.createElement('div');
    d.className = w.error ? 'warn error' : 'warn';
    d.textContent = (w.error ? '⛔ ' : '⚠️ ') + w.msg;
    box.appendChild(d);
  }
}

// ---------- 主迴圈 ----------
function frame() {
  const w = circuit.updateVisuals();
  if (runtime.running) runtime.updateSound();
  renderWarnings(w);
  flushSerial();
  if (!$('#plot').hidden) plotter.draw();
  requestAnimationFrame(frame);
}

// ---------- Blockly ----------
const ws = Blockly.inject('#blocklyDiv', {
  toolbox: TOOLBOX, media: './media/', sounds: false, trashcan: true,
  zoom: { controls: true, wheel: true, startScale: 0.85 },
  grid: { spacing: 24, length: 3, colour: '#e3e8ef', snap: true },
  renderer: 'zelos', move: { scrollbars: true, drag: true, wheel: false },
});
const preview = new EditorView({
  parent: $('#preview'),
  state: EditorState.create({ doc: '', extensions: [basicSetup, cpp(), EditorState.readOnly.of(true), EditorView.editable.of(false)] }),
});
function updatePreview() {
  const code = generateC(ws);
  preview.dispatch({ changes: { from: 0, to: preview.state.doc.length, insert: code } });
}
ws.addChangeListener(e => {
  if (e.isUiEvent) return;
  updatePreview(); scheduleSave();
});

// ---------- 程式碼編輯器 ----------
const editor = new EditorView({
  parent: $('#editor'),
  state: EditorState.create({ doc: DEFAULT_CODE, extensions: [basicSetup, cpp(), EditorView.updateListener.of(u => { if (u.docChanged) scheduleSave(); })] }),
});
const getEditorCode = () => editor.state.doc.toString();
const setEditorCode = code => editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });

// ---------- 模式切換 ----------
function setMode(m) {
  mode = m;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
  $('#blocksPane').hidden = m !== 'blocks';
  $('#codePane').hidden = m !== 'code';
  if (m === 'blocks') setTimeout(() => Blockly.svgResize(ws), 0);
  scheduleSave();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));
$('#toCode').addEventListener('click', () => {
  showConfirm('把積木產生的程式碼複製到「程式碼」模式？（會覆蓋目前程式碼）', () => {
    setEditorCode(generateC(ws)); setMode('code');
  });
});

const currentCode = () => mode === 'blocks' ? generateC(ws) : getEditorCode();

// ---------- 執行控制 ----------
$('#runBtn').addEventListener('click', () => {
  runtimeWarnings.length = 0; lastWarnKey = null;
  serialEl.textContent = ''; serialBuf = ''; plotter.clear();
  runtime.run(currentCode());
});
$('#stopBtn').addEventListener('click', () => runtime.stop());
$('#muteBtn').addEventListener('click', () => {
  runtime.muted = !runtime.muted; $('#muteBtn').textContent = runtime.muted ? '🔇' : '🔊'; runtime.updateSound();
});
$('#serialSend').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#serialInput').value; runtime.rx += v + '\n'; $('#serialInput').value = '';
  serialBuf += `» ${v}\n`;
});
$('#serialClear').addEventListener('click', () => { serialEl.textContent = ''; plotter.clear(); });

// ---------- 零件庫 ----------
function buildLibrary() {
  const lib = $('#library');
  for (const cat of CATEGORIES) {
    const sec = document.createElement('details'); sec.open = cat.id !== 'display' && cat.id !== 'passive';
    sec.innerHTML = `<summary>${cat.name}</summary>`;
    const list = document.createElement('div'); list.className = 'parts';
    for (const [type, def] of Object.entries(PARTS)) {
      if (def.cat !== cat.id) continue;
      const b = document.createElement('button'); b.className = 'part'; b.textContent = def.name; b.title = def.desc || '';
      b.addEventListener('click', () => {
        const sc = $('#canvas');
        const c = circuit.addComp(type, sc.scrollLeft + 380 + Math.random() * 120, sc.scrollTop + 40 + Math.random() * 80);
        circuit.select({ kind: 'comp', id: c.id });
      });
      list.appendChild(b);
    }
    for (const name of COMING[cat.id] || []) {
      const b = document.createElement('button'); b.className = 'part soon'; b.disabled = true;
      b.innerHTML = `${name}<small>即將推出</small>`; list.appendChild(b);
    }
    sec.appendChild(list); lib.appendChild(sec);
  }
}

// ---------- 屬性面板 ----------
function renderInspector(sel) {
  const box = $('#inspector');
  box.innerHTML = '';
  if (!sel) { box.innerHTML = '<div class="muted">點選零件標籤或電線即可查看屬性。<br>接線：點一個腳位，再點另一個腳位。</div>'; return; }
  if (sel.kind === 'wire') {
    const w = circuit.wires.find(w => w.id === sel.id); if (!w) return;
    box.innerHTML = `<h4>電線</h4><div class="muted">${w.a} ↔ ${w.b}</div>`;
    const colors = document.createElement('div'); colors.className = 'colors';
    for (const col of WIRE_COLORS) {
      const s = document.createElement('button'); s.className = 'swatch'; s.style.background = col;
      s.addEventListener('click', () => { w.color = col; circuit.renderWires(); scheduleSave(); });
      colors.appendChild(s);
    }
    box.appendChild(colors);
    box.appendChild(delBtn());
    return;
  }
  const c = circuit.comps.get(sel.id); if (!c) return;
  const def = PARTS[c.type];
  box.innerHTML = `<h4>${c.id} · ${def.name}</h4>${def.desc ? `<div class="muted">${def.desc}</div>` : ''}`;
  const slider = (label, key, min, max, step, toVal = v => v, fromVal = v => v, unit = '') => {
    const row = document.createElement('label'); row.className = 'prop';
    const out = document.createElement('b');
    const inp = document.createElement('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step;
    inp.value = fromVal(c.props[key]);
    const show = () => { out.textContent = `${fmtNum(c.props[key])}${unit}`; };
    inp.addEventListener('input', () => { c.props[key] = toVal(+inp.value); if (c.type === 'pot') c.el.value = c.props.value; show(); scheduleSave(); });
    row.append(label, ' ', out, inp); show(); box.appendChild(row);
  };
  const select = (label, key, opts, apply) => {
    const row = document.createElement('label'); row.className = 'prop';
    const s = document.createElement('select');
    for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }
    s.value = c.props[key];
    s.addEventListener('change', () => { c.props[key] = isNaN(+s.value) ? s.value : +s.value; apply?.(c.props[key]); circuit.invalidate(); scheduleSave(); });
    row.append(label, ' ', s); box.appendChild(row);
  };
  switch (c.type) {
    case 'led': select('顏色', 'color', [['red', '紅'], ['green', '綠'], ['blue', '藍'], ['yellow', '黃'], ['white', '白'], ['orange', '橘']], v => { c.el.color = v; }); break;
    case 'button': select('顏色', 'color', [['green', '綠'], ['red', '紅'], ['blue', '藍'], ['yellow', '黃'], ['black', '黑']], v => { c.el.color = v; });
      box.insertAdjacentHTML('beforeend', '<div class="muted">直接用滑鼠按住畫布上的按鈕即可。</div>'); break;
    case 'resistor': select('阻值', 'value', [[220, '220 Ω'], [330, '330 Ω'], [1000, '1 kΩ'], [10000, '10 kΩ']], v => { c.el.value = String(v); }); break;
    case 'pot': slider('數值', 'value', 0, 1023, 1); break;
    case 'ldr':
      slider('環境亮度', 'lux', 0, 600, 1, v => +Math.pow(10, v / 100 - 1).toPrecision(3), v => Math.round((Math.log10(Math.max(v, 0.1)) + 1) * 100), ' lux');
      slider('DO 門檻', 'threshold', 0, 1023, 1);
      box.insertAdjacentHTML('beforeend', '<div class="muted">參考：夜晚 1 lux、室內 300 lux、陰天 1,000 lux、晴天 10,000+ lux</div>');
      break;
    case 'soil': slider('土壤濕度', 'moisture', 0, 100, 1, v => v, v => v, ' %'); break;
    case 'dht': slider('溫度', 'temp', -40, 80, 0.1, v => v, v => v, ' °C'); slider('濕度', 'hum', 0, 100, 0.5, v => v, v => v, ' %'); break;
    case 'sr04': {
      slider('障礙物距離', 'distance', 2, 450, 1, v => v, v => v, ' cm');
      const b = document.createElement('button'); b.className = 'btn';
      const show = () => { b.textContent = c.props.glitch ? '⚡ 雜訊模式：開（約 1/4 讀值錯誤）' : '雜訊模式：關（點擊開啟）'; };
      b.addEventListener('click', () => { c.props.glitch = !c.props.glitch; show(); scheduleSave(); });
      show(); box.appendChild(b); break;
    }
    case 'pir': {
      const b = document.createElement('button'); b.className = 'btn';
      const show = () => { b.textContent = c.props.motion ? '🚶 有人（點擊改為無人）' : '⬜ 無人（點擊模擬有人經過）'; };
      b.addEventListener('click', () => { c.props.motion = !c.props.motion; show(); });
      show(); box.appendChild(b); break;
    }
  }
  if (c.type !== 'uno') box.appendChild(delBtn());
}
function delBtn() {
  const b = document.createElement('button'); b.className = 'btn danger'; b.textContent = '🗑 刪除（Delete 鍵）';
  b.addEventListener('click', () => circuit.deleteSelected()); return b;
}
const fmtNum = v => typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : v;

// ---------- 電線顏色 ----------
const WIRE_COLORS = ['#2e7d32', '#1565c0', '#e67e22', '#f1c40f', '#8e44ad', '#d32f2f', '#222'];
function buildWireColors() {
  const box = $('#wireColors');
  for (const col of WIRE_COLORS) {
    const s = document.createElement('button'); s.className = 'swatch'; s.style.background = col; s.title = '新電線的顏色';
    s.addEventListener('click', () => { circuit.wireColor = col; box.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === s)); });
    if (col === circuit.wireColor) s.classList.add('on');
    box.appendChild(s);
  }
}

// ---------- 範例 ----------
function buildExamples() {
  const sel = $('#examples');
  for (const ex of EXAMPLES) { const o = document.createElement('option'); o.value = ex.id; o.textContent = ex.name; sel.appendChild(o); }
  sel.addEventListener('change', () => {
    const ex = EXAMPLES.find(e => e.id === sel.value); sel.value = '';
    if (!ex) return;
    showConfirm(`載入範例「${ex.name}」？目前的電路與程式會被取代。`, () => loadExample(ex));
  });
}
function loadExample(ex) {
  runtime.stop();
  suppressSave = true;
  circuit.load(ex.circuit);
  if (ex.blocks) { ws.clear(); Blockly.serialization.workspaces.load(ex.blocks, ws); }
  setEditorCode(ex.code || (ex.blocks ? generateC(ws) : DEFAULT_CODE));
  setMode(ex.mode);
  updatePreview();
  suppressSave = false; scheduleSave();
  runtimeWarnings.length = 0; lastWarnKey = null;
  serialEl.textContent = ex.tip ? `💡 ${ex.tip}\n按「▶ 執行」開始模擬。\n` : '按「▶ 執行」開始模擬。\n';
}

// ---------- 儲存 / 匯入匯出 ----------
let saveTimer = null;
function snapshot() {
  return { v: 1, mode, circuit: circuit.serialize(), blocks: Blockly.serialization.workspaces.save(ws), code: getEditorCode() };
}
function scheduleSave() {
  if (suppressSave) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(snapshot())); } catch (e) { /* 無法儲存 */ } }, 400);
}
function restore(data) {
  suppressSave = true;
  circuit.load(data.circuit);
  ws.clear();
  try { Blockly.serialization.workspaces.load(data.blocks, ws); } catch (e) { Blockly.serialization.workspaces.load(EMPTY_BLOCKS, ws); }
  if (!ws.getTopBlocks().some(b => b.type === 'arduino_program')) Blockly.serialization.workspaces.load(EMPTY_BLOCKS, ws);
  setEditorCode(data.code || DEFAULT_CODE);
  setMode(data.mode || 'blocks'); updatePreview();
  suppressSave = false;
}

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch (e) { showText('請手動複製下方內容', text); }
}
$('#inoBtn').addEventListener('click', () => {
  const code = currentCode();
  try { download('sketch.ino', code); } catch (e) { /* 部分環境不允許下載 */ }
  copyText(code, '已下載 sketch.ino，並複製程式碼到剪貼簿，可直接貼到 Arduino IDE');
});
$('#exportBtn').addEventListener('click', () => {
  const json = JSON.stringify(snapshot(), null, 1);
  try { download('arduino-project.json', json, 'application/json'); } catch (e) { /* ignore */ }
  copyText(json, '已匯出專案檔（同時複製到剪貼簿）');
});
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const txt = await f.text();
    if (f.name.endsWith('.ino')) { setEditorCode(txt); setMode('code'); toast('已載入 .ino 到程式碼模式'); }
    else { runtime.stop(); restore(JSON.parse(txt)); toast('已匯入專案'); }
  } catch (err) { toast('檔案格式錯誤'); }
  e.target.value = '';
});
$('#clearBtn').addEventListener('click', () => showConfirm('清空電路（保留 Arduino）與程式？', () => {
  runtime.stop();
  circuit.load({ parts: [{ id: 'uno', type: 'uno', x: 60, y: 240 }], wires: [] });
  ws.clear(); Blockly.serialization.workspaces.load(EMPTY_BLOCKS, ws);
  setEditorCode(DEFAULT_CODE); updatePreview();
}));

// ---------- 對話框 / 提示 ----------
function showConfirm(msg, onOk) {
  const d = $('#dialog'); $('#dialogMsg').textContent = msg; $('#dialogText').hidden = true; $('#dialogCancel').hidden = false;
  d.hidden = false;
  $('#dialogOk').onclick = () => { d.hidden = true; onOk(); };
  $('#dialogCancel').onclick = () => { d.hidden = true; };
}
function showText(msg, text) {
  const d = $('#dialog'); $('#dialogMsg').textContent = msg;
  const ta = $('#dialogText'); ta.hidden = false; ta.value = text; $('#dialogCancel').hidden = true;
  d.hidden = false; ta.select();
  $('#dialogOk').onclick = () => { d.hidden = true; };
}
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

// ---------- 鍵盤 ----------
window.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.closest('.cm-editor, .blocklySvg, #blocklyDiv')) return;
  if (e.key === 'Delete' || e.key === 'Backspace') { circuit.deleteSelected(); e.preventDefault(); }
  if (e.key === 'Escape') { circuit.pending = null; circuit.renderWires(); }
});
$('#delSel').addEventListener('click', () => circuit.deleteSelected());

// ---------- 啟動 ----------
buildLibrary(); buildWireColors(); buildExamples(); renderInspector(null);
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
customElements.whenDefined('wokwi-arduino-uno').then(() => {
  if (LEVEL) {
    initLesson();
    if (saved?.circuit) { try { restore(saved); } catch (e) { loadLevelStarter(); } }
    else loadLevelStarter();
  } else if (saved?.circuit) { try { restore(saved); } catch (e) { loadExample(EXAMPLES[0]); } }
  else loadExample(EXAMPLES[0]);
  requestAnimationFrame(frame);
});

// ---------- 關卡模式 ----------
function loadLevelStarter(useSolution = false) {
  runtime.stop();
  suppressSave = true;
  const st = LEVEL.starter, sol = LEVEL.solution;
  circuit.load(useSolution && sol.circuit ? sol.circuit : st.circuit);
  ws.clear();
  Blockly.serialization.workspaces.load(st.blocks || EMPTY_BLOCKS, ws);
  if (useSolution) { setEditorCode(sol.code); setMode('code'); }
  else { setEditorCode(st.code || DEFAULT_CODE); setMode(st.mode); }
  updatePreview();
  suppressSave = false; scheduleSave();
  runtimeWarnings.length = 0; lastWarnKey = null;
  serialEl.textContent = '';
}

function initLesson() {
  document.body.classList.add('lesson-mode');
  const island = ISLANDS.find(i => i.id === LEVEL.island);
  const siblings = LEVELS.filter(l => l.island === LEVEL.island);
  const next = nextLevel(LEVEL.id);
  document.title = `${LEVEL.id} ${LEVEL.title} · Arduino 機械星系`;
  const box = $('#lesson');
  box.hidden = false;
  box.innerHTML = `
    <div class="lhead">
      <span class="lisland" style="background:${island.color}">${island.icon} ${island.name}</span>
      <b class="ltitle">${LEVEL.id}　${LEVEL.title}</b>
      <span class="ldots">${siblings.map(l => `<a href="#level-${l.id}" class="${l.id === LEVEL.id ? 'cur' : ''} ${getProgress()[l.id] ? 'done' : ''}" title="${l.id} ${l.title}">${getProgress()[l.id] ? '✓' : l.id.split('-')[1]}</a>`).join('')}</span>
      <button id="lToggle" class="tbtn" title="收合">▾</button>
    </div>
    <div class="lbody">
      <ol class="lgoal">${LEVEL.goal.map(g => `<li>${g}</li>`).join('')}</ol>
      <div class="lbtns">
        <button id="lCheck" class="lcheck">✅ 檢查任務</button>
        <button id="lHint" class="tbtn">💡 提示 <span id="lHintN"></span></button>
        <button id="lSol" class="tbtn">📖 參考解答</button>
        <button id="lReset" class="tbtn">↺ 重設關卡</button>
        ${next ? `<a id="lNext" class="tbtn" href="#level-${next.id}">下一關 ${next.id} →</a>` : '<a class="tbtn" href="index.html">🪐 回星系地圖</a>'}
      </div>
      <div id="lHints" class="lhints"></div>
      <div id="lResult" class="lresult" hidden></div>
    </div>`;
  $('#lToggle').addEventListener('click', () => { box.classList.toggle('collapsed'); $('#lToggle').textContent = box.classList.contains('collapsed') ? '▸' : '▾'; });
  let hintN = 0;
  const updHint = () => { $('#lHintN').textContent = `${hintN}/${LEVEL.hints.length}`; };
  updHint();
  $('#lHint').addEventListener('click', () => {
    if (hintN >= LEVEL.hints.length) return;
    const d = document.createElement('div'); d.textContent = `💡 ${LEVEL.hints[hintN++]}`; $('#lHints').appendChild(d); updHint();
  });
  $('#lReset').addEventListener('click', () => showConfirm('恢復這一關的起始電路與程式？你目前的作品會被清除。', () => loadLevelStarter()));
  $('#lSol').addEventListener('click', () => showConfirm('載入參考解答？（建議先自己試試看，或先看提示）你目前的作品會被取代。', () => loadLevelStarter(true)));
  $('#lCheck').addEventListener('click', doCheck);
}

let checking = false;
async function doCheck() {
  if (checking) return;
  checking = true;
  const btn = $('#lCheck'), res = $('#lResult');
  btn.disabled = true; btn.textContent = '⏳ 檢查中…'; $('#runBtn').disabled = true;
  res.hidden = false; res.className = 'lresult'; res.innerHTML = '';
  runtimeWarnings.length = 0; lastWarnKey = null; serialEl.textContent = ''; serialBuf = ''; plotter.clear();
  const addStep = st => { const d = document.createElement('div'); d.className = st.ok ? 'ok' : 'bad'; d.textContent = (st.ok ? '✔ ' : '✘ ') + st.msg; res.appendChild(d); res.scrollTop = res.scrollHeight; };
  const r = await runCheck(LEVEL, { circuit, runtime, code: currentCode(), onStep: addStep });
  if (r.ok) {
    markDone(LEVEL.id);
    res.classList.add('pass');
    const next = nextLevel(LEVEL.id);
    res.insertAdjacentHTML('beforeend', `<div class="cheer">🎉 任務完成！${next ? `<a href="#level-${next.id}">前往下一關 ${next.id}「${next.title}」→</a>` : '<a href="index.html">回到星系地圖 →</a>'}</div>`);
    document.querySelectorAll('.ldots a.cur').forEach(a => { a.classList.add('done'); a.textContent = '✓'; });
  } else {
    res.classList.add('fail');
    res.insertAdjacentHTML('beforeend', '<div class="cheer">還差一點！修改後再按一次「檢查任務」。需要的話可以看提示。</div>');
  }
  res.scrollTop = res.scrollHeight;
  btn.disabled = false; btn.textContent = '✅ 檢查任務'; $('#runBtn').disabled = false;
  checking = false;
}
window.addEventListener('resize', () => Blockly.svgResize(ws));
window.__ardu = { ws, generateC, Blockly };  // 供除錯與自動測試使用
