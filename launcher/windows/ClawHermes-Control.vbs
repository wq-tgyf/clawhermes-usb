Option Explicit
Dim shell, fso, baseDir, target
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
target = fso.BuildPath(baseDir, "ClawHermes-App.vbs")
' 以独立应用窗口打开；关闭窗口后自动停止服务。
shell.Run """" & target & """", 1, False
