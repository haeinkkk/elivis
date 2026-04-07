# Desktop — `apps/desktop`

Electron 41 기반 데스크톱 애플리케이션입니다.  
개발 환경에서는 `apps/web` 개발 서버(`http://localhost:3000`)를 로드하고,  
프로덕션에서는 Next.js 정적 빌드 결과물(`apps/web/out`)을 번들에 넣어 렌더링합니다.

API·알림 서버는 웹과 동일하게 원격(또는 로컬) URL을 바라보며, 루트 `.env`의 `NEXT_PUBLIC_*` 값이 빌드 시점에 반영됩니다.

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
├── scripts/
│   └── sync-icon.mjs   # 웹 public/favicon.ico → build·dist/icon.ico
├── static/             # 로컬 셸(splash)·오프라인 안내 HTML (네트워크 없이 표시)
├── build/              # electron-builder 리소스 (icon.ico 등)
├── dist/               # 컴파일된 JS (빌드 후 생성)
├── release/            # installer / portable 출력 디렉토리
└── electron-builder.yml
```

### 아이콘 (favicon)

- 웹과 동일하게 **`apps/web/public/favicon.ico`** 를 두면 됩니다. 별도 해상도 파일이 필수는 아니며, 일반적인 `.ico`(16×16 ~ 256×256 멀티 해상도 포함)면 Windows에서 창·실행 파일 아이콘에 사용할 수 있습니다.
- `pnpm build` / `pnpm dev` 시 **`scripts/sync-icon.mjs`** 가 위 파일을 **`build/icon.ico`**·**`dist/icon.ico`** 로 복사합니다. `electron-builder`는 `build/icon.ico`로 패키지 아이콘을 잡습니다.
- **macOS** DMG 등에 맞춘 아이콘을 쓰려면 나중에 **`build/icon.icns`** 를 추가하면 됩니다(선택).

### 시작 화면·오프라인

- 앱은 먼저 **`static/shell.html`** 로 네이티브 스타일 **로딩(스플래시)** 을 띄운 뒤, **`<webview>`** 로 실제 웹 UI를 불러옵니다(페이지가 준비될 때까지 스플래시가 유지됩니다).
- **개발 모드**: `http://127.0.0.1:3000` 에 연결되지 않으면 **`noserver.html`** (웹 서버 실행 안내).
- **패키징(정적 `web/out`)**: 외부 인터넷이 감지되지 않으면 **`offline.html`** (연결 확인 안내). 폐쇄망에서 정적 UI만 열어야 하면 실행 환경에 **`ELIVIS_DESKTOP_SKIP_INTERNET_CHECK=1`** 을 설정합니다(패키징된 앱은 루트 `.env`를 자동으로 읽지 않습니다).
- **`web/out` 없음**: **`nobuild.html`** (정적 빌드 방법 안내).
- 각 안내 화면에는 **다시 시도** 버튼이 있으며, 조건을 다시 검사한 뒤 셸로 돌아갑니다.

---

## 개발 환경 실행

> **웹 UI:** 개발 모드에서는 `http://localhost:3000` 을 불러옵니다. 웹이 아직 없으면 **`noserver.html`** 안내가 뜹니다. 다른 터미널에서 `pnpm dev:web` 을 켜거나, 아래처럼 한 번에 돌리면 됩니다.

루트에서 웹·API·알림·데스크톱을 함께 실행 (권장):

```bash
pnpm dev
```

데스크톱만 단독 실행 (Electron 창은 바로 뜨고, 웹은 별도로 `pnpm dev:web` 등으로 켜면 연결됩니다):

```bash
pnpm dev:desktop
# 또는
pnpm --filter @repo/desktop dev
```

`dev` 스크립트는 먼저 `tsc`로 `dist/`를 한 번 생성한 뒤, `tsc -w`와 Electron을 같이 띄웁니다. 웹이 없으면 `noserver.html` 안내가 표시됩니다.

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

개발 모드에서는 **`static/shell.html`** 셸을 먼저 띄운 뒤, **webview**로 `http://localhost:3000/` (또는 연결 실패 시 `noserver.html` 등)을 로드합니다. 프로덕션은 `web-out`의 정적 `index.html`을 사용합니다.  
`main.ts`의 `resolveAppTarget()`·`beginShellFlow()`를 참고하세요.

### preload.ts

렌더러 프로세스에서 Node.js API에 안전하게 접근하기 위한 컨텍스트 브릿지를 제공합니다.  
`contextIsolation: true`로 보안을 유지하면서 필요한 API만 노출합니다.

---

## 문제 해결 (Windows)

### `pnpm dev:desktop`만 했는데 Electron 창이 안 뜸

- 이전에는 **`wait-on`**으로 포트 3000이 열릴 때까지 대기해, 웹을 켜지 않으면 **Electron이 멈춘 것처럼** 보였습니다. 지금은 창이 바로 뜹니다.
- 웹이 없으면 **`noserver.html`** 이 나옵니다. `pnpm dev:web` 을 다른 터미널에서 켜거나 `pnpm dev` 로 전체를 실행하세요.

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
- `pnpm dev`로 웹·API·알림·데스크톱을 함께 실행하는 것이 가장 단순합니다.

---

### `ENOENT: no such file or directory` (앱 빌드 오류)

- `apps/web/out/` 디렉토리가 존재하는지 확인하세요.
- 먼저 `pnpm --filter web build:static`을 실행한 뒤 `pnpm build:desktop`을 실행하세요.
