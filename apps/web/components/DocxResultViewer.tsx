"use client";

import type {
  DocxContent,
  DocxParagraph,
  DocxSegment,
  DocxTable,
  DocxTableRow,
} from "@repo/docs";

interface DocxResultViewerProps {
  data: DocxContent;
  onReset?: () => void;
}

function ParagraphBlock({ paragraph }: { paragraph: DocxParagraph }) {
  return (
    <p className="leading-relaxed text-slate-800">
      {paragraph.segments.map((seg: DocxSegment, i: number) => (
        <span
          key={i}
          className={
            [
              seg.style.bold && "font-semibold",
              seg.style.italic && "italic",
              seg.style.underline && "underline",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {seg.text}
        </span>
      ))}
    </p>
  );
}

function TableBlock({ table }: { table: DocxTable }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-left text-sm">
        <tbody>
          {table.rows.map((row: DocxTableRow, rowIndex: number) => (
            <tr
              key={rowIndex}
              className={
                rowIndex % 2 === 0 ? "bg-slate-50/50" : "bg-white"
              }
            >
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-slate-100 px-4 py-3 text-slate-700"
                >
                  {cell.content || "\u00A0"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocxResultViewer({ data, onReset }: DocxResultViewerProps) {
  const title =
    data.metadata?.fileName?.replace(/\.docx$/i, "") ?? "문서";
  const hasBlocks = data.blocks && data.blocks.length > 0;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {/* 헤더 카드: 제목 + 다시 업로드 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {data.metadata?.parsedAt && (
            <p className="mt-0.5 text-sm text-slate-500">
              분석 시각:{" "}
              {new Date(data.metadata.parsedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            다시 업로드
          </button>
        )}
      </div>

      {/* 본문: 종이 질감 배경 카드 */}
      <div
        className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-6 shadow-md"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      >
        <div className="space-y-5">
          {hasBlocks ? (
            data.blocks!.map((block, index) =>
              block.type === "paragraph" ? (
                <ParagraphBlock key={index} paragraph={block.data} />
              ) : (
                <TableBlock key={index} table={block.data} />
              )
            )
          ) : (
            <>
              {data.paragraphs.map((paragraph, index) => (
                <ParagraphBlock key={index} paragraph={paragraph} />
              ))}
              {data.tables?.map((table, index) => (
                <TableBlock key={index} table={table} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
