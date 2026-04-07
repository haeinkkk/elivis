# ESLint 실행 가이드

모노레포는 **ESLint 9 Flat Config** (`eslint.config.mjs`)만 사용합니다. 공통 프리셋은 **`@repo/eslint-config`** 패키지의 `flat/*` 서브패스로 제공됩니다.

## 한 번에 실행 (권장)

저장소 루트에서:

```bash
pnpm lint
```

내부적으로 `turbo lint`가 각 워크스페이스의 `lint` 스크립트를 실행합니다.

## 패키지별로 실행

각 패키지의 `lint` 스크립트는 **`scripts/eslint-run.mjs`** 를 통해 **저장소 루트**에만 두는 ESLint 9를 실행합니다. (`node-linker=hoisted` 환경에서 패키지별로 `eslint@8` 바이너리가 잡히던 문제를 피하고, `node ../../scripts/eslint-run.mjs …` 한 가지 패턴만 쓰면 됩니다.)

| 대상 | 명령 |
|------|------|
| 웹 앱 (`apps/web`) | `pnpm --filter web run lint` |
| 공유 UI (`packages/ui`) | `pnpm --filter @repo/ui run lint` |
| API 서버 | `pnpm --filter @repo/api-server run lint` |
| 알림 서버 | `pnpm --filter @repo/notification-server run lint` |
| 데스크톱 | `pnpm --filter @repo/desktop run lint` |
| DB 패키지 | `pnpm --filter @repo/database run lint` |
| 타입 패키지 | `pnpm --filter @repo/types run lint` |
| 문서 패키지 (`@repo/docs`) | `pnpm --filter @repo/docs run lint` |

## 공유 설정 (`@repo/eslint-config`)

| 서브패스 | 용도 |
|----------|------|
| `@repo/eslint-config/flat/node` | Node·TypeScript·Prettier (`database`, `types`, `docs`, 서버, 데스크톱 등) |
| `@repo/eslint-config/flat/react-internal` | `@repo/ui` — React 19, `eslint-plugin-react-hooks`, **`eslint-plugin-react-compiler`** |
| `@repo/eslint-config/flat/react-compiler` | `reactCompilerFlat()` — Next 앱 등에서 기존 Flat 배열에 끼워 넣기 |

각 앱/패키지 루트의 **`eslint.config.mjs`** 에서 위 모듈을 `import` 한 뒤 `export default` 하면 됩니다. 워크스페이스 의존성(`"@repo/eslint-config": "workspace:*"`)으로 공유 설정이 연결됩니다.

루트 **`package.json`** 에 `eslint`가 `devDependencies`로 있어야 `eslint-run.mjs`가 동작합니다.

## `apps/web` (Next.js)

`eslint-config-next/core-web-vitals`에 더해 `@repo/eslint-config/flat/react-compiler`의 `reactCompilerFlat()`을 합칩니다. Next·Prettier·프로젝트 규칙 오버라이드는 `apps/web/eslint.config.mjs`에만 둡니다.

## 타입 검사와 함께

```bash
pnpm type-check
```

## 루트 `package.json`의 `pnpm.overrides`

의존성 트리 어딘가에 **ESLint 8**이 끼어 있으면 플러그인과 맞지 않을 수 있어, 루트에 `"eslint": "^9.17.0"` **overrides**를 두어 전역으로 9.x만 쓰도록 맞춰 두었습니다.

## 문제가 날 때

- **`eslint: command not found`** — 루트에서 `pnpm install` 후, **모노레포 루트**에서 `pnpm --filter <패키지> run lint` 로 실행해 보세요.
- **`eslint-run: not found`** — 루트 `devDependencies`에 `eslint`가 있는지 확인하세요.
- **Prisma / tsup 등이 `node_modules` 안에서 못 찾는다** — 이전에 `node_modules` 레이아웃이 깨졌을 수 있습니다. 루트에서 `node_modules`와 워크스페이스 하위 `node_modules`를 지운 뒤 `pnpm install`로 다시 깔면 보통 복구됩니다.
- **Windows PowerShell** — 여러 명령을 이어 쓸 때는 `&&` 대신 `;`를 쓰거나 한 줄에 하나씩 실행하세요.
