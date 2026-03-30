import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

import { checkProjectPermission, isSuperAdmin } from "@repo/database";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 컨텍스트 타입 확장
// ─────────────────────────────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyRequest {
    /** 인증된 유저 ID — authenticateUser 미들웨어 실행 이후 세팅됨 */
    userId: string;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 미들웨어 (preHandler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Access Token 검증 미들웨어.
 * Authorization: Bearer <accessToken> 헤더를 파싱하고
 * 서명·만료를 검증한 뒤 request.userId 를 세팅합니다.
 */
export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request);
  if (!token) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "인증 토큰이 없습니다.",
    });
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");

  try {
    const payload = jwt.verify(token, secret) as { sub: string; type: string };
    if (payload.type !== "access") {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "올바른 Access Token이 아닙니다.",
      });
    }
    request.userId = payload.sub;
  } catch {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "만료되었거나 유효하지 않은 토큰입니다.",
    });
  }
}

/**
 * SUPER_ADMIN 전용 접근 미들웨어.
 * `authenticateUser` 이후에 체이닝하여 사용하세요.
 */
export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const admin = await isSuperAdmin(request.userId);
  if (!admin) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "SUPER_ADMIN 권한이 필요합니다.",
    });
  }
}

/**
 * 특정 프로젝트의 LEADER 또는 DEPUTY_LEADER 전용 접근 미들웨어.
 * 라우트 파라미터 `:projectId` 가 존재해야 합니다.
 * `authenticateUser` 이후에 체이닝하여 사용하세요.
 */
export async function authenticateProjectManager(
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { projectId } = request.params;
  const perm = await checkProjectPermission(request.userId, projectId);

  if (!perm.isMember) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "해당 프로젝트의 멤버가 아닙니다.",
    });
  }
  if (!perm.isManager) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "LEADER 또는 DEPUTY_LEADER 권한이 필요합니다.",
    });
  }
}

/**
 * 특정 프로젝트 멤버 여부만 확인하는 미들웨어.
 * `authenticateUser` 이후에 체이닝하여 사용하세요.
 */
export async function authenticateProjectMember(
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { projectId } = request.params;
  const perm = await checkProjectPermission(request.userId, projectId);

  if (!perm.isMember) {
    return reply.code(403).send({
      error: "Forbidden",
      message: "해당 프로젝트의 멤버가 아닙니다.",
    });
  }
}
