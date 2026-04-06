# Elivis

**Team, project, and task management focused on real workflows.** Same UI on web and desktop, designed for **self-hosting**.

> 한국어: [README.md](README.md)

For architecture, API details, and build options, see **[`docs/en/`](docs/en/README.md)**.

### Made by

[![Instagram](https://img.shields.io/badge/Instagram-%40hi.kimsunim-E4405F?logo=instagram&logoColor=white)](https://www.instagram.com/hi.kimsunim/)
[![Threads](https://img.shields.io/badge/Threads-%40hi.kimsunim-000000?logo=threads&logoColor=white)](https://www.threads.com/@hi.kimsunim)

---

## What it does

- Create **teams**, invite members, and discuss on a team **community board**.
- Create **projects**, manage members and roles; each person gets a **workspace** (personal task board).
- Tasks support **statuses and priorities**, comments, attachments, notes, and **task requests** (accept / reject).
- **Notifications**: list and mark read over REST; **Socket.IO** pushes live updates.
- On first boot with an **empty database**, the API prints a one-time **setup token** for the initial admin.

---

## Tech stack (summary)

| Layer | Technology |
|-------|------------|
| Monorepo | pnpm workspaces, Turborepo |
| Web | Next.js 16, React 19, Tailwind CSS |
| Desktop | Electron 41 |
| API | Fastify 5, Node.js 24+ |
| Notifications | Socket.IO, Redis pub/sub |
| Database | PostgreSQL 16, Prisma 6 |
| Cache / sessions | Redis 7 |
| Auth | JWT (access / refresh) + RBAC |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 24.14.0+ (see `package.json` `engines`) |
| pnpm | 9.x (`corepack enable` recommended) |
| Docker Desktop | Latest (local PostgreSQL & Redis) |

---

## Quick start

```bash
git clone https://github.com/haeinkkk/elivis.git
cd elivis
```

**1. Environment**

```bash
# macOS / Linux
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random values (e.g. `openssl rand -hex 32`).

**2. After `pnpm install` — what’s left?**

**Installing dependencies is not enough** — tables are not created in the database yet.

| Step | What |
|------|------|
| **Run Postgres + Redis** | `pnpm install` only adds Node packages. You still need **database servers** (this repo expects Docker Compose for local dev) so `DATABASE_URL` / `REDIS_URL` work. |
| **Run Prisma migrations** | `@repo/database` may run `prisma generate` on `postinstall`, but **`prisma migrate dev` does not run automatically.** You must run migrations so the schema (tables) exists in Postgres. |

If you already ran `pnpm install` only, do this next:

```bash
docker compose up -d --wait
pnpm --filter @repo/database db:setup
```

`db:setup` runs `prisma generate` then `prisma migrate dev`. Then start the app with **`5. Development`** → `pnpm dev`.

**3. One-shot setup (packages + Postgres/Redis + Prisma migrations)**

Installs dependencies, starts Postgres and Redis in Docker, then runs `prisma generate` and `migrate dev`.  
**Start Docker Desktop (or the Docker engine) before running.**

| OS | Command |
|----|---------|
| **macOS / Linux** | `pnpm run setup:mac` |
| **Windows** | `pnpm run setup:win` |
| **Any** | `pnpm run setup` |

- macOS shell only: `chmod +x scripts/setup-mac.sh` then `./scripts/setup-mac.sh`
- Windows script only: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`

Plain `pnpm setup` is pnpm’s built-in command — use **`pnpm run setup`** or the OS-specific commands above.

What `scripts/setup.mjs` does:

- Preflight: `pnpm`, Docker daemon, `docker compose` (falls back to `docker-compose`) — platform-specific hints on failure
- Copy `env.example` → `.env` if missing
- `pnpm install` → `docker compose up -d --wait` (or legacy `docker-compose up -d` + wait for Postgres)
- `pnpm --filter @repo/database db:setup`

Same outcome as the manual steps in **2**.

**4. Database setup (details / repeat)**

- **Connection strings** — Root `.env` `DATABASE_URL` and `REDIS_URL` must match the Postgres and Redis you run. With dev Docker, the defaults in `env.example` (`postgresql://elivis:elivis@localhost:5432/elivis`, `redis://localhost:6379`) match `docker-compose.yml`.

- **Start containers** (if not already up):

```bash
docker compose up -d --wait
```

- **Apply schema (Prisma client + migrations)** — `@repo/database` loads the root `.env` via `dotenv-cli`:

```bash
pnpm --filter @repo/database db:setup
```

This runs `prisma generate` then `prisma migrate dev`. If the DB already exists and you only want the interactive migrate flow, use `pnpm --filter @repo/database db:migrate`.

- **Production-style DB** — from repo root: `pnpm db:deploy` (`migrate deploy` + `generate`).

- **Browse / edit data** — `pnpm db:studio` (Prisma Studio).

**5. Development**

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| REST API | http://localhost:4000 |
| Notifications (Socket.IO) | http://localhost:4001 (web uses `NEXT_PUBLIC_NOTIFICATION_URL`) |
| Desktop | Electron window (starts after web is ready with `pnpm dev`) |

### Windows: `EPERM` renaming `query_engine-windows.dll.node`

Antivirus real-time scanning, Windows Search indexing, or **OneDrive-synced folders** (e.g. clone under Desktop/Documents) can lock files under `node_modules` and make `prisma generate` fail.

1. Prefer a path **outside OneDrive** (e.g. `C:\dev\elivis`).  
2. Add the project folder to Windows Defender **exclusions**, or pause real-time protection briefly while installing.  
3. The repo `.npmrc` sets **`node-linker=hoisted`** to reduce this. After changing it, **delete `node_modules` and reinstall**:

```powershell
Remove-Item -Recurse -Force node_modules
pnpm install
```

Then run `pnpm run setup:win` or `pnpm run setup` again.

---

## Usage (product view)

1. **First account** — When there are no users, the API logs a `SETUP TOKEN`. Sign up with `setupToken` in the body to create **SUPER_ADMIN**. After that, normal signup / invite flows apply. ([Details: `docs/en/server/README.md` — Bootstrap](docs/en/server/README.md#bootstrap-super_admin))

2. **Browser** — Open http://localhost:3000 and sign in. Teams, projects, my work, notifications, and settings live under the App Router. ([`docs/en/web/README.md`](docs/en/web/README.md))

3. **Desktop** — With the web dev server on port 3000, `pnpm dev` also launches Electron. For installers, run the static web build then package the desktop app. ([`docs/en/desktop/README.md`](docs/en/desktop/README.md))

4. **Admins** — `SUPER_ADMIN` uses the admin UI for users and roles. ([`docs/en/server/README.md`](docs/en/server/README.md))

5. **Production** — Prepare `.env.production` and use the production Docker Compose flow. ([`docs/en/server/README.md` — Production](docs/en/server/README.md#production-builds))

---

## Common commands

| Command | Description |
|---------|-------------|
| `pnpm run setup` | Install + Docker (DB/Redis) + Prisma migrations |
| `pnpm run setup:mac` | Same (macOS/Linux; needs `bash`) |
| `pnpm run setup:win` | Same (Windows PowerShell) |
| `pnpm --filter @repo/database db:setup` | DB only: Prisma generate + migrate dev |
| `pnpm --filter @repo/database db:migrate` | migrate dev only (interactive) |
| `pnpm db:deploy` | migrate deploy + generate (deploy) |
| `pnpm dev` | Web, API, notifications, desktop in dev mode |
| `pnpm dev:web` / `pnpm dev:server` / `pnpm dev:notification` / `pnpm dev:desktop` | Single app |
| `pnpm build` | Build all packages |
| `pnpm build:desktop` | Static web + Electron installer |
| `pnpm start` | After build: web + API + notification servers |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:dev:*` / `pnpm docker:prod:*` | Docker helpers |

---

## Repository layout (summary)

```
apps/
  web/
  desktop/
  server/
    apiServer/
    notificationServer/
packages/
  database/
  ui/, types/, i18n/
docs/           # Detailed docs (Korean: docs/, English: docs/en/)
```

---

## Documentation

- [English index](docs/en/README.md)
- [Server & API](docs/en/server/README.md)
- [Web app](docs/en/web/README.md)
- [Desktop](docs/en/desktop/README.md)
- [한국어 문서](docs/README.md)

---

## Contributing

Issues and PRs are welcome. For larger changes, opening an issue first helps align direction.

1. Fork and create a branch  
2. Commit and push  
3. Open a pull request

---

## License

MIT License

Copyright (c) 2026 Elivis Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
