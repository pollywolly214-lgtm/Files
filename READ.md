# Friendly File Namer

A simple static wizard for naming uploaded files using your Project → ASY → PRT standard.

## Functional flow (click-minimized)
1. Upload file.
2. Pick type with one-click chips: `PRT`, `NS`, `ASY`, or `PARENT` (auto-advances).
3. Enter 4-digit project.
4. Pick assembly (dropdown).
5. If type is `ASY`, pick assembly mode (auto-advances):
   - `2D` requires thickness
   - `3D` skips thickness
6. If type is `NS`, choose nest scope with one-click chips (auto-advances).
7. If needed, pick part number (dropdown).
8. If needed (`PRT`, `NS`, and `ASY` `2D`), choose thickness:
   - quick-pick common values: `1/8`, `3/16`, `1/4`, `3/8`, `1/2`
   - full list from `Gauge Sheet` through `2in` in `1/16` increments
   - filename stores thickness in decimal format (example: `1/2` becomes `0.50in`)
9. Enter revision.
10. If `NS`, confirm/adjust cut (`C###`, auto-formatted).
11. Review generated filename/path and download renamed copy.

## UX updates
- Removed dropdowns for everything except **assembly** and **part**.
- Added `PARENT` as a type option.
- Added assembly `2D` / `3D` mode logic for thickness requirement.
- Added broad thickness coverage with common quick picks and full range selection.
- Preserved strict validation + safe local history behavior.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
This is a static HTML/CSS/JS app. It previews OneDrive path logic and local renamed download. Direct upload to OneDrive requires Microsoft Graph integration.
