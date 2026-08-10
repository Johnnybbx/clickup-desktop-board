# One-shot setup for a new Windows machine (run inside the cloned repo).
$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "請先安裝 Node.js 18+：https://nodejs.org/"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "找不到 npm，請確認 Node.js 安裝完整。"
}

Write-Host "Installing dependencies..."
npm install

Write-Host "Creating desktop shortcut..."
npm run shortcut

$token = [Environment]::GetEnvironmentVariable("CLICKUP_API_TOKEN", "User")
if (-not $token) {
  Write-Host ""
  Write-Host "尚未設定 CLICKUP_API_TOKEN。"
  Write-Host "請執行："
  Write-Host '[System.Environment]::SetEnvironmentVariable("CLICKUP_API_TOKEN", "你的 API Token", "User")'
  Write-Host "設定後再開啟桌面捷徑 ClickUp Desktop Board。"
} else {
  Write-Host ""
  Write-Host "Setup complete. Launch from desktop shortcut: ClickUp Desktop Board"
}
