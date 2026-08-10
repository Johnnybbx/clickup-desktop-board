Option Explicit
Dim shell, fso, appDir, electronExe, token
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(electronExe) Then
  MsgBox "找不到 Electron，請先在專案目錄執行 npm install。", vbExclamation, "ClickUp Desktop Board"
  WScript.Quit 1
End If

token = shell.Environment("USER")("CLICKUP_API_TOKEN")
If Len(token) > 0 Then
  shell.Environment("PROCESS")("CLICKUP_API_TOKEN") = token
End If

shell.CurrentDirectory = appDir
' 0 = 隱藏視窗（不會跳出終端機）
shell.Run """" & electronExe & """ .", 0, False
