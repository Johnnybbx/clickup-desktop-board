$ErrorActionPreference = "Stop"

$appDir = Split-Path -Parent $PSScriptRoot
$electronExe = Join-Path $appDir "node_modules\electron\dist\electron.exe"
$iconPath = Join-Path $appDir "assets\icon.ico"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "ClickUp Desktop Board.lnk"
$appUserModelId = "com.clickup.desktopboard"

if (-not (Test-Path $electronExe)) {
  throw "Electron not found. Run npm install first."
}
if (-not (Test-Path $iconPath)) {
  throw "Icon not found: $iconPath"
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

public static class AppUserModelIdHelper {
  [ComImport]
  [Guid("000214F9-0000-0000-C000-000000000046")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IShellLinkW {
    void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszFile, int cchMaxPath, IntPtr pfd, uint fFlags);
    void GetIDList(out IntPtr ppidl);
    void SetIDList(IntPtr pidl);
    void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszName, int cchMaxName);
    void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszDir, int cchMaxPath);
    void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string pszDir);
    void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszArgs, int cchMaxPath);
    void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string pszArgs);
    void GetHotkey(out short pwHotkey);
    void SetHotkey(short wHotkey);
    void GetShowCmd(out int piShowCmd);
    void SetShowCmd(int iShowCmd);
    void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder pszIconPath, int cchIconPath, out int piIcon);
    void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string pszIconPath, int iIcon);
    void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pszPathRel, uint dwReserved);
    void Resolve(IntPtr hwnd, uint fFlags);
    void SetPath([MarshalAs(UnmanagedType.LPWStr)] string pszFile);
  }

  [ComImport]
  [Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  private interface IPropertyStore {
    void GetCount(out uint cProps);
    void GetAt(uint iProp, out PROPERTYKEY pkey);
    void GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
    void SetValue(ref PROPERTYKEY key, ref PROPVARIANT pv);
    void Commit();
  }

  [StructLayout(LayoutKind.Sequential, Pack = 4)]
  private struct PROPERTYKEY {
    public Guid fmtid;
    public uint pid;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct PROPVARIANT {
    public ushort vt;
    public ushort wReserved1;
    public ushort wReserved2;
    public ushort wReserved3;
    public IntPtr pointerValue;
  }

  private const ushort VT_LPWSTR = 31;

  public static void SetAppUserModelId(string shortcutPath, string appId) {
    var linkType = Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046"));
    var link = (IShellLinkW)Activator.CreateInstance(linkType);
    var pf = (IPersistFile)link;
    // STGM_READWRITE = 2
    pf.Load(shortcutPath, 2);

    var store = (IPropertyStore)link;
    var key = new PROPERTYKEY {
      fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
      pid = 5
    };

    var pv = new PROPVARIANT {
      vt = VT_LPWSTR,
      pointerValue = Marshal.StringToCoTaskMemUni(appId)
    };

    try {
      store.SetValue(ref key, ref pv);
      store.Commit();
      pf.Save(shortcutPath, true);
    } finally {
      Marshal.FreeCoTaskMem(pv.pointerValue);
    }
  }
}
"@ -ErrorAction Stop

$w = New-Object -ComObject WScript.Shell
$shortcut = $w.CreateShortcut($shortcutPath)
# electron.exe is a GUI app, so this opens without a terminal window.
$shortcut.TargetPath = $electronExe
$shortcut.Arguments = "."
$shortcut.WorkingDirectory = $appDir
$shortcut.WindowStyle = 1
$shortcut.Description = "ClickUp Desktop Board"
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Save()
[System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($shortcut) | Out-Null
[System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($w) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()
Start-Sleep -Milliseconds 200

try {
  [AppUserModelIdHelper]::SetAppUserModelId($shortcutPath, $appUserModelId)
  Write-Host "AppUserModelID set: $appUserModelId"
} catch {
  Write-Host "Warning: could not set AppUserModelID ($($_.Exception.Message))"
  Write-Host "Pinning still works via: right-click running app on taskbar -> Pin to taskbar"
}

Write-Host "Desktop shortcut updated: $shortcutPath"
Write-Host "Pin tip: right-click desktop shortcut -> Pin to taskbar"
