import { type ProjectRole, type SystemRole } from "@prisma/client";

import { prisma } from "./index";

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectPermissionResult {
  isMember: boolean;
  role: ProjectRole | null;
  isLeader: boolean;
  isDeputyLeader: boolean;
  isManager: boolean; // LEADER || DEPUTY_LEADER
}

// ─────────────────────────────────────────────────────────────────────────────
// 시스템 권한
// ─────────────────────────────────────────────────────────────────────────────

/** 유저의 시스템 역할을 조회합니다. 존재하지 않는 userId 이면 null 반환 */
export async function getSystemRole(
  userId: string,
): Promise<SystemRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  return user?.systemRole ?? null;
}

/** 유저가 SUPER_ADMIN 인지 확인합니다 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getSystemRole(userId);
  return role === "SUPER_ADMIN";
}

// ─────────────────────────────────────────────────────────────────────────────
// 프로젝트 권한
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 특정 유저의 특정 프로젝트 내 권한을 조회합니다.
 *
 * @example
 * const perm = await checkProjectPermission(userId, projectId);
 * if (!perm.isMember) throw new Error("프로젝트 멤버가 아닙니다");
 * if (!perm.isManager) throw new Error("관리자 권한이 필요합니다");
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
): Promise<ProjectPermissionResult> {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { role: true },
  });

  if (!membership) {
    return {
      isMember: false,
      role: null,
      isLeader: false,
      isDeputyLeader: false,
      isManager: false,
    };
  }

  const { role } = membership;
  return {
    isMember: true,
    role,
    isLeader: role === "LEADER",
    isDeputyLeader: role === "DEPUTY_LEADER",
    isManager: role === "LEADER" || role === "DEPUTY_LEADER",
  };
}

/**
 * SUPER_ADMIN 이거나, 해당 프로젝트의 멤버인지 확인합니다.
 * API 게이트웨이 레벨에서 간단히 쓸 때 유용합니다.
 */
export async function canAccessProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const [admin, perm] = await Promise.all([
    isSuperAdmin(userId),
    checkProjectPermission(userId, projectId),
  ]);
  return admin || perm.isMember;
}
