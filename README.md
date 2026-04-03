# FacultyOne

FacultyOne is a local-first academic operations dashboard for professors. It combines research pipeline tracking, teaching and service management, personnel oversight, task planning, and an optional in-app ChatGPT assistant.

<img width="1552" height="1072" alt="Screenshot 2026-04-03 at 7 57 39 AM" src="https://github.com/user-attachments/assets/c10e8c79-a42c-4ed8-bb69-7e9019cd943c" />

<img width="1552" height="1072" alt="Screenshot 2026-04-03 at 7 58 09 AM" src="https://github.com/user-attachments/assets/c605f754-476e-415d-ac2f-927d8110300c" />

<img width="1552" height="1072" alt="Screenshot 2026-04-03 at 7 59 33 AM" src="https://github.com/user-attachments/assets/9ff0b27f-d905-479c-9d54-2209ac509c19" />


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
