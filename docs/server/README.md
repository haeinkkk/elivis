# 서버 — `apps/server`

Elivis 백엔드는 **REST API**와 **실시간 알림 서버**로 나뉩니다.

| 앱 | 경로 | 역할 |
|----|------|------|
| API Server | `apps/server/apiServer` | Fastify REST, JWT·RBAC, 업로드, 비즈니스 로직 |
| Notification Server | `apps/server/notificationServer` | Socket.IO, Redis 구독으로 클라이언트에 알림 푸시 |

> 상세 엔드포인트는 코드가 기준입니다. 라우트 정의: `apps/server/apiServer/src/routes/*.routes.ts`

## 목차

- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [환경 변수](#환경-변수)
- [개발 서버 실행](#개발-서버-실행)
- [알림 서버 (Socket.IO)](#알림-서버-socketio)
- [시스템 로그 파일](#시스템-로그-파일)
- [REST API 개요](#rest-api-개요)
- [데이터 모델 메모](#데이터-모델-메모)
- [인증 흐름](#인증-흐름)
- [권한 시스템(RBAC)](#권한-시스템rbac)
- [초기 관리자 생성](#초기-관리자-생성)
- [프로덕션 빌드](#프로덕션-빌드)

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Runtime | Node.js 24+ |
| API 프레임워크 | Fastify 5 |
| ORM | Prisma 6 + PostgreSQL 16 |
| 캐시 / Refresh 저장 | Redis 7 (ioredis) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| 실시간 | Socket.IO 4 (`notificationServer`) |

---

## 디렉토리 구조

```
apps/server/
├── apiServer/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/           # REST 라우트 모음
│   │   ├── middleware/       # auth, language 등
│   │   ├── plugins/          # prisma, redis
│   │   ├── services/
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json          # @repo/api-server
└── notificationServer/
    ├── src/
    │   ├── socket.ts         # Socket.IO + JWT 핸드셰이크
    │   ├── redis.ts          # Pub/Sub → 소켓 브로드캐스트
    │   └── index.ts
    └── package.json          # @repo/notification-server
```

---

## 환경 변수

모노레포 **루트 `.env`** 한 파일로 통합합니다. `env.example`을 복사해 사용하세요.

### 공통·API

| 키 | 설명 |
|----|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `REDIS_URL` | Redis 연결 문자열 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT 서명용 비밀값 (충분한 길이) |
| `API_PORT` / `API_HOST` | REST API 바인딩 (기본 `4000`, `0.0.0.0`) |
| `CORS_ORIGIN` | 허용 Origin (쉼표 구분). API·Socket.IO CORS에 사용 |
| `UPLOAD_STORAGE` | `local` 또는 `s3` |
| `UPLOAD_MAX_FILE_SIZE_MB` | 업로드 상한 (MB) |
| `SYSTEM_LOG_DIR` | (선택) 시스템 NDJSON 로그 **루트** 디렉터리. 미설정 시 모노레포 루트 **`.logs`** (하위에 `YYYY-MM-DD/` 생성) |

### 인증 시드 (선택, `AuthSettings` 최초 생성 시만)

`env.example`에 주석으로 있는 **`PUBLIC_SIGNUP_ENABLED`**, **`LDAP_*`** 등은 DB에 `AuthSettings` 행이 **아직 없을 때** 첫 값으로만 쓰입니다. 이후에는 관리자 UI·DB가 우선입니다. 상세는 [`docs/admin.md`](../admin.md) 참고.

### 알림 서버

| 키 | 설명 |
|----|------|
| `NOTIFICATION_PORT` / `NOTIFICATION_HOST` | 알림 HTTP/Socket 서버 (기본 `4001`, `0.0.0.0`) |

API 프로세스가 Redis 등으로 알림 이벤트를 발행하면, 알림 서버가 구독해 `user:{userId}` 룸으로 전달합니다. (채널 등 상세는 `notificationServer/src/redis.ts` 참고)

> **보안**: JWT 시크릿은 `openssl rand -hex 32` 등으로 생성하세요.

---

## 개발 서버 실행

전체(웹·API·알림·데스크톱 등)는 루트에서:

```bash
pnpm dev
```

개별 실행 예:

```bash
pnpm dev:server        # REST API만 → http://localhost:4000
pnpm dev:notification  # 알림 서버만 → http://localhost:4001
```

---

## 알림 서버 (Socket.IO)

- HTTP 루트 `GET /` 는 JSON `{ status, service }` 로 헬스 응답에 가깝게 동작합니다.
- 클라이언트는 **Access JWT**를 Socket.IO 연결 시 `auth.token` 또는 `Authorization: Bearer` 로 넘깁니다.
- 연결 후 사용자별 룸 `user:{userId}` 에 join 하며, 서버가 최근 알림 등을 내려줄 수 있습니다.

웹 클라이언트는 `NEXT_PUBLIC_NOTIFICATION_URL`(예: `http://localhost:4001`)로 접속합니다.

---

## 시스템 로그 파일

- API 서버·알림 서버가 **`SYSTEM_LOG_DIR`**(기본: 모노레포 루트 **`.logs`**) 아래에 **날짜별 폴더**를 만들고, 그 안에 NDJSON 파일을 둡니다.
- 저장소 이름은 **`.logs`**(맨 끝 `s` 포함)입니다. 코드베이스에서 문자열 `.log`만 검색하면 `.logs`가 부분 일치로 함께 검색됩니다. 로컬에 예전 **`.log/`** 폴더가 남아 있어도 현재 서버는 쓰지 않으며, 지워도 됩니다.

```
.logs/
  2026-04-07/
    system.ndjson              # Pino 기본(콘솔과 동일)
    http-api.ndjson            # REST API HTTP 요청 한 줄 요약 (`event: http_request`)
    errors-api.ndjson          # API 오류·5xx·프로세스 예외
    notification.ndjson        # 알림 서버 일반 로그
    http-notification.ndjson   # 알림 서버 HTTP 요청(헬스·Socket.IO 엔진 등)
    errors-notification.ndjson # 알림 서버 오류·소켓 핸들러 실패 등
```

- 관리자 **`GET /api/admin/system-logs`** 에서 파일 선택 시 `2026-04-07/system.ndjson` 형식의 상대 경로로 표시됩니다.

### 서버 오류 전용 로그 (메트릭 연동용)

일반 로그와 분리해 **오류만** 한 줄 JSON으로 `errors-api.ndjson` / `errors-notification.ndjson`에 씁니다. (날짜는 상위 폴더명)

| 파일 (일별 폴더 안) | 내용 |
|----------------------|------|
| `errors-api.ndjson` | REST API: `request_error`, `http_5xx`, `uncaughtException`, `unhandledRejection`, `bootstrap_fatal` |
| `errors-notification.ndjson` | 알림 서버: 프로세스 오류, `socket_handler_error` 등 |

필드 예: `time`, `service`, `event`, `level`, `reqId`, `method`, `path`, `statusCode`, `userId`, `errorName`, `errorMessage`, `errorStack`(길이 상한 후 truncate). 외부 메트릭·로그 수집기는 `errors-*.ndjson`만 tail 하면 됩니다.

---

## REST API 개요

아래는 **프리픽스 `/api`** 기준 그룹만 정리한 것입니다. HTTP 메서드·바디·권한은 각 `*.routes.ts` 와 컨트롤러를 확인하세요.

### 헬스

| Method | Path | 인증 |
|--------|------|------|
| `GET` | `/health` | 없음 |

### 인증 `/api/auth`

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/auth/config` | 공개 인증 설정 (회원가입·LDAP 등 UI용, 인증 불필요) |
| `POST` | `/auth/signup` | 회원가입 (`setupToken`은 최초 SUPER_ADMIN 전용) |
| `POST` | `/auth/login` | 로그인 (`body.mode`: `auto` \| `local` \| `ldap` — LDAP 탭·자동 판별) |
| `POST` | `/auth/refresh` | 토큰 재발급 (Rotation) |
| `POST` | `/auth/logout` | 현재 기기 로그아웃 |
| `POST` | `/auth/logout/all` | 전체 기기 로그아웃 (Bearer) |

### 사용자 `/api/users`

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/users/me` | 내 프로필 |
| `POST` / `DELETE` | `/users/me/avatar` | 아바타 업로드·삭제 |

### 프로젝트 `/api/projects`

목록·상세·수정·삭제, 멤버 초대, 프로젝트 단위 태스크 목록, **즐겨찾기** (`/projects/favorites`, `/:projectId/favorite` 등).

### 팀 `/api/teams`

팀 CRUD, 멤버·리더 위임, 배너 이미지, **즐겨찾기**, 검색·필터 쿼리 (`GET /teams`).

### 팀 게시판 `/api/teams/:teamId/posts`

게시글 CRUD, 고정(pin), 댓글 작성·삭제.

### 워크스페이스 `/api/workspaces`

워크스페이스 조회, **상태·우선순위** CRUD, **업무** CRUD 및 `tasks/reorder`, 업무 **댓글·첨부·노트**, `GET /workspaces/:workspaceId/task-requests` 등과 연계되는 업무 요청 흐름.

### 업무 요청 `/api/...`

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/projects/:projectId/task-requests` | 요청 생성 |
| `GET` | `/workspaces/:workspaceId/task-requests` | 받은 요청 목록 |
| `POST` | `/task-requests/:requestId/accept` | 수락 |
| `POST` | `/task-requests/:requestId/reject` | 거절 |

### 알림 (HTTP) `/api/notifications`

목록 조회, 단건·전체 읽음 처리. (실시간 반영은 Socket.IO 서버)

### 업로드 `/api/upload`

인증된 사용자의 파일 업로드 (스토리지 설정은 `UPLOAD_STORAGE`).

### 관리자 `/api/admin` (SUPER_ADMIN)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/admin/users` | 사용자 목록 |
| `POST` | `/admin/users` | 사용자 생성 |
| `GET` | `/admin/users/:userId` | 상세 |
| `PATCH` | `/admin/users/:userId` | 정보 수정 |
| `PATCH` | `/admin/users/:userId/role` | 시스템 역할 변경 |
| `GET` | `/admin/auth-settings` | 인증 설정 조회 (공개 가입·LDAP 등) |
| `PATCH` | `/admin/auth-settings` | 인증 설정 변경 |
| `POST` | `/admin/auth-settings/ldap-test` | LDAP 인증 테스트 |
| `GET` | `/admin/smtp` | SMTP 설정 조회 |
| `PATCH` | `/admin/smtp` | SMTP 설정 저장 |
| `POST` | `/admin/smtp/test` | SMTP 테스트 발송 |
| `GET` | `/admin/system-logs` | 시스템 NDJSON 로그 목록·내용 조회 |

자세한 화면·운영 요약: [`docs/admin.md`](../admin.md)

---

## 데이터 모델 메모

### 공개 ID 규칙

- **Team**: `t-xxxxxxxx`
- **Project**: `prj-xxxxxxxx`
- **Workspace**: `ws-xxxxxxxx`

`xxxxxxxx` 는 8자리 영문·숫자 조합입니다.

### TeamMember 기본키

`TeamMember` 는 별도 `id` 없이 **복합 기본키 `(teamId, userId)`** 를 사용합니다.

### 워크스페이스 자동 생성

프로젝트 생성 시 트랜잭션 안에서, 생성자 및 연결된 팀 멤버에게 `Workspace(projectId, userId)` 가 생성됩니다 (`@@unique([projectId, userId])`).

---

## 인증 흐름

```
[클라이언트]                        [서버]                    [Redis]

  signup/login ─────────────────► 비밀번호 검증
                                   Access Token 발급 (1일)
                                   Refresh Token 발급 (15일) ──► rt:{userId}:{jti} 저장
               ◄─────────────────  두 토큰 반환

  API 요청
  Authorization: Bearer <accessToken> ─► JWT 서명 + 만료 검증
                                         request.userId 세팅
               ◄─────────────────  응답

  토큰 갱신
  { refreshToken } ────────────► Redis에 jti 존재 확인
                                  기존 토큰 삭제 (Rotation)  ──► 기존 jti 삭제
                                  새 토큰 쌍 발급             ──► 새 jti 저장
               ◄─────────────────  새 accessToken + refreshToken

  로그아웃
  { refreshToken } ────────────►                            ──► jti 삭제
               ◄─────────────────  204 No Content
```

> **Refresh Token Rotation**: 이미 소비된 Refresh Token으로 재발급을 시도하면 Redis에 jti가 없어 401이 됩니다.

---

## 권한 시스템(RBAC)

### 시스템 역할 (`SystemRole`)

| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| `SUPER_ADMIN` | 시스템 전체 관리자 | 관리 API 포함 광범위 |
| `USER` | 일반 사용자 | 소속 리소스 위주 |

### 프로젝트 역할 (`ProjectRole`)

| 역할 | 설명 | 권한 |
|------|------|------|
| `LEADER` | 프로젝트장 | 멤버·설정·업무 |
| `DEPUTY_LEADER` | 부프로젝트장 | 멤버 초대·업무 |
| `MEMBER` | 일반 멤버 | 할당 업무 위주 |

### 미들웨어 체이닝 예시

```typescript
app.get("/admin/users", {
  preHandler: [authenticateUser, authenticateAdmin],
}, handler);

app.post("/projects/:projectId/members", {
  preHandler: [authenticateUser, authenticateProjectManager],
}, handler);
```

---

## 초기 관리자 생성

DB에 유저가 없을 때 API 서버 기동 로그에 **Setup Token**이 출력됩니다.

```
──────────────────────────────────────────────────────────
⚠️  INITIAL SETUP MODE
   SETUP TOKEN : a3f9c21b04e87d65
──────────────────────────────────────────────────────────
```

`setupToken`을 회원가입 바디에 넣으면 해당 계정이 `SUPER_ADMIN`으로 생성됩니다.

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "strongpassword",
    "setupToken": "a3f9c21b04e87d65"
  }'
```

- 토큰은 메모리 보관, 재시작 시 변경
- 첫 `SUPER_ADMIN` 생성 후 이 모드는 비활성화

---

## 프로덕션 빌드

### API 서버 컴파일

```bash
pnpm --filter @repo/api-server build
# 출력: apps/server/apiServer/dist/
```

### 알림 서버 컴파일

```bash
pnpm --filter @repo/notification-server build
# 출력: apps/server/notificationServer/dist/
```

### Docker (루트 프로덕션 컴포즈)

```bash
cp env.production.example .env.production
# 비밀값·CORS·DB 비밀번호 등 편집

pnpm docker:prod:up
```

현재 `docker-compose.prod.yml`은 **PostgreSQL + Redis + API 서버**를 포함합니다. 알림 서버를 동일 스택에 넣지 않은 경우, 호스트나 별도 프로세스로 `notification-server`를 실행하고 웹의 `NEXT_PUBLIC_NOTIFICATION_URL`을 맞추면 됩니다.

`apps/server/apiServer/Dockerfile`은 멀티스테이지 빌드입니다.
