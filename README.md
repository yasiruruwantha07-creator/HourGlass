# HourGlass Planner (Desktop)

This project now supports packaging as a Windows `.exe` using Electron.

## Run locally

```bash
npm install
npm start
```

## Build downloadable Windows executables

```bash
npm run dist:win
```

Build output will be generated in:

- `release/HourGlass-Planner-<version>-<arch>.exe` (installer)
- `release/HourGlass-Planner-<version>-<arch>.exe` (portable variant will be produced with its own suffix by electron-builder)

> Note: building Windows artifacts from non-Windows environments may require additional system dependencies/tooling.
