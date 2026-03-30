import type { DocxContent, DocxParagraph, DocxTable } from "./DocxTypes";

/**
 * DocxContent를 내부 상태로 보유하고, 키워드 검색·섹션별 추출·초기화를 제공하는 관리 클래스
 */
export class DocxManager {
  private docxData: DocxContent | null = null;

  /**
   * 문서 데이터를 저장한다.
   */
  setDocxData(data: DocxContent): void {
    this.docxData = data;
  }

  /**
   * 저장된 전체 문서 데이터를 반환한다. 없으면 null.
   */
  getDocxData(): DocxContent | null {
    return this.docxData;
  }

  /**
   * 모든 문단을 반환한다.
   */
  getParagraphs(): DocxParagraph[] {
    return this.docxData?.paragraphs ?? [];
  }

  /**
   * 모든 테이블을 반환한다.
   */
  getTables(): DocxTable[] {
    return this.docxData?.tables ?? [];
  }

  /**
   * 문서 내에서 query 문자열이 포함된 문단을 검색한다.
   * 대소문자 구분 없이 검색하며, 일치하는 전체 문단(세그먼트 텍스트 합친 값) 배열을 반환한다.
   */
  findText(query: string): DocxParagraph[] {
    if (!this.docxData || !query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    const results: DocxParagraph[] = [];

    for (const paragraph of this.docxData.paragraphs) {
      const fullText = paragraph.segments.map((s) => s.text).join("");
      if (fullText.toLowerCase().includes(lowerQuery)) {
        results.push(paragraph);
      }
    }

    return results;
  }

  /**
   * 문단 배열에서 startIndex(포함) ~ endIndex(미포함) 구간을 섹션으로 추출한다.
   * endIndex를 생략하면 startIndex부터 끝까지 반환한다.
   */
  getSection(startIndex: number, endIndex?: number): DocxParagraph[] {
    const paragraphs = this.docxData?.paragraphs ?? [];
    const start = Math.max(0, startIndex);
    const end = endIndex !== undefined ? Math.min(paragraphs.length, endIndex) : paragraphs.length;
    return paragraphs.slice(start, end);
  }

  /**
   * 보관 중인 문서 데이터를 초기화한다.
   */
  reset(): void {
    this.docxData = null;
  }
}
