# Web — `apps/web`

Next.js 16 (App Router) web app. It talks to the REST API (`@repo/api-server`) and connects to `notificationServer` for **Socket.IO** notifications.

## Table of contents

- [Tech stack](#tech-stack)
- [Directory layout](#directory-layout)
- [Admin console & auth UI](#admin-console--auth-ui)
- [Environment variables](#environment-variables)
- [Development server](#development-server)
- [UI organization](#ui-organization)
- [Real-time notifications](#real-time-notifications)
- [Static export (Electron)](#static-export-electron)
- [Production build](#production-build)
- [Troubleshooting](#troubleshooting)

---

## Tech stack

| Item | Version |
|------|---------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS |
| Shared packages | `@repo/ui`, `@repo/types`, `@repo/i18n`, `@repo/docs` |
| Compiler | React Compiler (`reactCompiler: true`) — automatic memoization; manual `useMemo` / `useCallback` are usually unnecessary |
| Rich text, etc. | TipTap, react-markdown (used in domain screens) |
| Real-time | socket.io-client |

---

## Directory layout

```
apps/web/src/
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/                  # Sign-in (local / LDAP tabs, etc.)
│   ├── signup/                 # Public signup (or disabled message)
│   ├── account-suspended/      # Suspended-account message
│   ├── (main)/                 # Main shell after login
│   │   ├── page.tsx            # Home
│   │   ├── teams/, projects/, mywork/   # mywork/performance
│   │   ├── notification/, settings/, trash/, workspace/
│   │   └── pages/              # Static page group
│   ├── (admin)/admin/          # SUPER_ADMIN — users, performance, email, security, system logs
│   └── docx/                   # Other routes
├── components/                 # App-only components & client widgets
└── ...
```

Routes with dynamic segments (`[id]`) may need `generateStaticParams` in `layout.tsx` (or `page.tsx`) for the Electron static build.

---

## Admin console & auth UI

- **`SUPER_ADMIN`** pages live under `(admin)/admin`. LDAP, public signup, SMTP, system logs, and org-wide performance are summarized in **[Admin, security, ops](../admin.md)**.
- Login and signup UIs load public options from **`GET /api/auth/config`**.

---

## Environment variables

Managed from the repo root **`.env`**. `next.config.ts` loads the root `.env` at build and run time.

| Key | Description | Example |
|-----|-------------|---------|
| `NEXT_PUBLIC_API_URL` | REST API base URL | `http://localhost:4000` |
| `NEXT_PUBLIC_NOTIFICATION_URL` | Socket.IO notification server | `http://localhost:4001` |
| `NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB` | Client-side upload cap (keep in sync with server) | `50` |

> Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## Development server

Full stack from the monorepo root:

```bash
pnpm dev
```

Web only:

```bash
pnpm dev:web
# or
pnpm --filter web dev
```

Default URL: http://localhost:3000

For notification UI, run the notification server as well (`pnpm dev` or `pnpm dev:notification`).

---

## UI organization

- **`packages/ui`**: shared UI used across screens.
- **`apps/web/src/components`**: larger panels, tabs, and web-only client widgets.
- **`apps/web/src/app`**: routing, layouts, Server Actions, and server components.

The desktop app loads the static web build in production; keep shared UI conventions aligned with `@repo/ui` when possible.

---

## Real-time notifications

The client connects to the Socket.IO endpoint at `NEXT_PUBLIC_NOTIFICATION_URL`, passing an **access JWT** on connect. The server targets the `user:{userId}` room. Server details: [Server docs — Notification server (Socket.IO)](../server/README.md#notification-server-socketio).

---

## Static export (Electron)

```bash
pnpm --filter web build:static
# or
# Windows: set ELECTRON_STATIC=1 && pnpm --filter web build
# macOS/Linux: ELECTRON_STATIC=1 pnpm --filter web build
```

Output: `apps/web/out/`

> Static export limits server-only Next features. Dynamic routes such as `[id]` need `generateStaticParams`.

---

## Production build

Next in server mode:

```bash
pnpm --filter web build
pnpm --filter web start
```

From the monorepo root:

```bash
pnpm build
pnpm start
```

`pnpm start` runs web, API, and notification servers together; you can split processes for your deployment.

---

## Troubleshooting

**Static build fails: missing `generateStaticParams`**

Often happens on dynamic segment pages when using `ELECTRON_STATIC=1` / `build:static`.

```typescript
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}
```

**Env vars not visible in the browser**

Check the root `.env` for the `NEXT_PUBLIC_` prefix.

**Notifications not updating live**

Confirm `notificationServer` is running, `NEXT_PUBLIC_NOTIFICATION_URL` is correct, and `CORS_ORIGIN` includes the web origin.
