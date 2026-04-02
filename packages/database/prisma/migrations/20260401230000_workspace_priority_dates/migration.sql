-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: WorkspacePriority + WorkspaceTask.priorityId/startDate 추가
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. WorkspacePriority 테이블 생성
CREATE TABLE "WorkspacePriority" (
    "id"          TEXT         NOT NULL,
    "workspaceId" TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "color"       TEXT         NOT NULL DEFAULT 'gray',
    "order"       INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspacePriority_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspacePriority_workspaceId_name_key"
    ON "WorkspacePriority"("workspaceId", "name");

CREATE INDEX "WorkspacePriority_workspaceId_idx"
    ON "WorkspacePriority"("workspaceId");

ALTER TABLE "WorkspacePriority"
    ADD CONSTRAINT "WorkspacePriority_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. 기존 Workspace 모두에 기본 우선순위 4개 시드
INSERT INTO "WorkspacePriority" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'urgent'), 8), id, '긴급', 'red',    0, NOW(), NOW() FROM "Workspace";

INSERT INTO "WorkspacePriority" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'high'),   8), id, '높음', 'orange', 1, NOW(), NOW() FROM "Workspace";

INSERT INTO "WorkspacePriority" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'medium'), 8), id, '보통', 'blue',   2, NOW(), NOW() FROM "Workspace";

INSERT INTO "WorkspacePriority" ("id", "workspaceId", "name", "color", "order", "createdAt", "updatedAt")
SELECT left(md5(id || 'low'),    8), id, '낮음', 'gray',   3, NOW(), NOW() FROM "Workspace";

-- 3. WorkspaceTask 에 priorityId, startDate 컬럼 추가
ALTER TABLE "WorkspaceTask"
    ADD COLUMN "priorityId" TEXT,
    ADD COLUMN "startDate"  TIMESTAMP(3);

CREATE INDEX "WorkspaceTask_priorityId_idx" ON "WorkspaceTask"("priorityId");
