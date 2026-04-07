# Web — `apps/web`

Next.js 16(App Router) 기반 웹 앱입니다. REST API(`@repo/api-server`)와 통신하고, 알림은 **Socket.IO 클라이언트**로 `notificationServer`에 연결합니다.

## 목차

- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [관리자 콘솔 및 인증 UI](#관리자-콘솔-및-인증-ui)
- [환경 변수](#환경-변수)
- [개발 서버 실행](#개발-서버-실행)
- [UI 구성](#ui-구성)
- [실시간 알림](#실시간-알림)
- [정적보내기 (Electron용)](#정적-보내기-electron용)
- [프로덕션 빌드](#프로덕션-빌드)
- [문제 해결](#문제-해결)

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS |
| 공유 패키지 | `@repo/ui`, `@repo/types`, `@repo/i18n`, `@repo/docs` |
| 컴파일러 | React Compiler (`reactCompiler: true`) — 자동 메모이제이션을 사용하므로 일반적으로 수동 `useMemo` / `useCallback`은 필요 없음 |
| 리치 텍스트 등 | TipTap, react-markdown 등 (도메인 화면에서 사용) |
| 실시간 | socket.io-client |

---

## 디렉토리 구조

```
apps/web/src/
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/                  # 로그인 (로컬 / LDAP 탭 등)
│   ├── signup/                 # 공개 회원가입 (설정에 따라 비활성 메시지)
│   ├── account-suspended/      # 계정 정지 등 안내
│   ├── (main)/                 # 로그인 후 메인 셸
│   │   ├── page.tsx            # 홈
│   │   ├── teams/, projects/, mywork/   # mywork/performance — 성과
│   │   ├── notification/, settings/, trash/, workspace/
│   │   └── pages/              # 정적 페이지 그룹
│   ├── (admin)/admin/          # SUPER_ADMIN — 사용자, 성과, 이메일, 보안(LDAP·가입), 시스템 로그
│   └── docx/                   # 기타 라우트
├── components/                 # 앱 전용 컴포넌트·클라이언트 위젯
└── ...
```

동적 세그먼트(`[id]`)가 있는 라우트는 Electron 정적 빌드용으로 `layout.tsx` 등에 `generateStaticParams`가 필요할 수 있습니다.

---

## 관리자 콘솔 및 인증 UI

- **`SUPER_ADMIN`** 전용 화면은 `(admin)/admin` 아래에 있습니다. LDAP, 공개 회원가입, SMTP, 시스템 로그, 전체 성과 대시보드 등은 **[관리자·보안·운영 문서](../admin.md)** 에 정리되어 있습니다.
- 공개 설정(가입 허용, LDAP 노출 여부 등)은 클라이언트가 **`GET /api/auth/config`** 로 받아 로그인·회원가입 UI를 구성합니다.

---

## 환경 변수

루트 **`.env`** 하나로 관리합니다. `next.config.ts`가 빌드·실행 시 루트 `.env`를 로드합니다.

| 키 | 설명 | 예시 |
|----|------|------|
| `NEXT_PUBLIC_API_URL` | REST API 베이스 URL | `http://localhost:4000` |
| `NEXT_PUBLIC_NOTIFICATION_URL` | Socket.IO 알림 서버 URL | `http://localhost:4001` |
| `NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB` | 클라이언트 업로드 검증 (서버와 맞출 것) | `50` |

> 브라우저에 노출되려면 `NEXT_PUBLIC_` 접두사가 필요합니다.

---

## 개발 서버 실행

루트에서 전체 스택:

```bash
pnpm dev
```

웹만:

```bash
pnpm dev:web
# 또는
pnpm --filter web dev
```

기본 주소: http://localhost:3000

알림 UI를 쓰려면 알림 서버도 떠 있어야 합니다 (`pnpm dev` 또는 `pnpm dev:notification`).

---

## UI 구성

- **`packages/ui`**: 여러 화면에서 재사용하는 공유 UI.
- **`apps/web/src/components`**: 이 앱에만 묶인 큰 패널·탭·클라이언트 전용 위젯 등.
- **`apps/web/src/app`**: 라우팅, 레이아웃, Server Actions·서버 컴포넌트에서의 데이터 접근.

데스크톱(`apps/desktop`)은 프로덕션에서 정적 빌드된 웹을 로드하므로, 공유 UI는 가능한 한 `@repo/ui`와 동일 규약을 유지하는 것이 좋습니다.

---

## 실시간 알림

클라이언트는 `NEXT_PUBLIC_NOTIFICATION_URL`의 Socket.IO 엔드포인트에 연결합니다. 연결 시 **Access JWT**를 넘기고, 서버는 `user:{userId}` 룸으로 이벤트를 보냅니다. (서버 쪽: [`docs/server/README.md` — 알림 서버](../server/README.md#알림-서버-socketio))

---

## 정적보내기 (Electron용)

```bash
pnpm --filter web build:static
# 또는
# Windows: set ELECTRON_STATIC=1 && pnpm --filter web build
# macOS/Linux: ELECTRON_STATIC=1 pnpm --filter web build
```

산출물: `apps/web/out/`

> 정적 빌드에서는 서버 전용 Next 기능에 제한이 있습니다. `[id]` 등 동적 라우트에는 `generateStaticParams`가 필요합니다.

---

## 프로덕션 빌드

Next 서버 모드:

```bash
pnpm --filter web build
pnpm --filter web start
```

모노레포 루트:

```bash
pnpm build
pnpm start
```

`pnpm start`는 웹·API·알림 서버를 함께 띄우도록 구성되어 있습니다. 배포 형태에 맞게 프로세스를 나누어도 됩니다.

---

## 문제 해결

**`generateStaticParams` 누락으로 정적 빌드 실패**

`ELECTRON_STATIC=1` / `build:static` 시 동적 세그먼트 페이지에서 발생할 수 있습니다.

```typescript
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}
```

**환경 변수가 브라우저에 안 보임**

루트 `.env`에 `NEXT_PUBLIC_` 접두사가 있는지 확인하세요.

**알림이 실시간으로 안 옴**

`notificationServer` 기동 여부, `NEXT_PUBLIC_NOTIFICATION_URL`, `CORS_ORIGIN`에 웹 Origin 포함 여부를 확인하세요.
