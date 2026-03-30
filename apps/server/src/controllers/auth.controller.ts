import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import {
  generateAccessToken,
  generateRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateTokens,
  verifyRefreshToken,
} from "../services/token.service";
import {
  clearSetupToken,
  isSetupModeActive,
  validateSetupToken,
} from "../services/setup.service";

// ─────────────────────────────────────────────────────────────────────────────
// 요청 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface SignupBody {
  email: string;
  password: string;
  name?: string;
  /** 최초 SUPER_ADMIN 생성 시에만 필요. 이후 유저는 무시됨 */
  setupToken?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 컨트롤러 팩토리
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthController(app: FastifyInstance) {
  /**
   * POST /api/auth/signup
   *
   * ┌─ DB에 유저 0명 ──────────────────────────────────────────────────────────┐
   * │  setupToken 필수. 서버 로그에 출력된 토큰과 일치해야 SUPER_ADMIN 생성     │
   * │  일치하지 않으면 401 반환                                                 │
   * ├─ DB에 유저 1명 이상 ──────────────────────────────────────────────────────┤
   * │  setupToken 무시. 일반 USER로 가입 처리                                   │
   * └──────────────────────────────────────────────────────────────────────────┘
   */
  async function signup(
    request: FastifyRequest<{ Body: SignupBody }>,
    reply: FastifyReply,
  ) {
    const { email, password, name, setupToken } = request.body;

    if (!email || !password) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "email과 password는 필수입니다.",
      });
    }

    const userCount = await app.prisma.user.count();
    const isFirstUser = userCount === 0;

    // ── 최초 유저: SUPER_ADMIN 생성 경로 ──────────────────────────────────────
    if (isFirstUser) {
      if (!isSetupModeActive()) {
        // 서버가 재시작됐거나 이미 첫 유저가 생성된 상태
        return reply.code(503).send({
          error: "SetupUnavailable",
          message: "Setup 토큰이 만료됐습니다. 서버를 재시작하세요.",
        });
      }

      if (!setupToken || !validateSetupToken(setupToken)) {
        return reply.code(401).send({
          error: "Unauthorized",
          message: "관리자 인증 토큰이 틀립니다.",
        });
      }
    }

    // ── 이메일 중복 확인 ──────────────────────────────────────────────────────
    const exists = await app.prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(409).send({
        error: "Conflict",
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    // ── 유저 생성 ──────────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, 12);
    const user = await app.prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        systemRole: isFirstUser ? "SUPER_ADMIN" : "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        createdAt: true,
      },
    });

    // 첫 번째 SUPER_ADMIN이 생성됐으면 토큰 즉시 비활성화
    if (isFirstUser) {
      clearSetupToken();
      app.log.info(`SUPER_ADMIN 계정이 생성되었습니다. Setup 토큰이 비활성화됩니다.`);
    }

    return reply.code(201).send({ user });
  }

  /**
   * POST /api/auth/login
   * 로그인 → AccessToken(1일) + RefreshToken(15일) 발급
   */
  async function login(
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply,
  ) {
    const { email, password } = request.body;

    const user = await app.prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.password));

    // 이메일·비밀번호 모두 동일한 메시지로 처리 (사용자 열거 방지)
    if (!user || !valid) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id),
      generateRefreshToken(user.id, app.redis),
    ]);

    return reply.send({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
      },
    });
  }

  /**
   * POST /api/auth/refresh
   * Refresh Token 검증 후 토큰 쌍 재발급 (Rotation)
   */
  async function refresh(
    request: FastifyRequest<{ Body: RefreshBody }>,
    reply: FastifyReply,
  ) {
    const { refreshToken } = request.body;
    if (!refreshToken) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "refreshToken이 없습니다.",
      });
    }

    try {
      const tokens = await rotateTokens(refreshToken, app.redis);
      return reply.send(tokens);
    } catch {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "유효하지 않거나 만료된 refreshToken입니다.",
      });
    }
  }

  /**
   * POST /api/auth/logout
   * 현재 기기 로그아웃 — 해당 RefreshToken만 폐기
   */
  async function logout(
    request: FastifyRequest<{ Body: RefreshBody }>,
    reply: FastifyReply,
  ) {
    const { refreshToken } = request.body;
    if (!refreshToken) {
      return reply.code(400).send({
        error: "BadRequest",
        message: "refreshToken이 없습니다.",
      });
    }

    try {
      const payload = await verifyRefreshToken(refreshToken, app.redis);
      await revokeRefreshToken(payload.sub, payload.jti, app.redis);
    } catch {
      // 이미 만료됐어도 로그아웃은 성공으로 처리
    }

    return reply.code(204).send();
  }

  /**
   * POST /api/auth/logout/all
   * 전체 기기 로그아웃 — 해당 유저의 모든 RefreshToken 폐기
   */
  async function logoutAll(request: FastifyRequest, reply: FastifyReply) {
    await revokeAllRefreshTokens(request.userId, app.redis);
    return reply.code(204).send();
  }

  return { signup, login, refresh, logout, logoutAll };
}
