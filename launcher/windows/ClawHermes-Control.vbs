Option Explicit
Dim shell, fso, baseDir, target
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(baseDir, "ClawHermes-Control.bat")
' 7 = 最小化窗口；False = 不等待脚本结束。最小化而不是隐藏，出错时窗口仍可还原查看。
shell.Run """" & target & """", 7, False
