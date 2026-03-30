# Desktop — `apps/desktop`

Electron 41 기반 데스크톱 애플리케이션입니다.  
개발 환경에서는 `apps/web` 개발 서버(`localhost:3000`)를 로드하고,  
프로덕션에서는 Next.js 정적 빌드 결과물을 직접 렌더링합니다.

## 목차

- [기술 스택](#기술-스택)
- [디렉토리 구조](#디렉토리-구조)
- [개발 환경 실행](#개발-환경-실행)
- [프로덕션 빌드](#프로덕션-빌드)
- [Electron 구조](#electron-구조)
- [문제 해결 (Windows)](#문제-해결-windows)

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Electron | 41.1.0 |
| electron-builder | 26.8.1 |
| Node.js | 24+ |
| TypeScript | 5.x |

---

## 디렉토리 구조

```
apps/desktop/
├── src/
│   ├── main.ts         # Electron 메인 프로세스
│   └── preload.ts      # 프리로드 스크립트 (컨텍스트 브릿지)
├── dist/               # 컴파일된 JS (빌드 후 생성)
├── release/            # installer / portable 출력 디렉토리
└── electron-builder.yml
```

---

## 개발 환경 실행

> **전제 조건:** `apps/web` 개발 서버(`localhost:3000`)가 먼저 실행 중이어야 합니다.

루트에서 전체 앱과 함께 실행 (권장):

```bash
pnpm dev
```

데스크톱만 단독 실행 (웹이 이미 실행 중일 때):

```bash
pnpm dev:desktop
# 또는
pnpm --filter @repo/desktop dev
```

내부적으로 `wait-on tcp:127.0.0.1:3000`으로 웹 서버가 준비될 때까지 대기한 뒤 Electron을 시작합니다.

---

## 프로덕션 빌드

### 1단계: 웹 정적 빌드

```bash
pnpm --filter web build:static
# 결과: apps/web/out/
```

### 2단계: Electron 앱 패키징

```bash
pnpm build:desktop
# 결과: apps/desktop/release/
```

`electron-builder.yml`이 `apps/web/out/` 디렉토리를 앱 내부 `web-out/` 리소스로 복사합니다.

### 출력물

| 파일 | 설명 |
|------|------|
| `release/*-Setup.exe` | NSIS 설치 프로그램 (Windows) |
| `release/*-Portable.exe` | 설치 없이 실행 가능한 포터블 버전 |

---

## Electron 구조

### 개발 vs 프로덕션 로딩

```typescript
// main.ts
if (app.isPackaged) {
  // 프로덕션: 패키징된 앱 내부 정적 파일 로드
  const webOutDir = path.join(process.resourcesPath, "web-out");
  win.loadFile(path.join(webOutDir, "index.html"));
} else {
  // 개발: 로컬 Next.js 개발 서버 로드
  win.loadURL("http://localhost:3000");
}
```

### preload.ts

렌더러 프로세스에서 Node.js API에 안전하게 접근하기 위한 컨텍스트 브릿지를 제공합니다.  
`contextIsolation: true`로 보안을 유지하면서 필요한 API만 노출합니다.

---

## 문제 해결 (Windows)

### `Cannot create symbolic link` 오류

`electron-builder` 실행 시 아래 오류가 발생할 수 있습니다.

```
ERROR: Cannot create symbolic link
클라이언트가 필요한 권한을 가지고 있지 않습니다.
```

**해결 방법: Windows 개발자 모드 활성화**

1. `설정` → `업데이트 및 보안` → `개발자용` 으로 이동  
   (Windows 11: `설정` → `시스템` → `개발자용`)
2. **개발자 모드** 토글을 켭니다.
3. 재시작 후 다시 빌드합니다.

> 개발자 모드를 활성화하면 일반 사용자 권한으로도 심볼릭 링크를 생성할 수 있게 됩니다.

---

### Electron이 하얀 화면으로 시작됨

- `apps/web` 개발 서버(`localhost:3000`)가 실행 중인지 확인하세요.
- `pnpm dev`로 전체 앱을 함께 실행하면 `wait-on`이 자동으로 대기합니다.

---

### `ENOENT: no such file or directory` (앱 빌드 오류)

- `apps/web/out/` 디렉토리가 존재하는지 확인하세요.
- 먼저 `pnpm --filter web build:static`을 실행한 뒤 `pnpm build:desktop`을 실행하세요.
