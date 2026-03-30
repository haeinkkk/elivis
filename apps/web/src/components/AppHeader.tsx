"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const AUTH_KEY = "elivis-logged-in";

interface AppHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function AppHeader({ onMenuClick, title = "홈" }: AppHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!userMenuRef.current || !target) return;
      if (!userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userMenuOpen]);

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
    setUserMenuOpen(false);
    router.replace("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-stone-100 bg-white/80 px-3 backdrop-blur-sm sm:gap-3 sm:px-4 md:gap-4">
      {/* 좌측: 사이드바 토글(모바일 전용) */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 md:hidden"
        aria-label="메뉴 열기"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* 가운데: 검색(폭은 기존 max 기준 유지) */}
      <div className="flex min-w-0 flex-1 items-center justify-center px-1 sm:justify-start">
        <div
          className={`
            hidden flex w-full items-center gap-2 rounded-xl border bg-stone-50/80 px-3 py-2 transition-all
            sm:flex sm:max-w-[200px] md:max-w-xs lg:max-w-md
            ${searchFocused ? "border-amber-300 ring-2 ring-amber-300/20" : "border-stone-200"}
          `}
        >
          <svg className="h-4 w-4 shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            placeholder="검색…"
            aria-label={`${title} 검색`}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
        </div>
      </div>

      {/* 우측: 프로필(클릭 -> 드롭다운) */}
      <div ref={userMenuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-stone-100 focus:outline-none"
          aria-label="사용자 메뉴"
          aria-expanded={userMenuOpen}
        >
          <div className="h-8 w-8 rounded-full bg-stone-300" />
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-stone-300" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-800">사용자</p>
                <p className="truncate text-xs text-stone-500">user@example.com</p>
              </div>
            </div>
            <div className="h-px bg-stone-100" />
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
              onClick={() => setUserMenuOpen(false)}
            >
              <span>내 설정</span>
              <span className="text-xs text-stone-400">미구현</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <span>로그아웃</span>
              <span className="text-xs text-red-400">↩</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
