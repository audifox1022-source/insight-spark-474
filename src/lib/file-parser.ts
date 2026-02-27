import * as XLSX from 'xlsx';
import { ParsedExcelData, summarizeForAI } from './excel-parser';

export interface ParsedFileData {
  fileName:     string;
  fileType:     'excel' | 'text' | 'textplain' | 'pdf' | 'word' | 'image' | 'unknown';
  textContent?: string;
  content?:     string;
  excelData?:   ParsedExcelData;
  imageDataUrl?: string;
  summary:      string;
  parseError?:  boolean;
}

const TEXT_EXTENSIONS  = /\.(txt|md|csv|json|xml|html|htm|log|yaml|yml|toml|ini|cfg|i)$/i;
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
      const worksheet  = workbook.Sheets[name];
      sheets[name]     = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
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

// ── PDF 파싱 (pdfjs-dist 로컬 패키지 사용, CDN 미사용) ──────
async function parsePDF(file: File): Promise<ParsedFileData> {
  try {
    // ✅ 로컬 설치된 pdfjs-dist 사용 (CDN 의존성 제거)
    const pdfjsLib = await import('pdfjs-dist');

    // ✅ Vite 환경에서 워커를 올바르게 설정
    // public 폴더에 워커 파일이 없으면 null로 설정 (메인 스레드에서 처리)
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        // Vite 빌드 환경: 워커 URL을 직접 import
        const workerUrl = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch {
        // 워커 설정 실패 시 비워두면 메인 스레드에서 처리
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }
    }

    const buffer     = await readAsArrayBuffer(file);
    const pdf        = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    const maxPages   = Math.min(pdf.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
      const page        = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text        = (textContent.items as any[])
        .filter((item) => item.str && item.str.trim())
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) pages.push(`[페이지 ${i}]\n${text}`);
    }

    const fullText = pages.join('\n\n');

    if (!fullText.trim() || fullText.trim().length < 10) {
      return {
        fileName:   file.name,
        fileType:   'pdf',
        textContent: 'PDF에서 텍스트를 추출하지 못했습니다 (이미지 기반 PDF일 수 있습니다).',
        summary:    `PDF — ${pdf.numPages}페이지 (텍스트 추출 실패)`,
        parseError: true,
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
      fileName:   file.name,
      fileType:   'pdf',
      textContent: 'PDF 파싱 중 오류가 발생했습니다.',
      summary:    'PDF 파싱 실패',
      parseError: true,
    };
  }
}

// ── Word 파싱 ────────────────────────────────────────────────
async function parseWord(file: File): Promise<ParsedFileData> {
  try {
    const mammoth = await import('mammoth');
    const buffer  = await readAsArrayBuffer(file);
    const result  = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text    = result.value;

    if (!text || text.trim().length < 5) {
      return {
        fileName:   file.name,
        fileType:   'word',
        textContent: 'Word 파일에서 텍스트를 추출하지 못했습니다.',
        summary:    'Word 파일 — 텍스트 추출 실패',
        parseError: true,
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
      fileName:   file.name,
      fileType:   'word',
      textContent: 'Word 파일 파싱 중 오류가 발생했습니다.',
      summary:    'Word 파싱 실패',
      parseError: true,
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

  // 알 수 없는 형식 → 텍스트로 시도
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
// ✅ parseError가 있어도 summary라도 전달, textContent 우선 활용
export function buildAIPayload(
  files: ParsedFileData[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const file of files) {
    if (file.parseError) {
      // 파싱 실패해도 summary 정보는 전달
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
      // ✅ PDF, Word, Text 모두 여기서 처리 — 전체 텍스트 전달
      payload[file.fileName] = {
        type:    file.fileType,
        content: file.textContent,   // summary가 아닌 전체 content 전달
      };
    } else if (file.content) {
      // handlePromptSubmit 경유 텍스트
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
