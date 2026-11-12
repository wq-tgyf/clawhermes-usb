Option Explicit
Dim shell, fso, baseDir, target
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(baseDir, "ClawHermes-Control.bat")
' 0 = 隐藏窗口；False = 不等待脚本结束。
shell.Run """" & target & """", 0, False
