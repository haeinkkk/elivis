import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateRoleParams {
  userId: string;
}

export interface UpdateRoleBody {
  systemRole: "SUPER_ADMIN" | "USER";
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createAdminController(app: FastifyInstance) {
  /**
   * GET /admin/users
   * SUPER_ADMIN 전용 — 전체 사용자 목록 조회
   */
  async function listUsers(_request: FastifyRequest, reply: FastifyReply) {
    const users = await app.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send(users);
  }

  /**
   * PATCH /admin/users/:userId/role
   * SUPER_ADMIN 전용 — 유저 시스템 역할 변경
   */
  async function updateUserRole(
    request: FastifyRequest<{ Params: UpdateRoleParams; Body: UpdateRoleBody }>,
    reply: FastifyReply,
  ) {
    const { userId } = request.params;
    const { systemRole } = request.body;

    const updated = await app.prisma.user.update({
      where: { id: userId },
      data: { systemRole },
      select: { id: true, email: true, systemRole: true },
    });

    return reply.send(updated);
  }

  return { listUsers, updateUserRole };
}
