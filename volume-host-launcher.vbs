' volume-host-launcher.vbs — Invisible launcher for volume-host.ps1
' Native messaging hosts need stdin/stdout piping, which WScript.Shell.Run
' cannot do. Instead we use this VBS only for the Task Scheduler path.
' For native messaging, we use a different approach (see volume-host.bat).
Dim fso, scriptDir
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\volume-scheduler.ps1""", 0, False
