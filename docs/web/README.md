# Web — `apps/web`

Next.js 16 기반 웹 애플리케이션입니다.  
`packages/ui`의 공유 컴포넌트를 렌더링하며, API 서버(`apps/server/apiServer`)와 통신합니다.

## 목차

- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [환경 변수](#환경-변수)
- [개발 서버 실행](#개발-서버-실행)
- [UI 아키텍처](#ui-아키텍처)
- [정적 내보내기 (Electron용)](#정적-내보내기-electron용)
- [프로덕션 빌드](#프로덕션-빌드)
- [문제 해결](#문제-해결)

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS |
| 공유 컴포넌트 | `@repo/ui` |
| 공유 타입 | `@repo/types` |
| 컴파일러 | React Compiler (`reactCompiler: true`) |

---

## 디렉토리 구조

```
apps/web/src/
├── app/                  # Next.js App Router
│   ├── (main)/           # 메인 레이아웃 그룹
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── mywork/[id]/
│   │   │   └── layout.tsx  # generateStaticParams 포함 (정적 빌드용)
│   │   └── projects/[id]/
│   │       └── layout.tsx  # generateStaticParams 포함 (정적 빌드용)
│   └── globals.css
└── components/           # 페이지 전용 컴포넌트
```

---

## 환경 변수

모든 환경 변수는 **모노레포 루트의 `.env`** 하나로 관리됩니다.  
`next.config.ts`가 빌드·실행 전에 루트 `.env`를 자동으로 로드합니다.

| 키 | 설명 | 예시 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API 서버 기본 URL | `http://localhost:4000` |

> `NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저에 노출됩니다.

---

## 개발 서버 실행

루트에서 전체 앱과 함께 실행:

```bash
pnpm dev
```

웹만 단독 실행:

```bash
pnpm dev:web
# 또는
pnpm --filter web dev
```

웹은 `http://localhost:3000`에서 실행됩니다.

---

## UI 아키텍처

```
packages/ui/          ← 화면 단위 컴포넌트 (비즈니스 UI)
    └─ 공유됨
         ├─ apps/web/     (Next.js가 라우팅·데이터 페칭 담당)
         └─ apps/desktop/ (Electron이 웹 UI를 그대로 로드)
```

- **모든 화면 컴포넌트**는 `packages/ui`에 작성합니다.
- `apps/web`은 라우팅, 데이터 페칭(server components/actions), Next.js 특화 로직만 담당합니다.
- 이 구조 덕분에 웹과 데스크톱이 **동일한 UI**를 공유합니다.

---

## 정적 내보내기 (Electron용)

Electron 프로덕션 빌드에서는 Next.js를 정적 HTML/CSS/JS로 내보내야 합니다.

```bash
# Windows
set ELECTRON_STATIC=1 && pnpm --filter web build

# macOS / Linux
ELECTRON_STATIC=1 pnpm --filter web build

# 또는 루트 스크립트
pnpm --filter web build:static
```

빌드 결과물: `apps/web/out/`

> **주의**: 정적 내보내기 시 서버 컴포넌트, API Routes, `getServerSideProps` 등 서버 전용 기능은 사용할 수 없습니다. 동적 라우트(`[id]`)가 있는 페이지에는 반드시 `generateStaticParams`를 추가해야 합니다.

---

## 프로덕션 빌드

일반 Next.js 서버 모드 빌드:

```bash
pnpm --filter web build
pnpm --filter web start   # http://localhost:3000
```

또는 루트에서:

```bash
pnpm build
pnpm start
```

---

## 문제 해결

**빌드 실패: `generateStaticParams` 누락**

`ELECTRON_STATIC=1` 빌드 시 동적 라우트 세그먼트가 있는 페이지에서 발생합니다.  
해당 경로의 `layout.tsx` 또는 `page.tsx`에 아래를 추가하세요.

```typescript
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}
```

**환경 변수가 적용되지 않음**

루트 `.env`에 해당 변수가 있는지 확인하세요.  
`NEXT_PUBLIC_` 접두사가 없는 변수는 브라우저에서 접근할 수 없습니다.
