-- WorkspacePriority에 value 컬럼 추가 (높을수록 우선순위 높음, 기본값 0)
ALTER TABLE "WorkspacePriority" ADD COLUMN "value" INTEGER NOT NULL DEFAULT 0;
