# Elivis

> 간단하고 쓸만한 것들만 모아놓은 프로젝트 매니징 앱

복잡한 기능보다 **실제로 쓰는 기능**만 담았습니다.  
팀 프로젝트를 만들고, 멤버를 초대하고, 업무를 나누는 것 — 그게 전부입니다.

웹 브라우저에서도, 데스크톱 앱으로도 동일한 화면으로 사용할 수 있으며,  
직접 서버에 올려 운영하는 **셀프 호스팅**을 기본으로 설계했습니다.

---

**Web** · **Desktop** · **API Server** 세 앱이 하나의 모노레포에서 코드를 공유합니다.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 16, React 19, Tailwind CSS |
| Desktop | Electron 41 |
| API | Fastify 5, Node.js 24 |
| Database | PostgreSQL 16 + Prisma 6 |
| Cache / Auth Store | Redis 7 |
| Auth | JWT (Access 1d / Refresh 15d) + RBAC |
| Language | TypeScript |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 24.14.0+ |
| pnpm | 9.x (`corepack enable`) |
| Docker Desktop | latest |

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/your-org/elivis.git
cd elivis
```

### 2. Configure environment

```bash
# macOS / Linux
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

Open `.env` and set your secrets:

```env
JWT_ACCESS_SECRET=<random-32-char-string>
JWT_REFRESH_SECRET=<random-32-char-string>
```

> Generate a secret: `openssl rand -hex 32`

### 3. One-command setup

```bash
pnpm setup
```

This runs in order:

1. `pnpm install` — install all dependencies
2. `docker compose up -d --wait` — start PostgreSQL + Redis (waits for healthcheck)
3. `prisma migrate dev` — apply database migrations

### 4. Start development servers

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Desktop | Electron window (opens when web is ready) |

---

## First Admin Account

When the server starts with an **empty database**, it prints a one-time setup token in the terminal.  
Use that token in the signup request to create the first `SUPER_ADMIN` account.

```
⚠️  INITIAL SETUP MODE
   SETUP TOKEN : a3f9c21b04e87d65
```

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "strongpassword",
    "setupToken": "a3f9c21b04e87d65"
  }'
```

→ See [`docs/server/README.md`](docs/server/README.md#초기-관리자-생성) for details.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm setup` | Full environment setup (install → docker → migrate) |
| `pnpm dev` | Start all apps in parallel |
| `pnpm dev:web` | Start web only |
| `pnpm dev:server` | Start API server only |
| `pnpm dev:desktop` | Start Electron only |
| `pnpm build` | Build all packages |
| `pnpm build:desktop` | Build Electron installer |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm type-check` | TypeScript type-check across all packages |
| `pnpm docker:dev:up` | Start Docker services (dev) |
| `pnpm docker:dev:down` | Stop Docker services (dev) |
| `pnpm docker:prod:up` | Start all services in production mode |

---

## Project Structure

```
.
├── apps/
│   ├── web/          # Next.js web app
│   ├── desktop/      # Electron desktop client
│   └── server/       # Fastify REST API
├── packages/
│   ├── database/     # Prisma schema + client singleton
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared UI components
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── web/          # Web app documentation
│   ├── server/       # API server documentation
│   └── desktop/      # Desktop app documentation
├── scripts/
│   └── setup.mjs     # One-command setup script
├── docker-compose.yml
├── docker-compose.prod.yml
└── env.example
```

---

## Documentation

Detailed documentation for each application lives in `docs/`:

| App | Link |
|---|---|
| API Server | [`docs/server/README.md`](docs/server/README.md) |
| Web App | [`docs/web/README.md`](docs/web/README.md) |
| Desktop App | [`docs/desktop/README.md`](docs/desktop/README.md) |

---

## Production Deployment

```bash
# Copy and configure production environment
cp env.production.example .env.production
# → edit .env.production with real secrets

# Build and start all production containers
pnpm docker:prod:up
```

→ See [`docs/server/README.md`](docs/server/README.md#프로덕션-빌드) for full production guide.

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
