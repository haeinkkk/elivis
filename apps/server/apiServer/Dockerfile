# ─────────────────────────────────────────────────────────────────────────────
# 참조 위치: docker-compose.prod.yml > services.elivis-api-server.build.dockerfile
# 빌드 컨텍스트: 모노레포 루트(.)  ← docker compose -f docker-compose.prod.yml build
#
# ※ 개발(pnpm dev)에서는 이 파일을 사용하지 않습니다.
#    개발 DB만 docker-compose.yml(elivis-postgres)로 띄우고,
#    서버·웹·데스크톱은 로컬에서 tsx watch / next dev 로 실행합니다.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1 · builder ────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable pnpm
WORKDIR /app

# 1) 패키지 매니페스트만 먼저 복사 ─ 소스가 바뀌어도 의존성 레이어 재활용
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/tsconfig/package.json        ./packages/tsconfig/
COPY packages/eslint-config/package.json   ./packages/eslint-config/
COPY packages/database/package.json        ./packages/database/
COPY packages/types/package.json           ./packages/types/
COPY apps/server/apiServer/package.json    ./apps/server/apiServer/

RUN pnpm install --frozen-lockfile

# 2) 소스 복사 후 빌드 (prisma generate → tsc)
COPY packages/tsconfig/      ./packages/tsconfig/
COPY packages/eslint-config/ ./packages/eslint-config/
COPY packages/database/      ./packages/database/
COPY packages/types/         ./packages/types/
COPY apps/server/apiServer/  ./apps/server/apiServer/

RUN pnpm exec turbo build --filter=@repo/database --filter=@repo/api-server

# ── Stage 2 · runner ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

# dumb-init: PID 1 시그널 처리 (SIGTERM → graceful shutdown)
RUN apk add --no-cache dumb-init

WORKDIR /app
ENV NODE_ENV=production

# 런타임에 필요한 파일만 선택적으로 복사 (빌드 툴 제외)
COPY --from=builder /app/node_modules                           ./node_modules
COPY --from=builder /app/packages/database/dist                 ./packages/database/dist
COPY --from=builder /app/packages/database/package.json         ./packages/database/
COPY --from=builder /app/packages/types/dist                    ./packages/types/dist
COPY --from=builder /app/packages/types/package.json            ./packages/types/
COPY --from=builder /app/apps/server/apiServer/dist             ./apps/server/apiServer/dist
COPY --from=builder /app/apps/server/apiServer/package.json     ./apps/server/apiServer/

WORKDIR /app/apps/server/apiServer
EXPOSE 4000

# 보안: root 대신 node 유저로 실행
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
