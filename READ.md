# Friendly File Namer

A simple static wizard for naming uploaded files using your Project → ASY → PRT standard.

## Functional reasoning (step-by-step)
For the app to work reliably, each user action must have one clear result:
1. User uploads a file; app stores the selected file and keeps its extension.
2. User selects file type (`PRT`, `NS`, `ASY`) to determine which tokens are required.
3. User enters a valid 4-digit project number.
4. User picks an assembly number from the predefined list.
5. If type is `NS`, user chooses single-part vs multi-part nest scope.
6. If required by type/scope, user picks a part number.
7. If type is `PRT` or `NS`, user picks thickness.
8. User enters a positive revision number.
9. If type is `NS`, user confirms cut in `C###` format (auto-normalized).
10. App composes the filename from exactly the required tokens and preserves extension.
11. App computes preview path (`Parts`, `Nests`, or `CAD`) from project + assembly + type.
12. App shows final name/path, enables renamed download, and stores recent history safely.

## What changed
- One-question-at-a-time flow with conditional step logic.
- Inline validation messages (no blocking alert popups).
- Safer filename generation that handles missing file input without crashing.
- Better cut handling (`C###` normalization and validation).
- Local history dedupe + bounded storage in `localStorage`.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
This is a static HTML/CSS/JS app. It previews OneDrive path logic and local renamed download. Direct upload to OneDrive requires Microsoft Graph integration.
