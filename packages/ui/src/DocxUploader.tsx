"use client";

import { useRef, useState } from "react";
import { DocxParser } from "@repo/docs";
import type { DocxContent } from "@repo/docs";

import { formatFileSize, isDocxFile } from "./utils/docx";

/** Heroicons-style: Cloud Arrow Up (업로드) */
function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

/** DOCX 문서 아이콘 (파란 계열) */
function DocxFileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Heroicons-style: X Mark (삭제) */
function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

interface DocxUploaderProps {
  /** 파싱 성공 시 (파싱 데이터, 업로드된 파일) 전달. Raw XML 등에 파일이 필요함 */
  onParsed?: (data: DocxContent, file: File) => void;
}

export function DocxUploader({ onParsed }: DocxUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const parserRef = useRef<DocxParser | null>(null);
  if (parserRef.current === null) {
    parserRef.current = new DocxParser();
  }
  const parser = parserRef.current;

  function validateAndSetFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!isDocxFile(file)) {
      window.alert("`.docx` 파일만 업로드할 수 있습니다.");
      return;
    }
    setSelectedFile(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    validateAndSetFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setIsParsing(true);
    try {
      const result = await parser.parse(selectedFile);
      if (result.success) {
        const data: DocxContent = {
          ...result.data,
          metadata: {
            fileName: selectedFile.name,
            parsedAt: new Date().toISOString(),
          },
        };
        onParsed?.(data, selectedFile);
      } else {
        window.alert(result.error);
      }
    } finally {
      setIsParsing(false);
    }
  }

  function handleDropZoneClick() {
    document.getElementById("docx-file-input")?.click();
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {/* 드래그 앤 드롭 영역 (DropZone) */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleDropZoneClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleDropZoneClick();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed
          bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/60
          px-8 py-14
          transition-all duration-300 ease-out
          ${isDragging
            ? "border-indigo-400 bg-indigo-50/70 shadow-md ring-2 ring-indigo-200/60"
            : "border-slate-200 hover:border-slate-300 hover:from-slate-50 hover:to-slate-100/80"
          }
        `}
      >
        <div
          className={`
            flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300
            ${isDragging ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}
          `}
        >
          <CloudUploadIcon className="h-8 w-8" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-base font-semibold tracking-tight text-slate-700">
            클릭하거나 <span className="text-indigo-600">.docx</span> 파일을 드래그하여 업로드
          </p>
          <p className="text-sm text-slate-500">
            Word 문서만 지원됩니다
          </p>
        </div>
      </div>

      {/* 숨겨진 File Input */}
      <input
        id="docx-file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden
      />

      {/* 파일 프리뷰 카드 */}
      {selectedFile && (
        <div
          className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white dark:bg-elivis-surface p-4 shadow-sm ring-1 ring-slate-900/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <DocxFileIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800">
              {selectedFile.name}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFile();
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-2"
            aria-label="파일 제거"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* 문서 분석 시작 버튼 */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!selectedFile || isParsing}
        className="w-full rounded-2xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm ring-1 ring-slate-900/5 transition-all duration-200 ease-out hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-indigo-600"
      >
        {isParsing ? "분석 중…" : "문서 분석 시작"}
      </button>
    </div>
  );
}
