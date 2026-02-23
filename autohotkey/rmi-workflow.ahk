; RMI Workflow Hotkeys
; Requires AutoHotkey v2 — https://www.autohotkey.com
; To activate: double-click this file or add to Windows startup
;
; Hotkeys:
;   Win+T           — Paste clipboard to docs/CURRENT_TASK.md
;   Ctrl+Alt+O      — Open docs/CURRENT_TASK.md in Notepad++
;   Ctrl+Alt+S      — Capture screenshots for visual review
;   Ctrl+Alt+R      — Reload this script (after editing)

#Requires AutoHotkey v2.0
#SingleInstance Force

; ─── Configuration ───────────────────────────────────────────────
; Update this path if your project is in a different location
ProjectRoot := "C:\Users\Graham Goupille\astro-project"
; ─────────────────────────────────────────────────────────────────

; Show tray tooltip so user knows the script is active
A_IconTip := "RMI Workflow Hotkeys (Win+T, Ctrl+Alt+O, Ctrl+Alt+S)"
TrayTip("RMI Workflow", "Hotkeys loaded`nWin+T | Ctrl+Alt+O | Ctrl+Alt+S | Ctrl+Alt+R", 2)

; Win+T — Paste clipboard to CURRENT_TASK.md
#t:: {
    script := ProjectRoot . "\scripts\paste-task.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
    TrayTip("RMI Workflow", "CURRENT_TASK.md updated from clipboard", 2)
}

; Ctrl+Alt+O — Open CURRENT_TASK.md in Notepad++
^!o:: {
    script := ProjectRoot . "\scripts\open-task.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
    TrayTip("RMI Workflow", "Opening CURRENT_TASK.md...", 2)
}

; Ctrl+Alt+S — Capture screenshots
^!s:: {
    script := ProjectRoot . "\scripts\screenshots.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
    TrayTip("RMI Workflow", "Capturing screenshots...", 2)
}

; Ctrl+Alt+R — Reload this script
^!r:: {
    TrayTip("RMI Workflow", "Reloading hotkeys...", 2)
    Sleep(500)
    Reload()
}
