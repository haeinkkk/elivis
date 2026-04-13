"use client";

import { useEffect, useState } from "react";
import type { DocxManager } from "@repo/docs";

import { extractDocumentXmlFromDocx } from "./utils/extract-docx-xml";
import { formatXml } from "./utils/xml-format";

type TabId = "inspector" | "rawXml";

interface DocxAnalysisViewProps {
  docxManager: DocxManager;
  /** Raw XML 탭에서 word/document.xml 추출에 사용. 없으면 해당 탭에서 안내 메시지 표시 */
  file?: File | null;
  /** 헤더에 표시할 상태 라벨 */
  status?: string;
  /** 다시 업로드(초기 화면으로) */
  onReset?: () => void;
}

export function DocxAnalysisView({
  docxManager,
  file = null,
  status = "분석 완료",
  onReset,
}: DocxAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("inspector");
  const [rawXml, setRawXml] = useState<string | null>(null);
  const [rawXmlError, setRawXmlError] = useState<string | null>(null);
  const [rawXmlLoading, setRawXmlLoading] = useState(false);

  const data = docxManager.getDocxData();

  useEffect(() => {
    if (activeTab !== "rawXml") return;
    let cancelled = false;
    (async () => {
      if (!file) {
        setRawXmlError("Raw XML을 보려면 업로드된 파일이 필요합니다.");
        setRawXml(null);
        return;
      }
      setRawXmlLoading(true);
      setRawXmlError(null);
      try {
        const xml = await extractDocumentXmlFromDocx(file);
        if (!cancelled) setRawXml(formatXml(xml));
      } catch (e) {
        if (!cancelled) {
          setRawXmlError(e instanceof Error ? e.message : "XML 추출 실패");
          setRawXml(null);
        }
      } finally {
        if (!cancelled) setRawXmlLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, file]);

  const fileName = data?.metadata?.fileName ?? "—";
  const parsedAt = data?.metadata?.parsedAt;
  const paragraphCount = data?.paragraphs?.length ?? 0;
  const tableCount = data?.tables?.length ?? 0;

  return (
    <div className="flex h-screen w-full flex-col bg-slate-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white dark:bg-elivis-surface px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{fileName}</p>
          <p className="text-xs text-slate-500">{status}</p>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 rounded-lg border border-slate-200 bg-white dark:bg-elivis-surface px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            다시 업로드
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left Sidebar */}
        <aside className="flex w-[380px] min-w-[350px] max-w-[400px] shrink-0 flex-col border-r border-slate-200 bg-white dark:bg-elivis-surface">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("inspector")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "inspector"
                  ? "border-b-2 border-indigo-600 text-indigo-600 bg-slate-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("rawXml")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "rawXml"
                  ? "border-b-2 border-indigo-600 text-indigo-600 bg-slate-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              Raw XML
            </button>
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1 overflow-auto">
            {activeTab === "inspector" && (
              <div className="p-4 space-y-6 transition-opacity duration-200">
                {/* Metadata */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    메타데이터
                  </h3>
                  <ul className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">파일명</span>
                      <span className="truncate text-right font-medium text-slate-800">
                        {fileName}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">분석 시각</span>
                      <span className="text-slate-700">
                        {parsedAt
                          ? new Date(parsedAt).toLocaleString("ko-KR")
                          : "—"}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">생성일</span>
                      <span className="text-slate-600">—</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">수정일</span>
                      <span className="text-slate-600">—</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">페이지 수</span>
                      <span className="text-slate-600">—</span>
                    </li>
                  </ul>
                </section>

                {/* Structure stats */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    문서 구조
                  </h3>
                  <ul className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm">
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">문단 수</span>
                      <span className="font-medium text-slate-800">
                        {paragraphCount}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">테이블 수</span>
                      <span className="font-medium text-slate-800">
                        {tableCount}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-slate-500">이미지 수</span>
                      <span className="font-medium text-slate-800">0</span>
                    </li>
                  </ul>
                </section>
              </div>
            )}

            {activeTab === "rawXml" && (
              <div className="flex h-full flex-col p-4 transition-opacity duration-200">
                {rawXmlLoading && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    XML 로딩 중…
                  </p>
                )}
                {rawXmlError && !rawXmlLoading && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {rawXmlError}
                  </p>
                )}
                {rawXml && !rawXmlLoading && (
                  <pre
                    className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs leading-relaxed text-slate-300"
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  >
                    <code className="block whitespace-pre">
                      {rawXml}
                    </code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center: placeholder */}
        <main className="min-w-0 flex-1 bg-slate-50">
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-sm text-slate-400">
              콘텐츠 영역 (추가 예정)
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
