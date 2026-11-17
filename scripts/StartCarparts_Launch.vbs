' 開機啟動 車大師（API + Web）
' 由 StartCarparts.vbs 實際執行；這支只是啟動器，視窗隱藏。
Set sh = CreateObject("WScript.Shell")
sh.Run """C:\carparts\scripts\StartCarparts.vbs""", 0, False
Set sh = Nothing
