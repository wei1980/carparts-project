' StartCarparts.vbs - boot-start Carparts API (3000) + Web (5173)
' Put in Startup folder. Windows hidden, no console window.
' Idempotent: skips anything already listening.
Option Explicit

Dim sh, fso, apiDir, webDir

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

apiDir = "C:\carparts\carparts-api"
webDir = "C:\carparts\carparts-web"

' Wi-Fi needs a few seconds after boot before it has an IP; binding too early fails
WScript.Sleep 10000

If Not IsPortUp(3000) Then
    If fso.FolderExists(apiDir) Then
        sh.CurrentDirectory = apiDir
        sh.Run "cmd /c npm run dev", 0, False
    End If
End If

If Not IsPortUp(5173) Then
    If fso.FolderExists(webDir) Then
        sh.CurrentDirectory = webDir
        sh.Run "cmd /c npm run dev", 0, False
    End If
End If

WScript.Sleep 8000
If IsPortUp(5173) Then sh.Run "http://localhost:5173", 1, False

Set sh = Nothing
Set fso = Nothing

Function IsPortUp(port)
    Dim exec, out
    out = ""
    IsPortUp = False
    On Error Resume Next
    Set exec = sh.Exec("cmd /c curl -s -m 2 -o NUL -w ""%{http_code}"" http://localhost:" & port & "/")
    Do While Not exec.Stdout.AtEndOfStream
        out = out & exec.Stdout.ReadAll
    Loop
    On Error GoTo 0
    If InStr(out, "404") > 0 Or InStr(out, "200") > 0 Then IsPortUp = True
End Function
