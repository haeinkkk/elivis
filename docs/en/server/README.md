# Server — `apps/server`

The Elivis backend splits into a **REST API** and a **real-time notification server**.

| App | Path | Role |
|-----|------|------|
| API Server | `apps/server/apiServer` | Fastify REST, JWT & RBAC, uploads, business logic |
| Notification Server | `apps/server/notificationServer` | Socket.IO, Redis pub/sub → push events to clients |

> The source of truth for routes is the code: `apps/server/apiServer/src/routes/*.routes.ts`

## Table of contents

- [Tech stack](#tech-stack)
- [Directory layout](#directory-layout)
- [Environment variables](#environment-variables)
- [Running in development](#running-in-development)
- [Notification server (Socket.IO)](#notification-server-socketio)
- [System log files](#system-log-files)
- [REST API overview](#rest-api-overview)
- [Data model notes](#data-model-notes)
- [Auth flow](#auth-flow)
- [RBAC](#rbac)
- [Bootstrap SUPER_ADMIN](#bootstrap-super_admin)
- [Production builds](#production-builds)

---

## Tech stack

| Item | Version |
|------|---------|
| Runtime | Node.js 24+ |
| API framework | Fastify 5 |
| ORM | Prisma 6 + PostgreSQL 16 |
| Cache / refresh store | Redis 7 (ioredis) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| Real-time | Socket.IO 4 (`notificationServer`) |

---

## Directory layout

```
apps/server/
├── apiServer/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/           # REST route modules
│   │   ├── middleware/       # auth, language, etc.
│   │   ├── plugins/          # prisma, redis
│   │   ├── services/
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json          # @repo/api-server
└── notificationServer/
    ├── src/
    │   ├── socket.ts         # Socket.IO + JWT handshake
    │   ├── redis.ts          # Pub/Sub → socket broadcast
    │   └── index.ts
    └── package.json          # @repo/notification-server
```

---

## Environment variables

Use a **single root `.env`**. Copy from `env.example`.

### Shared & API

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets (long, random) |
| `API_PORT` / `API_HOST` | REST bind address (default `4000`, `0.0.0.0`) |
| `CORS_ORIGIN` | Allowed origins (comma-separated); used for API & Socket.IO CORS |
| `UPLOAD_STORAGE` | `local` or `s3` |
| `UPLOAD_MAX_FILE_SIZE_MB` | Max upload size (MB) |
| `SYSTEM_LOG_DIR` | (optional) **Root** directory for NDJSON logs. Default: repo root **`.logs`** (creates `YYYY-MM-DD/` folders below) |

### Auth seed env (optional, first `AuthSettings` row only)

Commented keys in **`env.example`** such as **`PUBLIC_SIGNUP_ENABLED`**, **`LDAP_*`** seed the **first** `AuthSettings` row when it is created. After that, the DB and admin UI win. See [`docs/en/admin.md`](../admin.md).

### Notification server

| Key | Description |
|-----|-------------|
| `NOTIFICATION_PORT` / `NOTIFICATION_HOST` | Notification HTTP/Socket server (default `4001`, `0.0.0.0`) |

When the API publishes notification events via Redis, the notification server forwards them to the `user:{userId}` room. See `notificationServer/src/redis.ts` for channel details.

> **Security:** generate JWT secrets with e.g. `openssl rand -hex 32`.

---

## Running in development

From the repo root (web, API, notifications, desktop, etc.):

```bash
pnpm dev
```

Run services individually:

```bash
pnpm dev:server        # REST only → http://localhost:4000
pnpm dev:notification  # notification server → http://localhost:4001
```

---

## Notification server (Socket.IO)

- `GET /` on the HTTP server returns a small JSON payload (`status`, `service`).
- Clients pass an **access JWT** on connect via `auth.token` or `Authorization: Bearer …`.
- After connect, sockets join `user:{userId}`; the server can send recent notifications, etc.

The web app uses `NEXT_PUBLIC_NOTIFICATION_URL` (e.g. `http://localhost:4001`).

---

## System log files

- API and notification servers share a **`SYSTEM_LOG_DIR`** root (default: repo **`.logs`**). Under it, each day is a folder **`YYYY-MM-DD/`** with fixed NDJSON filenames inside.
- The directory name is **`.logs`** (with a trailing **`s`**). Searching the repo for the substring `.log` will also match `.logs`. A leftover **`.log/`** folder from an older layout is not used by current servers and can be removed locally.

```
.logs/
  2026-04-07/
    system.ndjson
    http-api.ndjson
    errors-api.ndjson
    notification.ndjson
    http-notification.ndjson
    errors-notification.ndjson
```

- **`http-api.ndjson`**: one line per REST request (`event: http_request`).
- **`http-notification.ndjson`**: one line per HTTP request (health, Socket.IO engine, etc.).
- Admins browse via **`GET /api/admin/system-logs`** using paths like `2026-04-07/system.ndjson`. See [`docs/en/admin.md`](../admin.md).

### Error-only logs (for metrics)

| File (inside each day folder) | Contents |
|-------------------------------|----------|
| `errors-api.ndjson` | REST API: `request_error`, `http_5xx`, process errors, `bootstrap_fatal` |
| `errors-notification.ndjson` | Notification server: process errors, `socket_handler_error`, etc. |

Typical fields: `time`, `service`, `event`, `level`, `reqId`, `method`, `path`, `statusCode`, `userId`, `errorName`, `errorMessage`, `errorStack` (truncated when very long).

---

## REST API overview

All routes below are under the **`/api`** prefix unless noted. Methods, bodies, and permissions are defined in each `*.routes.ts` and controller.

### Health

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/health` | none |

### Auth `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/config` | Public auth config for login/signup UI (no auth) |
| `POST` | `/auth/signup` | Sign up (`setupToken` only for first `SUPER_ADMIN`) |
| `POST` | `/auth/login` | Log in (`body.mode`: `auto` \| `local` \| `ldap` for LDAP vs local) |
| `POST` | `/auth/refresh` | Refresh tokens (rotation) |
| `POST` | `/auth/logout` | Log out current device |
| `POST` | `/auth/logout/all` | Log out all devices (Bearer) |

### Users `/api/users`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/me` | Current profile |
| `POST` / `DELETE` | `/users/me/avatar` | Upload / remove avatar |

### Projects `/api/projects`

List, detail, update, delete; invite members; project-level task list; **favorites** (`/projects/favorites`, `/:projectId/favorite`, etc.).

### Teams `/api/teams`

Team CRUD; members & leader delegation; banner image; **favorites**; search/filter on `GET /teams`.

### Team posts `/api/teams/:teamId/posts`

Post CRUD; pin toggle; create/delete comments.

### Workspaces `/api/workspaces`

Workspace fetch; **status** and **priority** CRUD; **task** CRUD and `tasks/reorder`; task **comments, attachments, notes**; task-request flows tied to `GET /workspaces/:workspaceId/task-requests`.

### Task requests `/api/...`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/projects/:projectId/task-requests` | Create request |
| `GET` | `/workspaces/:workspaceId/task-requests` | List incoming requests |
| `POST` | `/task-requests/:requestId/accept` | Accept |
| `POST` | `/task-requests/:requestId/reject` | Reject |

### Notifications (HTTP) `/api/notifications`

List; mark one or all as read. Live updates use the Socket.IO server.

### Upload `/api/upload`

Authenticated file upload (`UPLOAD_STORAGE` controls backend storage).

### Admin `/api/admin` (`SUPER_ADMIN`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | List users |
| `POST` | `/admin/users` | Create user |
| `GET` | `/admin/users/:userId` | User detail |
| `PATCH` | `/admin/users/:userId` | Update user |
| `PATCH` | `/admin/users/:userId/role` | Change system role |
| `GET` | `/admin/auth-settings` | Read auth settings (signup, LDAP, etc.) |
| `PATCH` | `/admin/auth-settings` | Update auth settings |
| `POST` | `/admin/auth-settings/ldap-test` | Test LDAP credentials |
| `GET` | `/admin/smtp` | Read SMTP config |
| `PATCH` | `/admin/smtp` | Update SMTP config |
| `POST` | `/admin/smtp/test` | Send test email |
| `GET` | `/admin/system-logs` | List/read NDJSON system logs |

For UI and ops notes, see [`docs/en/admin.md`](../admin.md).

---

## Data model notes

### Public ID format

- **Team**: `t-xxxxxxxx`
- **Project**: `prj-xxxxxxxx`
- **Workspace**: `ws-xxxxxxxx`

`xxxxxxxx` is eight alphanumeric characters.

### `TeamMember` primary key

`TeamMember` uses the **composite primary key `(teamId, userId)`** (no separate `id`).

### Auto-created workspaces

When a project is created, `Workspace(projectId, userId)` rows are created in a transaction for the creator and linked team members (`@@unique([projectId, userId])`).

---

## Auth flow

```
[Client]                           [Server]                  [Redis]

  signup/login ────────────────► password check
                                  issue Access Token (1d)
                                  issue Refresh Token (15d) ──► store rt:{userId}:{jti}
               ◄────────────────  return both tokens

  API request
  Authorization: Bearer <accessToken> ─► verify JWT + expiry
                                         set request.userId
               ◄────────────────  response

  Refresh
  { refreshToken } ────────────► verify jti in Redis
                                  delete old (rotation)    ──► remove old jti
                                  issue new pair           ──► store new jti
               ◄────────────────  new access + refresh

  Logout
  { refreshToken } ────────────►                          ──► delete jti
               ◄────────────────  204 No Content
```

> **Refresh rotation:** reusing a consumed refresh token yields 401 because the jti is gone from Redis.

---

## RBAC

### System roles (`SystemRole`)

| Role | Description | Scope |
|------|-------------|--------|
| `SUPER_ADMIN` | Platform admin | Broad access including admin APIs |
| `USER` | Normal user | Own / member resources |

### Project roles (`ProjectRole`)

| Role | Description | Typical permissions |
|------|-------------|---------------------|
| `LEADER` | Project lead | Members, settings, tasks |
| `DEPUTY_LEADER` | Deputy | Invite members, tasks |
| `MEMBER` | Member | Assigned work |

### Middleware example

```typescript
app.get("/admin/users", {
  preHandler: [authenticateUser, authenticateAdmin],
}, handler);

app.post("/projects/:projectId/members", {
  preHandler: [authenticateUser, authenticateProjectManager],
}, handler);
```

---

## Bootstrap SUPER_ADMIN

When the database has **no users**, the API server logs a **setup token** on startup.

```
──────────────────────────────────────────────────────────
⚠️  INITIAL SETUP MODE
   SETUP TOKEN : a3f9c21b04e87d65
──────────────────────────────────────────────────────────
```

Include `setupToken` in the signup body to create that account as `SUPER_ADMIN`.

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "strongpassword",
    "setupToken": "a3f9c21b04e87d65"
  }'
```

- Token is kept in memory; it changes on restart.
- After the first `SUPER_ADMIN` exists, this mode is disabled.

---

## Production builds

### Compile API server

```bash
pnpm --filter @repo/api-server build
# output: apps/server/apiServer/dist/
```

### Compile notification server

```bash
pnpm --filter @repo/notification-server build
# output: apps/server/notificationServer/dist/
```

### Docker (root production compose)

```bash
cp env.production.example .env.production
# edit secrets, CORS, DB passwords, etc.

pnpm docker:prod:up
```

`docker-compose.prod.yml` currently ships **PostgreSQL + Redis + API server**. If the notification server is not in that stack, run `notification-server` on the host or another process and point the web app’s `NEXT_PUBLIC_NOTIFICATION_URL` at it.

`apps/server/apiServer/Dockerfile` uses a multi-stage build.
