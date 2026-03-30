"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Stage = "idle" | "loading" | "complete";

export function TopLoadingBar() {
  const pathname = usePathname();
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element)?.closest("a");
      if (!anchor || !anchor.getAttribute("href")) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      setStage("loading");
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // pathname이 바뀔 때마다 실행. 로딩 중이면 100% → 잠시 후 0% 리셋
  useEffect(() => {
    setStage((s) => {
      if (s !== "loading") return s;
      setTimeout(() => setStage("idle"), 350);
      return "complete";
    });
  }, [pathname]);

  const width =
    stage === "idle" ? "0%" : stage === "loading" ? "80%" : "100%";
  const visible = stage !== "idle";

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent pointer-events-none"
      aria-hidden
    >
      <div
        className={`h-full bg-stone-700 transition-[width] duration-300 ease-out transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ width }}
      />
    </div>
  );
}
