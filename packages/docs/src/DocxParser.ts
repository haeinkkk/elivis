import mammoth from "mammoth";
import type {
  DocxBlock,
  DocxContent,
  DocxParagraph,
  DocxSegment,
  DocxStyle,
  DocxParseResult,
  DocxTable,
  DocxTableRow,
  DocxTableCell,
} from "./DocxTypes";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_EXT = ".docx";

/**
 * 브라우저 File 객체를 DocxContent로 파싱하는 클래스.
 * mammoth 라이브러리를 사용하며, 파싱 오류는 DocxParseResult로 타입 안전하게 반환한다.
 */
export class DocxParser {
  /**
   * File 객체가 .docx 형식인지 검사
   */
  private static isDocxFile(file: File): boolean {
    return (
      file.type === DOCX_MIME ||
      file.name.toLowerCase().endsWith(DOCX_EXT)
    );
  }

  /**
   * HTML 문자열을 DocxContent 구조로 변환 (DOM 또는 폴백 파싱)
   */
  private static htmlToDocxContent(html: string): DocxContent {
    if (typeof DOMParser !== "undefined") {
      return DocxParser.parseHtmlWithDom(html);
    }
    return DocxParser.parseHtmlFallback(html);
  }

  /**
   * DOMParser를 사용한 HTML 파싱 (브라우저 환경)
   * 문단과 테이블의 원본 순서를 blocks에 보존한다.
   */
  private static parseHtmlWithDom(html: string): DocxContent {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const paragraphs: DocxParagraph[] = [];
    const tables: DocxTable[] = [];
    const blocks: DocxBlock[] = [];

    const body = doc.body;
    if (!body) {
      return { paragraphs: [], rawHtml: html };
    }

    for (const node of Array.from(body.childNodes)) {
      if (node.nodeType !== 1) continue;
      const el = node as HTMLElement;

      if (el.tagName === "P") {
        const paragraph = DocxParser.parseParagraphElement(el);
        paragraphs.push(paragraph);
        blocks.push({ type: "paragraph", data: paragraph });
      } else if (el.tagName === "TABLE") {
        const table = DocxParser.parseTableElement(el);
        tables.push(table);
        blocks.push({ type: "table", data: table });
      }
    }

    return {
      paragraphs,
      tables: tables.length > 0 ? tables : undefined,
      blocks: blocks.length > 0 ? blocks : undefined,
      rawHtml: html,
    };
  }

  /**
   * <p> 요소를 DocxParagraph로 변환 (인라인 스타일 추출)
   */
  private static parseParagraphElement(p: HTMLElement): DocxParagraph {
    const segments: DocxSegment[] = [];

    const pushSegment = (node: Node, style: DocxStyle): void => {
      if (node.nodeType === 3) {
        const text = node.textContent?.trim();
        if (text) segments.push({ text, style });
        return;
      }
      if (node.nodeType === 1) {
        const el = node as HTMLElement;
        const text = el.textContent?.trim();
        if (text) segments.push({ text, style });
      }
    };

    const walk = (node: Node, style: DocxStyle): void => {
      if (node.nodeType === 3) {
        pushSegment(node, style);
        return;
      }
      if (node.nodeType !== 1) return;
      const el = node as HTMLElement;
      const tag = el.tagName;
      const nextStyle: DocxStyle = { ...style };
      if (tag === "STRONG" || tag === "B") nextStyle.bold = true;
      else if (tag === "EM" || tag === "I") nextStyle.italic = true;
      else if (tag === "U") nextStyle.underline = true;

      if (el.childNodes.length === 0) {
        const text = el.textContent?.trim();
        if (text) segments.push({ text, style: nextStyle });
      } else {
        for (const child of Array.from(el.childNodes)) {
          walk(child, nextStyle);
        }
      }
    };

    for (const child of Array.from(p.childNodes)) {
      walk(child, {});
    }

    if (segments.length === 0) {
      const text = p.textContent?.trim();
      if (text) segments.push({ text, style: {} });
    }

    return { segments };
  }

  /**
   * <table> 요소를 DocxTable로 변환
   */
  private static parseTableElement(table: HTMLElement): DocxTable {
    const rows: DocxTableRow[] = [];
    const trs = table.querySelectorAll("tr");

    for (const tr of Array.from(trs)) {
      const cells: DocxTableCell[] = [];
      const tds = tr.querySelectorAll("td, th");
      for (const td of Array.from(tds)) {
        cells.push({ content: (td as HTMLElement).textContent?.trim() ?? "" });
      }
      if (cells.length > 0) {
        rows.push({ cells });
      }
    }

    return { rows };
  }

  /**
   * DOM이 없을 때의 폴백: HTML 태그 제거 후 단일 문단으로 반환
   */
  private static parseHtmlFallback(html: string): DocxContent {
    const stripped = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      paragraphs: [{ segments: [{ text: stripped || "(내용 없음)", style: {} }] }],
      rawHtml: html,
    };
  }

  /**
   * .docx File을 DocxContent로 파싱.
   * 형식 오류 또는 mammoth 파싱 실패 시 DocxParseResult.success === false 로 반환.
   */
  async parse(file: File): Promise<DocxParseResult> {
    if (!DocxParser.isDocxFile(file)) {
      return {
        success: false,
        error: "지원하지 않는 파일 형식입니다. .docx 파일만 업로드할 수 있습니다.",
      };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const content = DocxParser.htmlToDocxContent(result.value);

      return {
        success: true,
        data: content,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `파싱 중 오류가 발생했습니다: ${message}`,
      };
    }
  }
}
