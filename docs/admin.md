# 관리자 콘솔 및 보안·운영 기능

`SUPER_ADMIN` 전용 **관리자 UI**(`/admin/*`)와 이를 뒷받침하는 API·설정을 정리합니다. 일반 사용자 화면과의 차이는 [웹 문서](./web/README.md)의 라우트 구성을 함께 참고하세요.

## 목차

- [접근 권한](#접근-권한)
- [관리자 화면 (웹 라우트)](#관리자-화면-웹-라우트)
- [인증·회원가입 (공개 설정)](#인증회원가입-공개-설정)
- [LDAP 로그인](#ldap-로그인)
- [이메일 (SMTP)](#이메일-smtp)
- [시스템 로그](#시스템-로그)
- [성과(Performance) 대시보드](#성과performance-대시보드)
- [계정 정지 UI](#계정-정지-ui)
- [관련 REST API](#관련-rest-api)
- [환경 변수와 DB 설정의 관계](#환경-변수와-db-설정의-관계)

---

## 접근 권한

- 시스템 역할 `SUPER_ADMIN`만 관리자 API 및 `/admin` 하위 페이지에 접근할 수 있습니다.
- 최초 `SUPER_ADMIN` 생성은 DB에 사용자가 없을 때 출력되는 **Setup Token**으로 `/api/auth/signup`을 호출하는 방식입니다. ([서버 문서](./server/README.md#초기-관리자-생성))

---

## 관리자 화면 (웹 라우트)

| 경로 | 설명 |
|------|------|
| `/admin` | 관리자 대시 |
| `/admin/users`, `/admin/users/[id]` | 사용자 목록·상세·역할·상태 등 |
| `/admin/performance` | 전체 성과 개요(팀별 지표, 타임라인 연동) |
| `/admin/email` | **호환 리다이렉트** → `/admin/settings/email` |
| `/admin/settings/email` | SMTP 호스트·포트·발신자 등 메일 발송 설정 |
| `/admin/security/public-signup` | 공개 회원가입 허용 여부 |
| `/admin/security/ldap` | LDAP 활성화, 서버 URL, 바인드, 검색 베이스 등 |
| `/admin/system-logs` | API·알림 서버 등이 쓰는 NDJSON 시스템 로그 조회 |

사이드바·헤더 제목은 `@repo/ui`의 `AdminSidebar` / `AdminHeader`와 연동됩니다.

---

## 인증·회원가입 (공개 설정)

- **첫 사용자**: Setup Token이 있을 때만 회원가입으로 `SUPER_ADMIN`을 만들 수 있습니다.
- **그 이후**: `AuthSettings`의 **공개 회원가입**이 켜져 있어야 일반 `/signup`·`/api/auth/signup`이 허용됩니다. 관리자 **보안 › 외부 회원가입**에서 변경합니다.
- 로그인·회원가입 화면은 **`GET /api/auth/config`**(인증 불필요)로 공개 설정을 읽어 탭·링크를 표시합니다.

---

## LDAP 로그인

- 관리자 **보안 › LDAP**에서 활성화·연결 정보를 저장합니다.
- **`POST /api/auth/login`** 바디의 `mode`로 `"ldap"` | `"local"` | `"auto"`를 선택할 수 있습니다. LDAP 전용 탭·로컬 탭 UX와 맞춥니다.
- 최초 LDAP 로그인 시 서버가 해당 이메일로 사용자를 만들 수 있으며(`authProvider: LDAP`), 로컬 비밀번호 사용자와는 탭 분리 메시지로 구분됩니다.
- 연결 검증용 **`POST /api/admin/auth-settings/ldap-test`**(관리자)로 테스트 이메일·비밀번호를 보낼 수 있습니다.

루트 `.env`의 `LDAP_*` / `PUBLIC_SIGNUP_*` 값은 **`AuthSettings` 행이 처음 생성될 때만** 시드에 사용됩니다. 운영 중 값은 DB·관리자 UI가 우선입니다. (`env.example` 주석 참고)

---

## 이메일 (SMTP)

- **`/admin/settings/email`**에서 SMTP를 설정하고, 필요 시 **연결 테스트**를 수행합니다.
- API: `GET/PATCH /api/admin/smtp`, `POST /api/admin/smtp/test` (모두 `SUPER_ADMIN`).

---

## 시스템 로그

- API 서버·알림 서버 등이 **NDJSON** 형식으로 기록합니다. 기본 **루트**는 모노레포 **`.logs`** 이고, 그 아래 **`YYYY-MM-DD/`** 폴더에 `system.ndjson`, `http-api.ndjson`, `http-notification.ndjson` 등이 생성됩니다.
- **오류 전용** 파일은 날짜 폴더 안의 `errors-api.ndjson`, `errors-notification.ndjson` 이며, 메트릭 연동 시 이 파일만 수집하면 됩니다. ([서버 문서](./server/README.md#서버-오류-전용-로그-메트릭-연동용))
- **`SYSTEM_LOG_DIR`** 환경 변수로 디렉터리를 바꿀 수 있습니다. 프로덕션에서는 볼륨 마운트 경로에 맞추는 것이 좋습니다.
- 관리자 **`/admin/system-logs`**에서 파일 선택·레벨·검색·새로고침으로 조회합니다.
- API: `GET /api/admin/system-logs` (쿼리: 파일·limit·level·search 등, 구현은 컨트롤러 기준).

---

## 성과(Performance) 대시보드

- **`/admin/performance`**: 팀·개인 업무 지표를 묶어 보여 주고, 팀을 선택하면 **내 업무** 영역과 같은 타임라인(`MyWorkOverviewClient`)을 필터해 표시할 수 있습니다.
- 일반 사용자 **내 업무 › 성과** (`/mywork/performance`)는 본인 기준 유사 화면을 제공합니다.

---

## 계정 정지 UI

- 관리자가 사용자 상태를 정지 등으로 바꾼 경우, 웹 앱은 **`/account-suspended`** 등 전용 경로로 안내할 수 있습니다. (구현·미들웨어는 배포 설정에 맞게 확인)

---

## 관련 REST API

`SUPER_ADMIN`·`authenticateAdmin`이 필요한 예시:

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/admin/auth-settings` | 공개 회원가입·LDAP 등 인증 설정 조회 |
| `PATCH` | `/api/admin/auth-settings` | 인증 설정 변경 |
| `POST` | `/api/admin/auth-settings/ldap-test` | LDAP 인증 테스트 |
| `GET` | `/api/admin/smtp` | SMTP 설정 조회 |
| `PATCH` | `/api/admin/smtp` | SMTP 설정 저장 |
| `POST` | `/api/admin/smtp/test` | SMTP 발송 테스트 |
| `GET` | `/api/admin/system-logs` | 시스템 로그 파일 목록·내용 조회 |

공개(인증 없음):

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/auth/config` | 로그인/회원가입 UI용 공개 인증 설정 |

---

## 환경 변수와 DB 설정의 관계

- **`PUBLIC_SIGNUP_ENABLED`**, **`LDAP_*`**: DB에 `AuthSettings`가 **아직 없을 때** 첫 시드에만 반영되는 값입니다. 이후에는 관리자 화면에서 바꾼 값이 DB에 저장됩니다.
- **`SYSTEM_LOG_DIR`**: 로그 **루트** 디렉터리 오버라이드. 미설정 시 기본은 리포지토리 루트 **`.logs`** (하위에 날짜 폴더).

자세한 키 목록은 루트 `env.example`, `env.production.example`을 참고하세요.
