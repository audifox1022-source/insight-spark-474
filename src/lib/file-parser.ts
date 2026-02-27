// ============================================================
// file-parser.ts  —  전체 코드 (최종)
// ============================================================

import * as XLSX from 'xlsx';
import { ParsedExcelData, summarizeForAI } from './excel-parser';

// ✅ pdfjs-dist 정적 임포트 (동적 임포트 제거 → Vercel 404 해결)
import * as pdfjsLib from 'pdfjs-dist';

// ✅ Worker를 CDN URL로 직접 지정 (Vercel 빌드 시 청크 분리 문제 회피)
//    pdfjs-dist 버전과 반드시 일치시켜야 함
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedFileData {
  fileName:      string;
  fileType:      'excel' | 'text' | 'textplain' | 'pdf' | 'word' | 'image' | 'unknown';
  textContent?:  string;
  content?:      string;
  excelData?:    ParsedExcelData;
  imageDataUrl?: string;
  summary:       string;
  parseError?:   boolean;
}

const TEXT_EXTENSIONS  = /\.(txt|md|csv|json|xml|html|htm|log|yaml|yml|toml|ini|cfg)$/i;
const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/i;
const PDF_EXTENSION    = /\.pdf$/i;
const WORD_EXTENSION   = /\.docx$/i;
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;

// ── 공통 파일 읽기 헬퍼 ──────────────────────────────────────
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('텍스트 읽기 실패'));
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('ArrayBuffer 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('DataURL 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

// ── Excel 파싱 ───────────────────────────────────────────────
async function parseExcel(file: File): Promise<ParsedFileData> {
  try {
    const buffer   = await readAsArrayBuffer(file);
    const data     = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheets: Record<string, Record<string, unknown>[]> = {};
    const sheetNames = workbook.SheetNames;

    sheetNames.forEach((name) => {
      const worksheet = workbook.Sheets[name];
      sheets[name]    = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    });

    const totalRows = Object.values(sheets).reduce((acc, s) => acc + s.length, 0);

    return {
      fileName:  file.name,
      fileType:  'excel',
      excelData: { sheetNames, sheets },
      summary:   `Excel 파일 — 시트 ${sheetNames.length}개, 총 ${totalRows}행`,
    };
  } catch (err) {
    console.error('Excel 파싱 오류:', err);
    return {
      fileName:   file.name,
      fileType:   'excel',
      summary:    'Excel 파싱 실패',
      parseError: true,
    };
  }
}

// ── PDF 파싱 ─────────────────────────────────────────────────
// ✅ 동적 import() 완전 제거
// ✅ pdfjs-dist 정적 임포트 + CDN Worker 사용
async function parsePDF(file: File): Promise<ParsedFileData> {
  try {
    const buffer = await readAsArrayBuffer(file);
    const pdf    = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    const pages: string[] = [];
    const maxPages        = Math.min(pdf.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
      const page        = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text        = (textContent.items as any[])
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) pages.push(`[페이지 ${i}]\n${text}`);
    }

    const fullText = pages.join('\n\n');

    if (!fullText.trim() || fullText.trim().length < 10) {
      return {
        fileName:    file.name,
        fileType:    'pdf',
        textContent: 'PDF에서 텍스트를 추출하지 못했습니다 (이미지 기반 PDF일 수 있습니다).',
        summary:     `PDF — ${pdf.numPages}페이지 (텍스트 추출 실패)`,
        parseError:  true,
      };
    }

    return {
      fileName:    file.name,
      fileType:    'pdf',
      textContent: fullText.slice(0, 60000),
      summary:     `PDF — ${pdf.numPages}페이지, ${fullText.length}자 추출 성공`,
    };
  } catch (err) {
    console.error('PDF 파싱 오류:', err);
    return {
      fileName:    file.name,
      fileType:    'pdf',
      textContent: 'PDF 파싱 중 오류가 발생했습니다.',
      summary:     'PDF 파싱 실패',
      parseError:  true,
    };
  }
}

// ── Word 파싱 ────────────────────────────────────────────────
// mammoth는 용량이 작아 동적 임포트 유지해도 무방하지만
// 안정성을 위해 정적 임포트로 변경
import mammoth from 'mammoth';

async function parseWord(file: File): Promise<ParsedFileData> {
  try {
    const buffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text   = result.value;

    if (!text || text.trim().length < 5) {
      return {
        fileName:    file.name,
        fileType:    'word',
        textContent: 'Word 파일에서 텍스트를 추출하지 못했습니다.',
        summary:     'Word 파일 — 텍스트 추출 실패',
        parseError:  true,
      };
    }

    return {
      fileName:    file.name,
      fileType:    'word',
      textContent: text.slice(0, 60000),
      summary:     `Word 파일 — ${text.length}자 추출 성공`,
    };
  } catch (err) {
    console.error('Word 파싱 오류:', err);
    return {
      fileName:    file.name,
      fileType:    'word',
      textContent: 'Word 파일 파싱 중 오류가 발생했습니다.',
      summary:     'Word 파싱 실패',
      parseError:  true,
    };
  }
}

// ── 이미지 파싱 ──────────────────────────────────────────────
async function parseImage(file: File): Promise<ParsedFileData> {
  const dataUrl = await readAsDataURL(file);
  return {
    fileName:     file.name,
    fileType:     'image',
    imageDataUrl: dataUrl,
    summary:      `이미지 파일 — ${(file.size / 1024).toFixed(0)}KB`,
  };
}

// ── 텍스트 파일 파싱 ─────────────────────────────────────────
async function parseTextFile(file: File): Promise<ParsedFileData> {
  const text = await readAsText(file);
  return {
    fileName:    file.name,
    fileType:    'text',
    textContent: text.slice(0, 60000),
    summary:     `텍스트 파일 — ${text.length}자`,
  };
}

// ── 메인 파서 ────────────────────────────────────────────────
export async function parseFile(file: File): Promise<ParsedFileData> {
  const name = file.name;

  if (EXCEL_EXTENSIONS.test(name)) return parseExcel(file);
  if (PDF_EXTENSION.test(name))    return parsePDF(file);
  if (WORD_EXTENSION.test(name))   return parseWord(file);
  if (IMAGE_EXTENSIONS.test(name)) return parseImage(file);
  if (TEXT_EXTENSIONS.test(name))  return parseTextFile(file);
  if (name.endsWith('.csv'))        return parseTextFile(file);

  try {
    return await parseTextFile(file);
  } catch {
    return {
      fileName:   file.name,
      fileType:   'unknown',
      summary:    '지원하지 않는 파일 형식',
      parseError: true,
    };
  }
}

// ── AI 페이로드 빌더 ─────────────────────────────────────────
export function buildAIPayload(
  files: ParsedFileData[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const file of files) {
    if (file.parseError) {
      payload[file.fileName] = {
        type:  file.fileType,
        error: true,
        note:  file.summary,
      };
      continue;
    }

    if (file.fileType === 'excel' && file.excelData) {
      payload[file.fileName] = {
        type: 'excel',
        data: summarizeForAI(file.excelData.sheets),
      };
    } else if (file.textContent) {
      // ✅ PDF, Word, Text 전체 텍스트 전달
      payload[file.fileName] = {
        type:    file.fileType,
        content: file.textContent,
      };
    } else if (file.content) {
      payload[file.fileName] = {
        type:    file.fileType,
        content: file.content,
      };
    } else if (file.fileType === 'image') {
      payload[file.fileName] = {
        type: 'image',
        note: '이미지 파일 (텍스트 추출 불가)',
      };
    }
  }

  return payload;
}
