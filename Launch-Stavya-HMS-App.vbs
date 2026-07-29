Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

strExe = strDir & "\dist\exe\win-unpacked\Stavya Intelligence HMS.exe"
strElectron = strDir & "\node_modules\electron\dist\electron.exe"
strMainJs = strDir & "\electron\main.js"
strMainWeb = strDir & "\index.html"

If fso.FileExists(strExe) Then
    WshShell.Run """" & strExe & """", 0, False
ElseIf fso.FileExists(strElectron) And fso.FileExists(strMainJs) Then
    WshShell.Run """" & strElectron & """ """ & strMainJs & """", 0, False
Else
    targetUrl = "file:///" & Replace(strMainWeb, "\", "/")
    WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=""" & targetUrl & """", 0, False
End If
