' StartNgrok.vbs — 開機自動把固定域名照亮到 carparts API (3000)
'
' 為什麼用 VBS 而不是 bat：
'   在 Startup 資料夾用 cmd 跑 .bat 時，ngrok 會把 stdout 接在 console 上，
'   cmd.exe 不會自己結束（腳本「跑完」但視窗永久等待）。
'   VBS 用 WshShell.Run(..., 0, False) 完全脫離 console，乾淨結束。
Set sh = CreateObject("WScript.Shell")

' 1) 先確認 API 在跑；沒在跑就放棄（ngrok 對空 port 會回 502，LINE 收不到）
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

' 2) 清掉舊 ngrok（同一個 reserved domain 只能綁一次）
sh.Run "taskkill /f /im ngrok.exe", 0, True
WScript.Sleep 2000

' 3) 啟動 ngrok，指向 3000。0 = 隱藏視窗, False = 不等待
sh.Run "ngrok http 3000 --url=chewy-licking-grumbling.ngrok-free.dev", 0, False

Set sh = Nothing
WScript.Quit 0