# FacultyOne

FacultyOne is a local-first academic operations dashboard for program chairs and research leads. It combines research pipeline tracking, teaching and service management, personnel oversight, task planning, and an optional in-app ChatGPT assistant.

## Highlights

- Track research projects through customizable pipeline stages.
- Manage teaching, service, and personnel work in one place.
- Store operational data locally in browser storage or a desktop JSON file.
- Use an OpenAI API key from Settings for optional AI assistance. The key is stored locally on the device and is not committed to the repo.

## Development

Prerequisites: Node.js 20+ and npm.

1. Install dependencies with `npm install`.
2. Start the web app with `npm run dev`.
3. Build the production bundle with `npm run build`.

## Desktop Packaging

- Launch the Electron shell with `npm run electron`.
- Build a macOS directory target with `npm run dist:mac:dir`.
- Build a macOS app bundle with `npm run dist:mac`.

## Data and AI Settings

- FacultyOne stores application data locally and does not require a backend.
- In the desktop app, the default data file is created under `~/Documents/FacultyOne/faculty-one-data.json`.
- OpenAI settings are configured inside the app and saved locally for that machine/browser session.

## Repo Notes

- `dist/`, `node_modules/`, desktop build output, and local data files are intentionally ignored.
- The repository does not require `.env` secrets for normal development.
