# Server — `apps/server`

Fastify 기반 REST API 서버입니다.  
PostgreSQL(Prisma) + Redis(ioredis)를 연동하며 JWT 인증과 RBAC 권한 제어를 제공합니다.

## 목차

- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [환경 변수](#환경-변수)
- [개발 서버 실행](#개발-서버-실행)
- [API 엔드포인트](#api-엔드포인트)
- [인증 흐름](#인증-흐름)
- [권한 시스템(RBAC)](#권한-시스템rbac)
- [초기 관리자 생성](#초기-관리자-생성)
- [프로덕션 빌드](#프로덕션-빌드)

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Runtime | Node.js 24+ |
| Framework | Fastify 5 |
| ORM | Prisma 6 + PostgreSQL 16 |
| Cache / Token Store | Redis 7 (ioredis) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |

---

## 디렉토리 구조

```
apps/server/src/
├── controllers/          # 비즈니스 로직 + DB 접근
│   ├── auth.controller.ts
│   ├── project.controller.ts
│   └── admin.controller.ts
├── routes/               # URL 매핑 + 미들웨어 조합
│   ├── auth.routes.ts
│   ├── project.routes.ts
│   ├── admin.routes.ts
│   └── health.routes.ts
├── middleware/           # preHandler 훅
│   └── auth.ts           # JWT 검증, 권한 확인
├── plugins/              # Fastify 플러그인
│   ├── prisma.ts         # app.prisma 데코레이터
│   └── redis.ts          # app.redis 데코레이터
├── services/             # 순수 로직 (프레임워크 비의존)
│   ├── token.service.ts  # JWT 생성·검증·Rotation
│   └── setup.service.ts  # 최초 설치 토큰 관리
└── index.ts              # 앱 진입점
```

---

## 환경 변수

모든 환경 변수는 **모노레포 루트의 `.env`** 하나로 관리됩니다.  
`env.example`을 복사하여 사용하세요.

| 키 | 설명 | 예시 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgresql://elivis:elivis@localhost:5432/elivis` |
| `REDIS_URL` | Redis 연결 문자열 | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Access Token 서명 비밀 키 | 최소 32자 랜덤 문자열 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 비밀 키 | 최소 32자 랜덤 문자열 |
| `API_PORT` | 서버 포트 | `4000` |
| `API_HOST` | 바인딩 호스트 | `0.0.0.0` |
| `CORS_ORIGIN` | 허용할 Origin (쉼표 구분) | `http://localhost:3000` |

> **보안**: `JWT_ACCESS_SECRET`과 `JWT_REFRESH_SECRET`은 충분히 길고 무작위인 값으로 설정하세요.  
> `openssl rand -hex 32` 명령으로 생성할 수 있습니다.

---

## 개발 서버 실행

루트에서 전체 앱과 함께 실행:

```bash
pnpm dev
```

서버만 단독 실행:

```bash
pnpm dev:server
# 또는
pnpm --filter @repo/server dev
```

서버는 `http://localhost:4000`에서 실행됩니다.

---

## API 엔드포인트

### 헬스 체크

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| `GET` | `/health` | 없음 | DB 연결 상태 확인 |

**응답 예시 (200)**

```json
{
  "status": "ok",
  "database": "connected",
  "latencyMs": 3
}
```

---

### 인증 (`/api/auth`)

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| `POST` | `/api/auth/signup` | 없음 | 회원가입 |
| `POST` | `/api/auth/login` | 없음 | 로그인 |
| `POST` | `/api/auth/refresh` | 없음 | 토큰 재발급 |
| `POST` | `/api/auth/logout` | 없음 | 현재 기기 로그아웃 |
| `POST` | `/api/auth/logout/all` | Bearer | 전체 기기 로그아웃 |

**회원가입 요청 예시**

```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "strongpassword",
  "name": "홍길동",
  "setupToken": "..." // 최초 SUPER_ADMIN 생성 시에만 필요
}
```

**로그인 응답 예시**

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "cm...",
    "email": "user@example.com",
    "name": "홍길동",
    "systemRole": "USER"
  }
}
```

---

### 프로젝트 (`/api/projects`)

| Method | Path | 인증 | 권한 | 설명 |
|--------|------|------|------|------|
| `POST` | `/api/projects` | Bearer | 로그인 유저 | 프로젝트 생성 (생성자 자동 LEADER) |
| `GET` | `/api/projects/:projectId` | Bearer | 프로젝트 멤버 또는 연결 팀 팀원 | 프로젝트 상세 조회 |
| `POST` | `/api/projects/:projectId/members` | Bearer | LEADER·DEPUTY_LEADER | 멤버 초대 |

---

## 데이터 모델 메모

### TeamMember 기본키

`TeamMember`는 별도 `id` 없이 **복합 기본키 `(teamId, userId)`**를 사용합니다.

### 공개 ID 규칙

- **Team**: `t-xxxxxxxx`
- **Project**: `prj-xxxxxxxx`

`xxxxxxxx`는 8자리 영문 대소문자 + 숫자 조합입니다.

### 워크스페이스 (`/api/workspaces`)

| Method | Path | 인증 | 권한 | 설명 |
|--------|------|------|------|------|
| `GET` | `/api/workspaces` | Bearer | 로그인 유저 | 내 워크스페이스 목록 (프로젝트 정보 포함) |
| `GET` | `/api/workspaces/:workspaceId` | Bearer | 소유자 | 워크스페이스 상세 (뷰 설정 포함) |
| `GET` | `/api/workspaces/:workspaceId/tasks` | Bearer | 소유자 | 업무 목록 |
| `POST` | `/api/workspaces/:workspaceId/tasks` | Bearer | 소유자 | 업무 생성 |
| `PATCH` | `/api/workspaces/:workspaceId/tasks/:taskId` | Bearer | 소유자 | 업무 수정 (상태·제목·순서·담당자) |
| `DELETE` | `/api/workspaces/:workspaceId/tasks/:taskId` | Bearer | 소유자 | 업무 삭제 |

**워크스페이스 자동 생성 규칙**

- 프로젝트가 생성(`POST /api/projects`)될 때, **트랜잭션 안에서** 자동으로 워크스페이스를 생성합니다.
- 대상: 프로젝트 생성자 + **연결된 모든 팀** (`Project.teamId` + `ProjectTeam`) 소속 팀원 전원
- 각 유저별로 `Workspace(projectId, userId)` 1개씩 생성 (`@@unique([projectId, userId])`로 중복 방지)
- 이후 팀원이 추가되더라도 워크스페이스는 자동으로 생성되지 않습니다(후속 확장 예정).

**업무 상태(WorkspaceTaskStatus)**

| 값 | 설명 |
|----|------|
| `TODO` | 할 일 |
| `DOING` | 진행 중 |
| `DONE` | 완료 |

**뷰 타입(WorkspaceViewType)**

| 값 | 설명 |
|----|------|
| `LIST` | 리스트(테이블) 뷰 |
| `BOARD` | 보드(칸반) 뷰 |

### 공개 ID 추가 규칙

- **Workspace**: `ws-xxxxxxxx`

### 관리자 (`/api/admin`)

| Method | Path | 인증 | 권한 | 설명 |
|--------|------|------|------|------|
| `GET` | `/api/admin/users` | Bearer | SUPER_ADMIN | 전체 유저 목록 조회 |
| `PATCH` | `/api/admin/users/:userId/role` | Bearer | SUPER_ADMIN | 유저 시스템 역할 변경 |

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

> **Refresh Token Rotation**: 토큰 탈취 시 감지가 가능합니다. 이미 사용된 Refresh Token으로 재발급을 시도하면 Redis에 해당 jti가 존재하지 않으므로 401이 반환됩니다.

---

## 권한 시스템(RBAC)

### 시스템 역할 (`SystemRole`)

| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| `SUPER_ADMIN` | 시스템 전체 관리자 | 모든 API 접근 가능 |
| `USER` | 일반 사용자 | 소속 프로젝트 리소스만 접근 |

### 프로젝트 역할 (`ProjectRole`)

| 역할 | 설명 | 권한 |
|------|------|------|
| `LEADER` | 프로젝트장 | 멤버 관리, 설정 변경, 업무 전체 관리 |
| `DEPUTY_LEADER` | 부프로젝트장 | 멤버 초대, 업무 관리 |
| `MEMBER` | 일반 멤버 | 할당된 업무 조회·수정 |

### 미들웨어 체이닝 예시

```typescript
// SUPER_ADMIN만 접근
app.get("/admin/users", {
  preHandler: [authenticateUser, authenticateAdmin],
}, handler);

// 프로젝트 LEADER 또는 DEPUTY_LEADER만 접근
app.post("/projects/:projectId/members", {
  preHandler: [authenticateUser, authenticateProjectManager],
}, handler);
```

---

## 초기 관리자 생성

서버 최초 실행 시 DB에 유저가 없으면 서버 로그에 **16자리 Setup Token**이 출력됩니다.

```
──────────────────────────────────────────────────────────
⚠️  INITIAL SETUP MODE
   SETUP TOKEN : a3f9c21b04e87d65
──────────────────────────────────────────────────────────
```

이 토큰을 회원가입 요청의 `setupToken` 필드에 포함하면 해당 계정이 `SUPER_ADMIN`으로 생성됩니다.

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "strongpassword",
    "setupToken": "a3f9c21b04e87d65"
  }'
```

- 토큰은 **메모리에만** 저장되며 파일·DB에 기록되지 않습니다.
- 서버 재시작 시 새 토큰이 발급됩니다.
- 첫 번째 `SUPER_ADMIN` 생성 후 이 로직은 **영구 비활성화**됩니다.

---

## 프로덕션 빌드

TypeScript를 JavaScript로 컴파일합니다.

```bash
pnpm --filter @repo/server build
# 빌드 결과: apps/server/dist/
```

Docker를 사용한 컨테이너 실행:

```bash
# 프로덕션 서비스 전체 기동 (PostgreSQL + Redis + API 서버)
pnpm docker:prod:up
```

`apps/server/Dockerfile`은 멀티스테이지 빌드로 최적화되어 있습니다.
