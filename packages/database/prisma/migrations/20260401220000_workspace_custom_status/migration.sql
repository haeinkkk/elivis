-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: WorkspaceStatus 커스텀 상태 테이블 + WorkspaceTask.status → statusId
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. WorkspaceStatus 테이블 생성
CREATE TABLE "WorkspaceStatus" (
    "id"          TEXT         NOT NULL,
    "workspaceId" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "color"       TEXT         NOT NULL DEFAULT 'gray',
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceStatus_workspaceId_name_key"
    ON "WorkspaceStatus"("workspaceId", "name");

CREATE INDEX "WorkspaceStatus_workspaceId_idx"
    ON "WorkspaceStatus"("workspaceId");

ALTER TABLE "WorkspaceStatus"
    ADD CONSTRAINT "WorkspaceStatus_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. 기존 Workspace 모두에 기본 상태 3개 시드
INSERT INTO "WorkspaceStatus" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'todo'),  8), id, '할 일',   'gray',  0, NOW(), NOW() FROM "Workspace";

INSERT INTO "WorkspaceStatus" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'doing'), 8), id, '진행 중', 'blue',  1, NOW(), NOW() FROM "Workspace";

INSERT INTO "WorkspaceStatus" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'done'),  8), id, '완료',    'green', 2, NOW(), NOW() FROM "Workspace";

-- 3. WorkspaceTask.status (enum) → statusId (text) 변환
-- 먼저 default 값 제거 (enum 타입 default가 있을 수 있음)
ALTER TABLE "WorkspaceTask" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "WorkspaceTask"
    ALTER COLUMN "status" TYPE TEXT USING "status"::text;

ALTER TABLE "WorkspaceTask" RENAME COLUMN "status" TO "statusId";

-- 4. 기존 enum 값을 새 WorkspaceStatus ID 로 교체
UPDATE "WorkspaceTask" t
SET "statusId" = CASE t."statusId"
    WHEN 'TODO'  THEN left(md5(t."workspaceId" || 'todo'),  8)
    WHEN 'DOING' THEN left(md5(t."workspaceId" || 'doing'), 8)
    WHEN 'DONE'  THEN left(md5(t."workspaceId" || 'done'),  8)
    ELSE               left(md5(t."workspaceId" || 'todo'),  8)
END;

-- 5. 인덱스 재구성
DROP INDEX IF EXISTS "WorkspaceTask_workspaceId_status_order_idx";
CREATE INDEX "WorkspaceTask_statusId_idx"
    ON "WorkspaceTask"("statusId");
CREATE INDEX "WorkspaceTask_workspaceId_statusId_order_idx"
    ON "WorkspaceTask"("workspaceId", "statusId", "order");

-- 6. 구 enum 타입 제거 (CASCADE로 잔존 종속 제거)
DROP TYPE IF EXISTS "WorkspaceTaskStatus" CASCADE;
