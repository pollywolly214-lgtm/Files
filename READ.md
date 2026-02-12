# File Organization App

Static web app that helps users:

- Upload a file.
- Answer a wizard with Project / Assembly / Part / Thickness / Revision / Cut data.
- Auto-generate filenames using:
  - `PRT-[PROJ]-[ASY]-[PRT]-[THK]-P[REV]`
  - `NS-[PROJ]-[ASY]-[PRT]-[THK]-P[REV]-C[CUT]`
  - `NS-[PROJ]-[ASY]-[THK]-P[REV]-C[CUT]`
- Preview OneDrive autosave destination path.
- Download a renamed local copy.
- Save metadata history in browser localStorage.

## Run locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

This implementation is static HTML/CSS/JS. It supports OneDrive root/url configuration and path routing logic. Full server-side upload directly to OneDrive requires Microsoft Graph auth and API integration.
