# Admin console, security, and operations

This page describes **`SUPER_ADMIN`** features under **`/admin/*`**, plus related APIs and configuration. For general app routing, see [Web docs](./web/README.md).

## Contents

- [Access](#access)
- [Admin UI routes](#admin-ui-routes)
- [Auth & public signup](#auth--public-signup)
- [LDAP sign-in](#ldap-sign-in)
- [Email (SMTP)](#email-smtp)
- [System logs](#system-logs)
- [Performance dashboard](#performance-dashboard)
- [Account suspended UI](#account-suspended-ui)
- [Related REST APIs](#related-rest-apis)
- [Environment variables vs DB](#environment-variables-vs-db)

---

## Access

- Only **`SUPER_ADMIN`** can use admin APIs and `/admin` pages.
- The first `SUPER_ADMIN` is created via **`/api/auth/signup`** with the **setup token** printed when the DB has no users. See [Server docs — Bootstrap SUPER_ADMIN](./server/README.md#bootstrap-super_admin).

---

## Admin UI routes

| Path | Description |
|------|-------------|
| `/admin` | Admin home |
| `/admin/users`, `/admin/users/[id]` | User list, detail, role, status, etc. |
| `/admin/performance` | Org-wide performance (team metrics, timeline) |
| `/admin/email` | **Legacy redirect** → `/admin/settings/email` |
| `/admin/settings/email` | SMTP host, port, sender, etc. |
| `/admin/security/public-signup` | Enable/disable public self-service signup |
| `/admin/security/ldap` | LDAP toggle, URL, bind, search base, etc. |
| `/admin/system-logs` | Browse NDJSON system logs from API/notification servers |

The admin shell uses **`AdminSidebar`** / **`AdminHeader`** from `@repo/ui`.

---

## Auth & public signup

- **First user**: signup with the setup token creates `SUPER_ADMIN`.
- **After that**: public signup is allowed only if **`AuthSettings`** enables it. Configure under **Admin › Security › Public signup**.
- Login and signup UIs read **`GET /api/auth/config`** (no auth) for tabs and links.

---

## LDAP sign-in

- Configure under **Admin › Security › LDAP**.
- **`POST /api/auth/login`** accepts `mode`: `"ldap"` | `"local"` | `"auto"` to match dedicated tabs and auto-detection.
- First successful LDAP sign-in may **provision** a user (`authProvider: LDAP`). Local password users are guided to the correct tab via error messages.
- Admins can run **`POST /api/admin/auth-settings/ldap-test`** with test credentials.

Root **`.env`** `LDAP_*` / `PUBLIC_SIGNUP_*` values **seed `AuthSettings` only when that row is first created**. After that, the DB and admin UI win. See comments in `env.example`.

---

## Email (SMTP)

- Configure and test under **`/admin/settings/email`**.
- APIs: `GET` / `PATCH` **`/api/admin/smtp`**, **`POST /api/admin/smtp/test`** (all `SUPER_ADMIN`).

---

## System logs

- Services append **NDJSON** lines under a daily folder. The default root is the monorepo **`.logs`** directory (`YYYY-MM-DD/*.ndjson`, including `http-api` / `http-notification` access logs).
- **Error-only** files are `errors-api.ndjson` and `errors-notification.ndjson` inside each date folder; see [Server docs — Error-only logs](./server/README.md#error-only-logs-for-metrics).
- Override with **`SYSTEM_LOG_DIR`**. In production, point this at your mounted volume path.
- **`/admin/system-logs`** selects files, filters by level, searches, and refreshes.
- API: **`GET /api/admin/system-logs`** (query params per controller implementation).

---

## Performance dashboard

- **`/admin/performance`**: team/personal workload-style metrics; selecting a team can filter the **same timeline** as **My work** (`MyWorkOverviewClient`).
- **`/mywork/performance`**: similar view scoped to the current user.

---

## Account suspended UI

- If an admin sets a user to a suspended (or equivalent) state, the web app may redirect to a dedicated route such as **`/account-suspended`**. Confirm middleware and deployment behavior in code.

---

## Related REST APIs

Examples requiring **`SUPER_ADMIN`**:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/auth-settings` | Read signup/LDAP-related settings |
| `PATCH` | `/api/admin/auth-settings` | Update settings |
| `POST` | `/api/admin/auth-settings/ldap-test` | Test LDAP bind/auth |
| `GET` | `/api/admin/smtp` | Read SMTP config |
| `PATCH` | `/api/admin/smtp` | Update SMTP config |
| `POST` | `/api/admin/smtp/test` | Send test mail |
| `GET` | `/api/admin/system-logs` | List/read log files |

Public:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/config` | Public auth config for login/signup UI |

---

## Environment variables vs DB

- **`PUBLIC_SIGNUP_ENABLED`**, **`LDAP_*`**: used only when **`AuthSettings` is first created**. Later, values live in the DB and admin UI.
- **`SYSTEM_LOG_DIR`**: optional **root** for logs; default is repo root **`.logs`** (date subfolders below).

See root **`env.example`** and **`env.production.example`** for the full list.
