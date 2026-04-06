import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AT_COOKIE } from "@/lib/server/auth.server";

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로 통과
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(AT_COOKIE)?.value;

  // 토큰 없으면 /login 으로 리다이렉트
  if (!accessToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 정적 파일·이미지·favicon 제외한 모든 경로
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
