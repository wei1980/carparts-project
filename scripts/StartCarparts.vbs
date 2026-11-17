' StartCarparts.vbs - boot-start Carparts API (3000) + Web (5173)
' Put in Startup folder. Windows hidden, no console window.
' Idempotent: skips anything already listening.
Option Explicit

Dim sh, fso, apiDir, webDir, lg, npmCmd, nodeExe, probe
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

apiDir = "C:\carparts\carparts-api"
webDir = "C:\carparts\carparts-web"
npmCmd = "C:\Program Files\nodejs\npm.cmd"
nodeExe = "C:\Program Files\nodejs\node.exe"
probe = "C:\carparts\scripts\check_port.js"
lg = "C:\carparts\scripts\start_carparts.log"

Sub Log(m)
    Dim f
    On Error Resume Next
    Set f = fso.OpenTextFile(lg, 8, True)
    f.WriteLine Now & "  " & m
    f.Close
    On Error GoTo 0
End Sub

Log "=== StartCarparts start ==="

' Wait for DB + Redis (API connects to both at startup).
' Wait for DB + Redis (API connects to both at startup).
Dim i, okd
okd = False
For i = 1 To 30
    If IsPortUp(5432) Then okd = True
    If okd Then Exit For
    WScript.Sleep 2000
Next
Log Chrono(okd, "PostgreSQL 5432 ready", "WARN PostgreSQL 5432 not ready")

okd = False
For i = 1 To 20
    If IsPortUp(6380) Then okd = True
    If okd Then Exit For
    WScript.Sleep 2000
Next
Log Chrono(okd, "Redis 6380 ready", "WARN Redis 6380 not ready")

Function Chrono(ok, a, b)
    If ok Then Chrono = a Else Chrono = b
End Function

' Start API / Web (absolute npm.cmd path; cd /d inside cmd).
If Not IsPortUp(3000) Then
    If fso.FolderExists(apiDir) Then
        sh.Run "cmd /c cd /d " & Quote(apiDir) & " && " & Quote(npmCmd) & " run dev", 0, False
        Log "started API"
    Else
        Log "ERROR API dir missing"
    End If
Else
    Log "API 3000 already up, skip"
End If

If Not IsPortUp(5173) Then
    If fso.FolderExists(webDir) Then
        sh.Run "cmd /c cd /d " & Quote(webDir) & " && " & Quote(npmCmd) & " run dev", 0, False
        Log "started Web"
    Else
        Log "ERROR Web dir missing"
    End If
Else
    Log "Web 5173 already up, skip"
End If

Function Quote(s)
    Quote = """" & s & """"
End Function

' Open the browser only after both ports are up.
Dim waited
waited = 0
Do While waited < 90
    WScript.Sleep 2000
    waited = waited + 2
    If IsPortUp(5173) Then Exit Do
Loop

If IsPortUp(5173) Then
    sh.Run "http://localhost:5173", 1, False
    Log "opened browser after " & waited & "s"
Else
    Log "WARN 5173 not ready after " & waited & "s"
End If

' 4) ngrok: expose the reserved domain -> 3000 so LINE webhooks can reach us.
'    Run last so the API is already listening (ngrok returns 502 on a dead port).
If Not IsNgrokUp() Then
    sh.Run "cmd /c taskkill /f /im ngrok.exe", 0, True
    WScript.Sleep 2000
    sh.Run "ngrok http 3000 --url=chewy-licking-grumbling.ngrok-free.dev", 0, False
    Log "started ngrok (domain -> 3000)"
Else
    Log "ngrok already up, skip"
End If

Log "=== StartCarparts end ==="

Set sh = Nothing
Set fso = Nothing

' ---- ngrok local API (port 4040) tells us whether a tunnel exists ----
Function IsNgrokUp()
    Dim e
    IsNgrokUp = False
    On Error Resume Next
    Set e = sh.Exec("cmd /c curl -s -m 3 http://127.0.0.1:4040/api/tunnels")
    Do While Not e.Stdout.AtEndOfStream
        If InStr(e.Stdout.ReadAll, "public_url") > 0 Then IsNgrokUp = True
    Loop
    On Error GoTo 0
End Function

Function IsPortUp(port)
    ' TCP probe via node: PostgreSQL/Redis are not HTTP so curl fails there.
    ' node connecting the socket is accurate for any port.
    Dim exec, code
    code = "1"
    On Error Resume Next
    ' Build: "<node.exe>" "<check_port.js>" localhost <port>
    Set exec = sh.Exec("""" & nodeExe & """ """ & probe & """ localhost " & port)
    Do While Not exec.Stdout.AtEndOfStream
        exec.Stdout.ReadAll
    Loop
    Do While Not exec.Stderr.AtEndOfStream
        exec.Stderr.ReadAll
    Loop
    code = exec.ExitCode
    On Error GoTo 0
    IsPortUp = (code = 0 Or code = "0")
End Function
