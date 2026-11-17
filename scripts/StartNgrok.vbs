' StartNgrok.vbs - expose the reserved ngrok domain -> carparts API (3000)
'
' Why VBS, not .bat:
'   launched from the Startup folder, a .bat leaves cmd.exe waiting
'   on the pipe (the script finishes but the window never closes).
'   WshShell.Run(..., 0, False) detaches cleanly instead.
Set sh = CreateObject("WScript.Shell")

' 1) Require the API to be up; ngrok returns 502 on a dead port.
Dim exec, alive
alive = False
On Error Resume Next
Set exec = sh.Exec("cmd /c curl -sf -m 3 http://127.0.0.1:3000/health")
Do While Not exec.Stdout.AtEndOfStream
    If InStr(exec.Stdout.ReadAll, "ok") > 0 Then alive = True
Loop
On Error GoTo 0

If Not alive Then
    WScript.Quit 1
End If

' 2) Kill the old ngrok: one reserved domain can only bind once.
sh.Run "taskkill /f /im ngrok.exe", 0, True
WScript.Sleep 2000

' 3) Start ngrok -> 3000. 0 = hidden, False = do not wait.
sh.Run "ngrok http 3000 --url=chewy-licking-grumbling.ngrok-free.dev", 0, False

Set sh = Nothing
WScript.Quit 0