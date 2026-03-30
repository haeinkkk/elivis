import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateProjectBody {
  name: string;
  description?: string;
}

export interface ProjectParams {
  projectId: string;
}

export interface AddMemberBody {
  userId: string;
  role?: "DEPUTY_LEADER" | "MEMBER";
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// app 을 주입받아 prisma 에 접근합니다.
// ─────────────────────────────────────────────────────────────────────────────

export function createProjectController(app: FastifyInstance) {
  /**
   * POST /projects
   * 프로젝트 생성 — 생성자는 자동으로 LEADER 로 ProjectMember 에 등록
   */
  async function createProject(
    request: FastifyRequest<{ Body: CreateProjectBody }>,
    reply: FastifyReply,
  ) {
    const { name, description } = request.body;

    if (!name?.trim()) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "name 필드는 필수입니다.",
      });
    }

    const project = await app.prisma.project.create({
      data: {
        name: name.trim(),
        description,
        members: {
          create: { userId: request.userId, role: "LEADER" },
        },
      },
      include: {
        members: {
          where: { userId: request.userId },
          select: { role: true },
        },
      },
    });

    return reply.code(201).send(project);
  }

  /**
   * GET /projects/:projectId
   * 프로젝트 멤버만 조회 가능
   */
  async function getProject(
    request: FastifyRequest<{ Params: ProjectParams }>,
    reply: FastifyReply,
  ) {
    const { projectId } = request.params;

    const project = await app.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      return reply.code(404).send({
        error: "NotFound",
        message: "프로젝트를 찾을 수 없습니다.",
      });
    }

    const isMember = project.members.some((m) => m.userId === request.userId);
    if (!isMember) {
      return reply.code(403).send({
        error: "Forbidden",
        message: "프로젝트 멤버가 아닙니다.",
      });
    }

    return reply.send(project);
  }

  /**
   * POST /projects/:projectId/members
   * LEADER·DEPUTY_LEADER 만 멤버 초대/역할 변경 가능
   */
  async function addMember(
    request: FastifyRequest<{ Params: ProjectParams; Body: AddMemberBody }>,
    reply: FastifyReply,
  ) {
    const { projectId } = request.params;
    const { userId, role = "MEMBER" } = request.body;

    const member = await app.prisma.projectMember.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { role },
      create: { userId, projectId, role },
    });

    return reply.code(201).send(member);
  }

  return { createProject, getProject, addMember };
}
