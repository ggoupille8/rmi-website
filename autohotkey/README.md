# AutoHotkey Setup

## Installation

1. Download AutoHotkey v2: https://www.autohotkey.com
2. Install with default settings
3. Double-click `autohotkey/rmi-workflow.ahk` to activate hotkeys

## Run on Windows Startup (Recommended)

1. Press Win+R, type `shell:startup`, press Enter
2. Create a shortcut to `rmi-workflow.ahk` in that folder
3. Hotkeys will activate automatically on login

## Hotkeys

| Hotkey | Action                                          |
| ------ | ----------------------------------------------- |
| Win+T  | Paste clipboard → docs/CURRENT_TASK.md          |
| Win+O  | Open CURRENT_TASK.md in Notepad++               |
| Win+S  | Capture screenshots → docs/screenshots/current/ |

## Workflow

1. Generate spec in Claude.ai conversation
2. Copy the code block
3. Press Win+T (writes to CURRENT_TASK.md)
4. Open Claude Code
5. Paste: "Read docs/CURRENT_TASK.md and implement everything in it. Work until complete."
6. When done, press Win+S to capture screenshots
7. Drag screenshots from the opened folder into Claude.ai for review
