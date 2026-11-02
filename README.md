# ⚙️ Arduino 機械星系 · 線上實驗室

給自學進階學生的 Arduino 線上模擬實驗室，屬於「Simi 的教學群島」系列。
不用買硬體、不用安裝軟體，打開瀏覽器就能接線、寫程式、看結果。

## 網站結構

- `index.html`：3D 機械星系入口（Three.js）：中央「核心工坊」恆星與 7 顆主題星球，點選星球進入關卡；手機預設清單模式
- `lab.html`：線上實驗室（自由模式）
- `lab.html#level-1-2`：關卡模式，含任務說明、自動檢查、提示與參考解答

## 關卡（內圈 3 顆星球已開放）

| 星球 | 關卡 |
|---|---|
| ⚓ 啟航星 | 1-1 點亮第一顆 LED（自己接線）、1-2 Blink 節拍器、1-3 SOS 求救信號 |
| 💡 光之星 | 2-1 呼吸燈、2-2 十字路口紅綠燈、2-3 RGB 調色盤 |
| 🔘 開關星 | 3-1 按住才亮、3-2 按一下切換（去彈跳）、3-3 序列埠遙控器 |

自動檢查會實際執行學生的程式，同時操作零件（按按鈕、模擬按鈕彈跳、輸入序列埠文字），並量測 LED 時序、PWM 數值與序列埠輸出。

## 功能

- **電路畫布**：Arduino Uno + 拖曳零件，點腳位 → 點腳位即可接線
- **兩種寫程式方式**
  - 🧩 積木（Blockly）：即時產生對應的 Arduino C 程式碼，對照學語法
  - ⌨️ 程式碼：Arduino IDE 風格的 C/C++ 編輯器
- **零件分類**：基本輸出、基本輸入、環境感測、距離與動作、動力、顯示、被動元件
- **可互動的感測器**：按鈕直接按、旋鈕直接轉；溫度、距離、亮度、人體偵測用滑桿或按鈕調整
- **接線檢查**：LED 沒串電阻、接反、短路、腳位浮接、非 PWM 腳位用 analogWrite 都會提示
- **序列埠監控**：Serial.print 輸出與 Serial.read 輸入
- **匯出**：下載 `.ino` 可直接用 Arduino IDE 燒錄到實體板；專案可匯出 / 匯入 JSON

## 目前支援的零件

LED、RGB LED（共陰）、無源蜂鳴器、按鈕、可變電阻、光敏電阻模組、DHT22、HC-SR04、PIR、SG90 伺服馬達、電阻

## 模擬器支援的語法

`setup()` / `loop()`、自訂函式、全域 / 區域變數、陣列（含二維）、`#define`、`const`、整數除法、
`if / for / while / do-while / switch`、`pinMode`、`digitalWrite/Read`、`analogWrite/Read`、`delay`、`millis`、
`map`、`constrain`、`random`、`tone/noTone`、`pulseIn`、`Serial`、`Servo`、`DHT`

尚未支援：`struct` / `class`、指標、`attachInterrupt`、16 位元 `int` 溢位行為。

## 開發

```bash
npm ci
npm run build      # 輸出到 dist/
npm run dev        # 建置並在本機開啟
```

技術：自建 Arduino C → JavaScript 轉譯器與電路網路解算；零件外觀使用 [wokwi-elements](https://github.com/wokwi/wokwi-elements)（MIT）；積木使用 [Blockly](https://github.com/google/blockly)；編輯器使用 [CodeMirror 6](https://codemirror.net/)。

## 部署

Vercel 匯入此 repo 即可（設定在 `vercel.json`：`npm run build`，輸出 `dist`）。

## 開發進度

- [x] P0 技術原型：實驗室、11 種零件、8 個範例
- [ ] P1 實驗室完善：補齊零件、序列埠繪圖器、分享連結
- [x] P2 課程化：3D 星系入口、內圈 3 顆星球 9 個關卡與自動檢查
- [ ] P3 擴充：麵包板模式、顯示類零件、第 4–7 顆星球
- [ ] P4 整合：併入教學群島入口頁；選配真實編譯與 Web Serial 燒錄
