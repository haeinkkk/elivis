<p align="center">
  <img src="docs/assets/readme/logo.png" alt="Elivis 로고" width="140" />
</p>

<h1 align="center">Elivis</h1>

<p align="center">
  <strong>실사용에 맞춘 팀·프로젝트·업무 관리</strong><br />
  웹과 데스크톱에서 같은 UI로 쓰고, 직접 서버에 올려 운영하는 <strong>셀프 호스팅</strong>을 전제로 두었습니다.
</p>

<p align="center">
  <a href="#라이선스"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" /></a>
  <a href="https://github.com/haeinkkk/elivis"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" /></a>
  <a href="docs/README.md"><img src="https://img.shields.io/badge/docs-한국어-333333.svg" alt="Docs KO" /></a>
  <a href="docs/en/README.md"><img src="https://img.shields.io/badge/docs-English-333333.svg" alt="Docs EN" /></a>
</p>

<p align="center">
  English: <a href="README.en.md"><strong>README.en.md</strong></a> · <a href="docs/en/README.md"><strong>Documentation</strong></a>
</p>

### Made by

만든 사람 · 업데이트 소식은 여기서도 확인해 주세요.

[![Instagram](https://img.shields.io/badge/Instagram-%40hi.kimsunim-E4405F?logo=instagram&logoColor=white)](https://www.instagram.com/hi.kimsunim/)
[![Threads](https://img.shields.io/badge/Threads-%40hi.kimsunim-000000?logo=threads&logoColor=white)](https://www.threads.com/@hi.kimsunim)

---

## 목차

- [스크린샷](#스크린샷)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [사전 요구 사항](#사전-요구-사항)
- [빠른 시작](#빠른-시작)
- [사용 방법](#사용-방법)
- [자주 쓰는 명령](#자주-쓰는-명령)
- [프로젝트 구조](#프로젝트-구조)
- [문서](#문서)
- [기여](#기여)
- [라이선스](#라이선스)

---

## 스크린샷

<p align="center">
  <img src="docs/assets/readme/screen1.png" alt="Elivis 앱 화면 1" width="780" />
</p>
<p align="center">
  <img src="docs/assets/readme/screen2.png" alt="Elivis 앱 화면 2" width="780" />
</p>

---

## 주요 기능

- **팀**을 만들고 멤버를 초대하며, 팀 단위 **게시판(커뮤니티)** 으로 소통할 수 있습니다.
- **프로젝트**를 만들고 멤버·역할을 관리하고, 사람마다 **개인 워크스페이스(내 업무 보드)** 가 생깁니다.
- 팀원은 **개인 워크스페이스**에 업무를 기록하고 작성하고 관리합니다.
- 업무에 **상태·우선순위**, 댓글·첨부·노트, **업무 요청(수락/거절)** 을 둘 수 있습니다.
- 팀장은 업무 과도화 지수를 보며 팀원들의 일을 분배할 수 있습니다.
- 다국어도 지원합니다! (한국어/영어/일본어)

아키텍처·API·빌드 옵션 등은 **[`docs/`](docs/README.md)** (한국어) 를 참고하세요.

---

## 기술 스택

| 구분      | 기술                               |
| --------- | ---------------------------------- |
| 모노레포  | pnpm workspaces, Turborepo         |
| 웹        | Next.js 16, React 19, Tailwind CSS |
| 데스크톱  | Electron 41                        |
| API       | Fastify 5, Node.js 24+             |
| 알림 서버 | Socket.IO, Redis Pub/Sub           |
| DB        | PostgreSQL 16, Prisma 6            |
| 캐시·세션 | Redis 7                            |
| 인증      | JWT(Access / Refresh) + RBAC       |

---

## 사전 요구 사항

| 도구           | 버전                                       |
| -------------- | ------------------------------------------ |
| Node.js        | 24.14.0 이상 (`package.json` engines 참고) |
| pnpm           | 9.x (`corepack enable` 권장)               |
| Docker Desktop | 최신 (로컬 PostgreSQL·Redis용)             |

---

## 빠른 시작

**1. 설치 전 필수 준비**

```bash
git clone https://github.com/haeinkkk/elivis.git
cd elivis
```

- **도구** — 위 **사전 요구 사항**(Node.js, pnpm, Docker)을 갖춥니다.
- **환경 변수**

```bash
# macOS / Linux
cp env.example .env

# Windows (PowerShell)
Copy-Item env.example .env
```

`.env`에서 `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`을 충분히 긴 무작위 값으로 바꿉니다. (`openssl rand -hex 32`)

- **Docker** — 셋업 실행 전에 Docker Desktop(또는 Docker Engine)을 **켜 둡니다.**

**2. 셋업 (한 번에)**

`pnpm setup`만 입력하면 pnpm **내장 명령**이 실행됩니다.

| OS                | 권장 명령            |
| ----------------- | -------------------- |
| **macOS / Linux** | `pnpm run setup:mac` |
| **Windows**       | `pnpm run setup:win` |

`pnpm install` → Docker로 Postgres·Redis 기동 → Prisma 마이그레이션까지 한 번에 진행됩니다.

**3. 개발 서버**

```bash
pnpm dev
```

| 서비스           | 주소                                                               |
| ---------------- | ------------------------------------------------------------------ |
| 웹               | http://localhost:3000                                              |
| REST API         | http://localhost:4000                                              |
| 알림 (Socket.IO) | http://localhost:4001 (웹은 `NEXT_PUBLIC_NOTIFICATION_URL`로 연결) |
| 데스크톱         | Electron 창 (`pnpm dev` 시 웹 준비 후 기동)                        |

---

## 사용 방법

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

| 명령                                                                              | 설명                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `pnpm run setup`                                                                  | 설치 + Docker(DB·Redis) + Prisma 마이그레이션   |
| `pnpm run setup:mac`                                                              | 위와 동일 (macOS·Linux, `bash` 필요)            |
| `pnpm run setup:win`                                                              | 위와 동일 (Windows PowerShell)                  |
| `pnpm --filter @repo/database db:setup`                                           | (DB만) Prisma generate + migrate dev            |
| `pnpm --filter @repo/database db:migrate`                                         | migrate dev만 (대화형)                          |
| `pnpm db:deploy`                                                                  | migrate deploy + generate (배포용)              |
| `pnpm dev`                                                                        | 웹·API·알림·데스크톱 등 개발 모드 병렬 실행     |
| `pnpm dev:web` / `pnpm dev:server` / `pnpm dev:notification` / `pnpm dev:desktop` | 앱 단독 실행                                    |
| `pnpm build`                                                                      | 패키지 전체 빌드                                |
| `pnpm build:desktop`                                                              | 웹 정적 빌드 포함 Electron 인스톨러 생성        |
| `pnpm start`                                                                      | 빌드 후 웹·API·알림 서버 동시 기동 (프로덕션형) |
| `pnpm db:studio`                                                                  | Prisma Studio                                   |
| `pnpm docker:dev:*` / `pnpm docker:prod:*`                                        | 개발·프로덕션 Docker 제어                       |

---

## 프로젝트 구조

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

## 문서

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
