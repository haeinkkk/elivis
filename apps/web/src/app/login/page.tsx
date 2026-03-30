"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTH_KEY = "elivis-logged-in";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 이미 로그인된 경우 메인(/)으로 리다이렉트
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(AUTH_KEY)) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // 프론트 전용: 실제 인증 없이 로그인 처리 후 메인(/)으로 이동
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(AUTH_KEY, "1");
      }
      router.replace("/");
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f7f5] px-4 py-8 sm:px-6">
      <div className="w-full max-w-[400px]">
        {/* 로고 / 타이틀 */}
        <div className="mb-10 text-center">
          <span className="inline-block text-5xl font-semibold tracking-tight text-stone-800 font-sans">
            Elivis
          </span>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm shadow-stone-200/50 transition-shadow hover:shadow-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="id"
                className="mb-1.5 block text-sm font-medium text-stone-600"
              >
                ID
              </label>
              <input
                id="id"
                type="text"
                value={id}
                onChange={(e) => setId(e.currentTarget.value)}
                placeholder="아이디를 입력하세요"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-stone-600"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
