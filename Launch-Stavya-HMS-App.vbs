Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

strMainWeb = strDir & "\index.html"
targetUrl = "file:///" & Replace(strMainWeb, "\", "/")

WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=""" & targetUrl & """", 0, False
