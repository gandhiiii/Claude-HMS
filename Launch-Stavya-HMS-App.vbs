Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

strFlutterWeb = strDir & "\hms_flutter\build\web\index.html"
strMainWeb = strDir & "\index.html"

If fso.FileExists(strFlutterWeb) Then
    targetUrl = "file:///" & Replace(strFlutterWeb, "\", "/")
Else
    targetUrl = "file:///" & Replace(strMainWeb, "\", "/")
End If

WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --app=""" & targetUrl & """", 0, False
