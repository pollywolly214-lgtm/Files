# Friendly File Namer

A simple static wizard for naming uploaded files using your Project → ASY → PRT standard.

## What changed
- One-question-at-a-time flow.
- Friendly prompts and calm, minimal UI.
- Fade transition between steps.
- Easy dropdown selection for assembly and part numbers (no create-new actions).
- Auto-generated names for PRT / NS / ASY patterns.
- Suggested cut counter (`C###`) and quick final download of renamed file.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
This is a static HTML/CSS/JS app. It currently previews OneDrive path logic and local renamed download. Direct upload to OneDrive requires Microsoft Graph integration.
