import type { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────────────────────

const ACCESS_TTL_SEC  = 60 * 60 * 24;       // 1일
const REFRESH_TTL_SEC = 60 * 60 * 24 * 15;  // 15일

const redisKey = (userId: string, jti: string) => `rt:${userId}:${jti}`;

// ─────────────────────────────────────────────────────────────────────────────
// 페이로드 타입
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessPayload {
  sub: string; // userId
  type: "access";
}

export interface RefreshPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

// ─────────────────────────────────────────────────────────────────────────────
// 비밀 키 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function accessSecret(): string {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s) throw new Error("JWT_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");
  return s;
}

function refreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s) throw new Error("JWT_REFRESH_SECRET 환경변수가 설정되지 않았습니다.");
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 생성
// ─────────────────────────────────────────────────────────────────────────────

export function generateAccessToken(userId: string): string {
  const payload: AccessPayload = { sub: userId, type: "access" };
  return jwt.sign(payload, accessSecret(), { expiresIn: ACCESS_TTL_SEC });
}

/** Refresh 토큰을 생성하고 Redis에 저장합니다. */
export async function generateRefreshToken(
  userId: string,
  redis: Redis,
): Promise<string> {
  const jti = uuidv4();
  const payload: RefreshPayload = { sub: userId, jti, type: "refresh" };
  const token = jwt.sign(payload, refreshSecret(), { expiresIn: REFRESH_TTL_SEC });

  // Redis에 jti 저장 (값은 1; 존재 여부만 확인)
  await redis.set(redisKey(userId, jti), "1", "EX", REFRESH_TTL_SEC);

  return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 검증
// ─────────────────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, accessSecret()) as AccessPayload;
  if (payload.type !== "access") throw new Error("유효하지 않은 토큰 타입입니다.");
  return payload;
}

/** Refresh 토큰의 JWT 서명 + Redis 존재 여부를 모두 검증합니다. */
export async function verifyRefreshToken(
  token: string,
  redis: Redis,
): Promise<RefreshPayload> {
  const payload = jwt.verify(token, refreshSecret()) as RefreshPayload;
  if (payload.type !== "refresh") throw new Error("유효하지 않은 토큰 타입입니다.");

  const exists = await redis.exists(redisKey(payload.sub, payload.jti));
  if (!exists) throw new Error("만료되었거나 이미 로그아웃된 토큰입니다.");

  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 폐기
// ─────────────────────────────────────────────────────────────────────────────

/** 단일 Refresh 토큰을 폐기합니다 (로그아웃). */
export async function revokeRefreshToken(
  userId: string,
  jti: string,
  redis: Redis,
): Promise<void> {
  await redis.del(redisKey(userId, jti));
}

/** 유저의 모든 Refresh 토큰을 폐기합니다 (전체 기기 로그아웃). */
export async function revokeAllRefreshTokens(
  userId: string,
  redis: Redis,
): Promise<void> {
  const keys = await redis.keys(`rt:${userId}:*`);
  if (keys.length > 0) await redis.del(...keys);
}

// ─────────────────────────────────────────────────────────────────────────────
// 토큰 재발급 (Rotation)
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh 토큰을 검증하고, 기존 토큰을 폐기한 뒤 새 토큰 쌍을 반환합니다.
 * Refresh Token Rotation 패턴으로 탈취 탐지가 가능합니다.
 */
export async function rotateTokens(
  oldRefreshToken: string,
  redis: Redis,
): Promise<TokenPair> {
  const payload = await verifyRefreshToken(oldRefreshToken, redis);

  // 기존 refresh 토큰 즉시 폐기
  await revokeRefreshToken(payload.sub, payload.jti, redis);

  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload.sub),
    generateRefreshToken(payload.sub, redis),
  ]);

  return { accessToken, refreshToken };
}
