# Friendly File Namer

A simple static wizard for naming uploaded files using your Project → ASY → PRT standard.

## Functional flow (click-minimized)
1. Upload file.
2. Pick type with one-click chips: `PRT`, `NS`, `ASY`, or `PARENT`.
3. Enter 4-digit project.
4. Pick assembly (dropdown).
5. If `NS`, choose nest scope with one-click chips.
6. If needed, pick part number (dropdown).
7. If needed (`PRT`/`NS`), pick thickness with one-click chips.
8. Enter revision.
9. If `NS`, confirm/adjust cut (`C###`, auto-formatted).
10. Review generated filename/path and download renamed copy.

## UX updates
- Removed dropdowns for everything except **assembly** and **part**.
- Added `PARENT` as a new type option.
- Added faster “chip” choices, subtle motion, fade-in transitions, and friendly micro-notes.
- Preserved strict validation + safe local history behavior.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
This is a static HTML/CSS/JS app. It previews OneDrive path logic and local renamed download. Direct upload to OneDrive requires Microsoft Graph integration.
