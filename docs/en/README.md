# Elivis documentation (English)

Per-app guides for this monorepo. For endpoints, environment variables, and build steps, see each file below.

| Doc | Contents |
|-----|----------|
| [Server (`docs/en/server/README.md`)](./server/README.md) | REST API (`apiServer`), real-time notification server (`notificationServer`), env vars, auth & RBAC, production, **team workspace backfill** and other ops scripts |
| [Web (`docs/en/web/README.md`)](./web/README.md) | Next.js app, route layout, env vars, static export for Electron |
| [Admin, security, ops (`docs/en/admin.md`)](./admin.md) | `SUPER_ADMIN` console, LDAP, public signup, SMTP, system logs, API summary |
| [Desktop (`docs/en/desktop/README.md`)](./desktop/README.md) | Electron dev & release builds, Windows notes |

**Source layout**

- `apps/web` — Web UI (App Router)
- `apps/desktop` — Electron shell
- `apps/server/apiServer` — Fastify REST API
- `apps/server/notificationServer` — Socket.IO + Redis subscription (push-style notifications)
- `packages/database` — Prisma schema & client

New to the repo: start with the root [README.en.md](../../README.en.md) (quick start & usage).  
**한국어:** [README.md](../../README.md) · [docs/README.md](../README.md)
