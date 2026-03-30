/**
 * 스타일 정보 (볼드, 이탤릭, 폰트 크기 등)
 */
export interface DocxStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

/**
 * 스타일이 적용된 텍스트 세그먼트 (한 문단 내 일부)
 */
export interface DocxSegment {
  text: string;
  style: DocxStyle;
}

/**
 * 문단 데이터: 텍스트와 스타일 정보를 가진 세그먼트 배열
 */
export interface DocxParagraph {
  segments: DocxSegment[];
}

/**
 * 테이블 셀
 */
export interface DocxTableCell {
  content: string;
}

/**
 * 테이블 행
 */
export interface DocxTableRow {
  cells: DocxTableCell[];
}

/**
 * 테이블 데이터
 */
export interface DocxTable {
  rows: DocxTableRow[];
}

/**
 * 문서 내 블록 요소 (문단 또는 테이블)
 */
export type DocxBlock = { type: "paragraph"; data: DocxParagraph } | { type: "table"; data: DocxTable };

/**
 * 문서 메타데이터 (파일명, 파싱 시각 등)
 */
export interface DocxMetadata {
  fileName?: string;
  parsedAt?: string;
}

/**
 * .docx 파싱 결과 전체 콘텐츠
 */
export interface DocxContent {
  /** 메타데이터 */
  metadata?: DocxMetadata;
  /** 문단 목록 */
  paragraphs: DocxParagraph[];
  /** 테이블 목록 (선택) */
  tables?: DocxTable[];
  /** 순서대로 정렬된 블록 (문단 + 테이블 혼합 시 사용) */
  blocks?: DocxBlock[];
  /** mammoth 원본 HTML (디버깅/폴백용) */
  rawHtml?: string;
}

/**
 * 파싱 결과 (성공 시)
 */
export interface DocxParseSuccess {
  success: true;
  data: DocxContent;
}

/**
 * 파싱 결과 (실패 시)
 */
export interface DocxParseFailure {
  success: false;
  error: string;
  messages?: string[];
}

/**
 * 파싱 결과 유니온 타입
 */
export type DocxParseResult = DocxParseSuccess | DocxParseFailure;
