# Desktop — `apps/desktop`

Electron 41 desktop shell.  
In development it loads the Next.js dev server at `http://localhost:3000`.  
In production it bundles the static web output from `apps/web/out`.

The packaged app uses the same API and notification URLs as the web client; root `.env` values for `NEXT_PUBLIC_*` are baked in at web build time.

## Table of contents

- [Tech stack](#tech-stack)
- [Directory layout](#directory-layout)
- [Development](#development)
- [Production build](#production-build)
- [Electron architecture](#electron-architecture)
- [Troubleshooting (Windows)](#troubleshooting-windows)

---

## Tech stack

| Item | Version |
|------|---------|
| Electron | 41.1.0 |
| electron-builder | 26.8.1 |
| Node.js | 24+ |
| TypeScript | 5.x |

---

## Directory layout

```
apps/desktop/
├── src/
│   ├── main.ts         # Main process
│   └── preload.ts      # Preload (context bridge)
├── scripts/
│   └── sync-icon.mjs   # Copy web public/favicon.ico → build & dist/icon.ico
├── static/             # Local shell (splash), offline / dev-server hints (no network required)
├── build/              # electron-builder assets (icon.ico, etc.)
├── dist/               # Compiled JS (after build)
├── release/            # Installer / portable output
└── electron-builder.yml
```

### Icon (favicon)

- Place **`apps/web/public/favicon.ico`** (same as the web app). A normal multi-resolution `.ico` (e.g. 16×16 through 256×256) is enough for Windows window and executable icons; no separate size is strictly required.
- **`pnpm build`** / **`pnpm dev`** run **`scripts/sync-icon.mjs`**, which copies that file to **`build/icon.ico`** and **`dist/icon.ico`**. `electron-builder` picks up **`build/icon.ico`** for packaged builds.
- For **macOS** DMG/App icons, you can add **`build/icon.icns`** later (optional).

### Splash & offline

- The app loads **`static/shell.html`** first (native-style splash), then loads the real UI in a **`<webview>`** so the splash stays until the page finishes loading.
- **Development**: if `http://127.0.0.1:3000` is unreachable, **`noserver.html`** explains starting the Next dev server.
- **Packaged (static `web/out`)**: if the internet probe fails, **`offline.html`** asks the user to check the connection. For air-gapped installs where only the static shell should open, set the OS environment variable **`ELIVIS_DESKTOP_SKIP_INTERNET_CHECK=1`** when launching the app (the packaged binary does not auto-load the monorepo `.env`).
- **Missing `web/out`**: **`nobuild.html`** explains running `pnpm --filter web build:static`.
- Each screen has **Retry**, which re-runs checks and returns to the shell.

---

## Development

> **Web UI:** In dev, the app loads `http://localhost:3000`. If it is not up yet, **`noserver.html`** is shown. Run `pnpm dev:web` in another terminal, or use `pnpm dev` below.

Recommended — run web, API, notifications, and desktop together:

```bash
pnpm dev
```

Desktop only (Electron starts immediately; start `pnpm dev:web` separately to connect):

```bash
pnpm dev:desktop
# or
pnpm --filter @repo/desktop dev
```

The `dev` script runs `tsc` once to produce `dist/`, then runs `tsc -w` alongside Electron.

---

## Production build

### Step 1: static web build

```bash
pnpm --filter web build:static
# output: apps/web/out/
```

### Step 2: package Electron

```bash
pnpm build:desktop
# output: apps/desktop/release/
```

`electron-builder.yml` copies `apps/web/out/` into the app as `web-out/`.

### Artifacts

| File | Description |
|------|-------------|
| `release/*-Setup.exe` | NSIS installer (Windows) |
| `release/*-Portable.exe` | Portable executable |

---

## Electron architecture

### Dev vs production loading

In dev, **`static/shell.html`** loads first, then a **webview** loads `http://localhost:3000/` (or `noserver.html` when the dev server is unreachable). Production uses `web-out` static files. See `resolveAppTarget()` and `beginShellFlow()` in `main.ts`.

### preload.ts

Exposes a minimal, safe API to the renderer via the context bridge with `contextIsolation: true`.

---

## Troubleshooting (Windows)

### `pnpm dev:desktop` does not open Electron

- Older scripts used **`wait-on`** on port 3000, so without the web server running Electron **never started**. The current script starts Electron immediately; if the web server is down you see **`noserver.html`**. Start `pnpm dev:web` in another terminal or use `pnpm dev`.

### `Cannot create symbolic link`

You may see this when running `electron-builder`:

```
ERROR: Cannot create symbolic link
```

**Fix: enable Windows Developer Mode**

1. Open **Settings** → **Update & Security** → **For developers**  
   (Windows 11: **Settings** → **System** → **For developers**)
2. Turn on **Developer Mode**.
3. Reboot and rebuild.

> Developer Mode allows creating symbolic links without elevated privileges.

---

### Electron shows a blank window

- Ensure the web dev server on `localhost:3000` is running.
- Running `pnpm dev` starts web, API, notifications, and desktop together.

---

### `ENOENT: no such file or directory` during packaging

- Confirm `apps/web/out/` exists.
- Run `pnpm --filter web build:static` before `pnpm build:desktop`.
