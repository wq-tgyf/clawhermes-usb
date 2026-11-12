Option Explicit

' ClawHermes 客户端入口：隐藏启动服务 -> 用 Edge/Chrome 的应用模式打开门户 -> 关闭窗口后停止服务。

Dim shell, fso, baseDir, root, nodeBin, cli, portalUrl, profileDir
Dim exec, output, rc, appExe, appCmd, candidates, i

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

baseDir = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(fso.GetParentFolderName(baseDir))
cli = fso.BuildPath(root, "core\node\dist\clawhermes.js")

nodeBin = fso.BuildPath(root, "runtimes\windows\node\node.exe")
If Not fso.FileExists(nodeBin) Then nodeBin = "node"

If Not fso.FileExists(cli) Then
  MsgBox "未找到 core\node\dist\clawhermes.js，请确认已完整解压。", 16, "ClawHermes"
  WScript.Quit 1
End If

' 1. 后台启动服务
On Error Resume Next
Set exec = shell.Exec("""" & nodeBin & """ """ & cli & """ start --json")
If Err.Number <> 0 Then
  MsgBox "无法启动 Node：" & Err.Description, 16, "ClawHermes"
  WScript.Quit 1
End If
output = exec.StdOut.ReadAll()
rc = exec.ExitCode
On Error GoTo 0

If rc <> 0 Then
  MsgBox "服务启动失败：" & vbCrLf & vbCrLf & output, 16, "ClawHermes"
  WScript.Quit 1
End If

' 2. 解析实际门户地址（端口可能被重映射）
portalUrl = "http://127.0.0.1:17000/"
On Error Resume Next
Set exec = shell.Exec("""" & nodeBin & """ """ & fso.BuildPath(baseDir, "portal-url.mjs") & """")
If Err.Number = 0 Then
  output = exec.StdOut.ReadAll()
  If Len(Trim(output)) > 0 Then portalUrl = Trim(output)
End If
On Error GoTo 0

' 3. 依次查找 Edge / Chrome
candidates = Array( _
  fso.BuildPath(shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%"), "Microsoft\Edge\Application\msedge.exe"), _
  fso.BuildPath(shell.ExpandEnvironmentStrings("%ProgramFiles%"), "Microsoft\Edge\Application\msedge.exe"), _
  fso.BuildPath(shell.ExpandEnvironmentStrings("%ProgramFiles%"), "Google\Chrome\Application\chrome.exe"), _
  fso.BuildPath(shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%"), "Google\Chrome\Application\chrome.exe"))

appExe = ""
For i = 0 To UBound(candidates)
  If appExe = "" Then
    If fso.FileExists(candidates(i)) Then appExe = candidates(i)
  End If
Next

' 4. 独立窗口打开；关闭窗口后停止服务
profileDir = fso.BuildPath(root, "data\app-profile")
If Not fso.FolderExists(profileDir) Then
  On Error Resume Next
  fso.CreateFolder profileDir
  On Error GoTo 0
End If

If appExe <> "" Then
  appCmd = """" & appExe & """ --app=" & portalUrl & " --user-data-dir=""" & profileDir & """ --no-first-run --no-default-browser-check"
  shell.Run appCmd, 1, True
  shell.Run """" & fso.BuildPath(baseDir, "_clawhermes.bat") & """ stop", 0, True
  WScript.Quit 0
End If

' 5. 没有 Edge/Chrome 时退回默认浏览器，并提示手动停止
shell.Run portalUrl, 1, False
MsgBox "已用默认浏览器打开：" & portalUrl & vbCrLf & "使用完毕后请运行 3-Stop-ClawHermes.bat 停止服务。", 64, "ClawHermes"
