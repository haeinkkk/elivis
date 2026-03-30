"use client";

import { useState } from "react";
import { DocxManager } from "@repo/docs";
import { DocxUploader } from "../../../components/DocxUploader";
import { DocxAnalysisView } from "../../../components/DocxAnalysisView";
import type { DocxContent } from "@repo/docs";

export default function DocxPage() {
  const [parsedData, setParsedData] = useState<DocxContent | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [docxManager] = useState(() => new DocxManager());

  const handleParsed = (data: DocxContent, file: File) => {
    docxManager.setDocxData(data);
    setParsedData(data);
    setAnalysisFile(file);
  };

  const handleReset = () => {
    setParsedData(null);
    setAnalysisFile(null);
    docxManager.reset();
  };

  if (parsedData) {
    return (
      <DocxAnalysisView
        docxManager={docxManager}
        file={analysisFile}
        status="분석 완료"
        onReset={handleReset}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">.docx 문서 업로드</h1>
          <p className="mt-2 text-gray-600">문서를 업로드한 뒤 분석을 시작하세요.</p>
        </div>
        <DocxUploader onParsed={handleParsed} />
      </div>
    </main>
  );
}
