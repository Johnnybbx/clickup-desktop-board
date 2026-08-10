# ClickUp Desktop Board

常駐 Windows 桌面的 ClickUp 任務總覽小視窗：顯示**指派給你**的未完成任務，預設置頂，可搜尋、重新整理、拖曳排序，並點擊開啟任務連結。

## 換電腦快速安裝

### 1. 前置需求

- 已安裝 [Node.js 18+](https://nodejs.org/)
- 已安裝 [Git](https://git-scm.com/)
- 準備好 ClickUp API Token（Settings → Apps → API Token）

### 2. 下載並安裝

在 PowerShell 執行：

```powershell
git clone https://github.com/Johnnybbx/clickup-desktop-board.git
cd clickup-desktop-board
npm install
npm run shortcut
```

若 GitHub 使用者名稱或倉庫網址不同，把上面的 clone 網址改成你的倉庫 URL。

### 3. 設定 API Token（每台電腦都要設一次）

```powershell
[System.Environment]::SetEnvironmentVariable(
  "CLICKUP_API_TOKEN",
  "你的 API Token",
  "User"
)
```

設定後重新登入 Windows，或至少重新開啟應用程式。

### 4. 啟動

雙擊桌面捷徑 **ClickUp Desktop Board**（不會跳出終端機）。

要把程式釘到工作列：對桌面捷徑按右鍵 → **釘選到工作列**。

也可執行：

```powershell
npm run shortcut   # 重建桌面捷徑與圖示
npm start          # 開發時直接啟動
```

## 使用方式

- 視窗預設置頂；可按釘選按鈕切換
- 可手動重新整理（也會每 60 秒自動更新）
- 關閉按鈕會隱藏視窗（可從系統匣圖示再叫出）
- 點任務會用瀏覽器開啟 ClickUp 任務頁
- 可拖曳調整任務順序（會記住順序）
- Hold 狀態任務不會顯示

## 安全提醒

請勿把 API Token 寫進程式碼、README 或提交到 GitHub。只使用環境變數 `CLICKUP_API_TOKEN`。
