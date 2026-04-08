# Elivis 문서

**English:** [docs/en/README.md](./en/README.md)

모노레포 안의 앱별 상세 설명은 아래로 나뉩니다. API 엔드포인트·환경 변수·빌드 절차 등은 각 문서를 참고하세요.

| 문서 | 내용 |
|------|------|
| [서버 (`docs/server/README.md`)](./server/README.md) | REST API (`apiServer`), 알림 실시간 서버 (`notificationServer`), 환경 변수, 인증·RBAC, 프로덕션, **팀원 워크스페이스 백필** 등 운영 스크립트 |
| [웹 (`docs/web/README.md`)](./web/README.md) | Next.js 앱, 라우트 구조, 환경 변수, Electron용 정적 빌드 |
| [관리자·보안·운영 (`docs/admin.md`)](./admin.md) | `SUPER_ADMIN` 콘솔, LDAP·공개 가입·SMTP·시스템 로그, 관련 API 요약 |
| [데스크톱 (`docs/desktop/README.md`)](./desktop/README.md) | Electron 개발·프로덕션 빌드, Windows 이슈 |
| [ESLint (`docs/lint.md`)](./lint.md) | `pnpm lint`, 패키지별 실행, Flat/레거시 설정 차이 |

**소스 위치 요약**

- `apps/web` — 웹 UI (App Router)
- `apps/desktop` — Electron 래퍼
- `apps/server/apiServer` — Fastify REST API
- `apps/server/notificationServer` — Socket.IO + Redis 구독 (푸시성 알림)
- `packages/database` — Prisma 스키마·클라이언트

루트에서 처음 온 경우: [README.md](../README.md)의 빠른 시작과 사용 방법을 먼저 보시면 됩니다.
