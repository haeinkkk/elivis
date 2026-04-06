# Elivis

**실사용에 맞춘 팀·프로젝트·업무 관리.** 웹과 데스크톱에서 같은 UI로 쓰고, 직접 서버에 올려 운영하는 **셀프 호스팅**을 전제로 두었습니다.

> English readers: **[README.en.md](README.en.md)** · **[Documentation (English)](docs/en/README.md)**

자세한 아키텍처·API·빌드 옵션은 **[`docs/`](docs/README.md)** (한국어) 를 참고하세요.

### Made by

[![Instagram](https://img.shields.io/badge/Instagram-%40hi.kimsunim-E4405F?logo=instagram&logoColor=white)](https://www.instagram.com/hi.kimsunim/)
[![Threads](https://img.shields.io/badge/Threads-%40hi.kimsunim-000000?logo=threads&logoColor=white)](https://www.threads.com/@hi.kimsunim)

---

## 무엇을 하나요

- **팀**을 만들고 멤버를 초대하며, 팀 단위 **게시판(커뮤니티)** 으로 소통할 수 있습니다.
- **프로젝트**를 만들고 멤버·역할을 관리하고, 사람마다 **워크스페이스(내 업무 보드)** 가 생깁니다.
- 업무에 **상태·우선순위**, 댓글·첨부·노트, **업무 요청(수락/거절)** 을 둘 수 있습니다.
- **알림**은 REST로 조회·읽음 처리하고, 실시간 갱신은 **Socket.IO** 알림 서버가 담당합니다.
- 비어 있는 DB로 API를 처음 띄우면 터미널에 **초기 관리자용 setup 토큰**이 한 번 출력됩니다.

---

## 기술 스택 (요약)

| 구분 | 기술 |
|------|------|
| 모노레포 | pnpm workspaces, Turborepo |
| 웹 | Next.js 16, React 19, Tailwind CSS |
| 데스크톱 | Electron 41 |
| API | Fastify 5, Node.js 24+ |
| 알림 서버 | Socket.IO, Redis Pub/Sub |
| DB | PostgreSQL 16, Prisma 6 |
| 캐시·세션 | Redis 7 |
| 인증 | JWT(Access / Refresh) + RBAC |

---

## 필요한 것

| 도구 | 버전 |
|------|------|
| Node.js | 24.14.0 이상 (`package.json` engines 참고) |
| pnpm | 9.x (`corepack enable` 권장) |
| Docker Desktop | 최신 (로컬 PostgreSQL·Redis용) |

---

## 빠른 시작

```bash
git clone https://github.com/haeinkkk/elivis.git
cd elivis
```

**1. 환경 변수**

```bash
# macOS / Linux
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

`.env`에서 `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`을 충분히 긴 무작위 값으로 바꿉니다. (`openssl rand -hex 32`)

**2. `pnpm install` 다음에 꼭 할 일**

맞습니다. **의존성 설치만으로는 DB에 테이블이 생기지 않습니다.**

| 해야 할 일 | 설명 |
|------------|------|
| **DB·Redis 띄우기** | `pnpm install`은 Node 패키지만 설치합니다. PostgreSQL·Redis **서버**는 Docker 등으로 따로 기동해야 `DATABASE_URL` / `REDIS_URL`에 연결됩니다. |
| **Prisma 마이그레이션** | `@repo/database` 설치 시 `postinstall`로 `prisma generate`는 돌아갈 수 있지만, **`prisma migrate dev`는 자동으로 안 돕니다.** 마이그레이션을 실행해야 스키마(테이블)가 DB에 반영됩니다. |

이미 `pnpm install`만 해 둔 상태라면 순서는 다음과 같습니다.

```bash
docker compose up -d --wait
pnpm --filter @repo/database db:setup
```

`db:setup`은 `prisma generate` 후 `prisma migrate dev`와 같습니다. 그다음 **5. 개발 서버**의 `pnpm dev`를 실행하면 됩니다.

**3. 한 번에 셋업 (패키지 + Postgres·Redis + Prisma 마이그레이션)**

의존성 설치, Docker로 DB·Redis 기동, `prisma generate` + `migrate dev`까지 **한 번에** 합니다.  
실행 전에 **Docker Desktop(또는 Docker Engine)이 켜져 있어야** 합니다.

| OS | 권장 명령 |
|----|-----------|
| **macOS / Linux** | `pnpm run setup:mac` |
| **Windows** | `pnpm run setup:win` |
| **공통** | `pnpm run setup` |

- macOS에서 직접 셸만 쓸 때: `chmod +x scripts/setup-mac.sh` 후 `./scripts/setup-mac.sh`
- Windows에서 스크립트만 실행할 때: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`

`pnpm setup`만 입력하면 pnpm 전역 설치용 내장 명령이 실행되므로, 이 저장소 셋업에는 반드시 **`pnpm run setup`** 또는 위 OS별 명령을 쓰세요.

`scripts/setup.mjs`가 하는 일:

- 사전 점검: `pnpm`, Docker 데몬, `docker compose`(없으면 `docker-compose`) 확인 — 실패 시 macOS·Windows 안내
- `.env` 없으면 `env.example` 복사
- `pnpm install` → `docker compose up -d --wait`(또는 구형 `docker-compose up -d` + Postgres 준비 대기)
- `pnpm --filter @repo/database db:setup`

위는 **2번에서 수동으로 하던 것과 같은 결과**입니다.

**4. 데이터베이스 셋업 (상세·반복 시)**

- **연결 정보**  
  루트 `.env`의 `DATABASE_URL`, `REDIS_URL`이 실제로 뜬 DB·Redis와 같아야 합니다. 개발용 Docker를 쓰면 `env.example` 기본값(`postgresql://elivis:elivis@localhost:5432/elivis`, `redis://localhost:6379`)이 `docker-compose.yml`의 Postgres·Redis와 맞습니다.

- **컨테이너 기동** (아직 안 떠 있다면)

```bash
docker compose up -d --wait
```

- **스키마 반영 (Prisma 클라이언트 생성 + 마이그레이션)**  
  `@repo/database`는 루트 `.env`를 `dotenv-cli`로 읽습니다.

```bash
pnpm --filter @repo/database db:setup
```

위는 `prisma generate` 후 `prisma migrate dev`와 같습니다. 이미 DB가 있고 마이그레이션만 다시 적용·대화형 이름을 붙이고 싶을 때는 `pnpm --filter @repo/database db:migrate`만 써도 됩니다.

- **배포 환경**에 스키마만 맞출 때는 루트에서 `pnpm db:deploy` (`migrate deploy` + `generate`).

- **데이터 확인·편집**은 `pnpm db:studio`(Prisma Studio).

**5. 개발 서버**

```bash
pnpm dev
```

| 서비스 | 주소 |
|--------|------|
| 웹 | http://localhost:3000 |
| REST API | http://localhost:4000 |
| 알림 (Socket.IO) | http://localhost:4001 (웹은 `NEXT_PUBLIC_NOTIFICATION_URL`로 연결) |
| 데스크톱 | Electron 창 (`pnpm dev` 시 웹 준비 후 기동) |

---

## 사용 방법 (앱 관점)

1. **첫 계정**  
   DB에 사용자가 없을 때만 API 서버 로그에 `SETUP TOKEN`이 출력됩니다. 그때는 회원가입 요청에 `setupToken`을 넣어 **SUPER_ADMIN**을 만듭니다. 이후 일반 사용자는 토큰 없이 가입·초대 흐름을 따릅니다. ([상세: `docs/server/README.md` — 초기 관리자](docs/server/README.md#초기-관리자-생성))

2. **브라우저에서 쓰기**  
   http://localhost:3000 에서 로그인합니다. 팀·프로젝트·내 업무·알림·설정 등은 App Router 경로로 구성되어 있습니다. (구조: [`docs/web/README.md`](docs/web/README.md))

3. **데스크톱에서 쓰기**  
   개발 시에는 웹(`3000`)이 떠 있는 상태에서 `pnpm dev`로 Electron이 같이 뜹니다. 설치 파일을 만들려면 웹 정적 빌드 후 데스크톱 패키징 순서를 따릅니다. ([`docs/desktop/README.md`](docs/desktop/README.md))

4. **관리자**  
   `SUPER_ADMIN`은 관리 화면에서 사용자·역할을 다룹니다. ([API: `docs/server/README.md`](docs/server/README.md))

5. **프로덕션**  
   `.env.production` 준비 후 Docker 프로덕션 컴포즈로 기동하는 흐름은 [`docs/server/README.md` — 프로덕션](docs/server/README.md#프로덕션-빌드)을 참고하세요.

---

## 자주 쓰는 명령

| 명령 | 설명 |
|------|------|
| `pnpm run setup` | 설치 + Docker(DB·Redis) + Prisma 마이그레이션 |
| `pnpm run setup:mac` | 위와 동일 (macOS·Linux, `bash` 필요) |
| `pnpm run setup:win` | 위와 동일 (Windows PowerShell) |
| `pnpm --filter @repo/database db:setup` | (DB만) Prisma generate + migrate dev |
| `pnpm --filter @repo/database db:migrate` | migrate dev만 (대화형) |
| `pnpm db:deploy` | migrate deploy + generate (배포용) |
| `pnpm dev` | 웹·API·알림·데스크톱 등 개발 모드 병렬 실행 |
| `pnpm dev:web` / `pnpm dev:server` / `pnpm dev:notification` / `pnpm dev:desktop` | 앱 단독 실행 |
| `pnpm build` | 패키지 전체 빌드 |
| `pnpm build:desktop` | 웹 정적 빌드 포함 Electron 인스톨러 생성 |
| `pnpm start` | 빌드 후 웹·API·알림 서버 동시 기동 (프로덕션형) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm docker:dev:*` / `pnpm docker:prod:*` | 개발·프로덕션 Docker 제어 |

---

## 저장소 구조 (요약)

```
apps/
  web/                 # Next.js
  desktop/             # Electron
  server/
    apiServer/         # REST API
    notificationServer/ # Socket.IO + Redis
packages/
  database/            # Prisma
  ui/, types/, i18n/   # 공유 패키지
docs/                  # 상세 문서 (앱별 README)
```

---

## 문서 목록

**한국어:** [문서 인덱스](docs/README.md) · [서버](docs/server/README.md) · [웹](docs/web/README.md) · [데스크톱](docs/desktop/README.md)

**English:** [Docs index](docs/en/README.md) · [Server](docs/en/server/README.md) · [Web](docs/en/web/README.md) · [Desktop](docs/en/desktop/README.md)

---

## 기여

이슈와 PR을 환영합니다. 큰 변경은 먼저 이슈로 방향을 맞추면 좋습니다.

1. Fork 후 브랜치 생성  
2. 커밋 후 Push  
3. Pull Request

---

## 라이선스

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
