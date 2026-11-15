' 開機啟動 車大師（API + Web）
' 由 StartCarparts.vbs 以隱藏視窗方式執行，避免黑視窗閃出。
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\carparts\scripts\StartCarparts.vbs""", 0, False
Set sh = Nothing