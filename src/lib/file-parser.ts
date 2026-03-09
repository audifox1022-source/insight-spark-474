// file-parser.ts — 전체 최종본

import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { ParsedExcelData, summarizeForAI } from './excel-parser';

// pdfjs 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

// ── 타입 정의 ──────────────────────────────────────────────────
export interface ParsedFileData {
  fileName: string;
  fileType: 'excel' | 'text' | 'plain' | 'pdf' | 'word' | 'image' | 'presentation' | 'unknown';
  textContent?: string;
  content?: string;
  excelData?: ParsedExcelData;
  imageDataUrl?: string;
  summary: string;
  parseError?: boolean;
}

// ── 확장자 정규식 ──────────────────────────────────────────────
const TEXT_EXTENSIONS   = /\.(txt|md|csv|json|xml|html|htm|log|yaml|yml|toml|ini|cfg|ig)$/i;
const EXCEL_EXTENSIONS  = /\.(xlsx|xls)$/i;
const PDF_EXTENSION     = /\.pdf$/i;
const WORD_EXTENSION    = /\.docx$/i;
const IMAGE_EXTENSIONS  = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;
const PPTX_EXTENSIONS   = /\.(pptx|ppt)$/i;

// ── 파일 읽기 헬퍼 ─────────────────────────────────────────────
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsDataURL(file);
  });
}

// ── Excel 파싱 ─────────────────────────────────────────────────
async function parseExcel(file: File): Promise<ParsedFileData> {
  try {
    const buffer   = await readAsArrayBuffer(file);
    const data     = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheets: Record<string, Record<string, unknown>[]> = {};
    const sheetNames = workbook.SheetNames;

    sheetNames.forEach(name => {
      const worksheet = workbook.Sheets[name];
      sheets[name] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    });

    const totalRows = Object.values(sheets).reduce((acc, s) => acc + s.length, 0);

    return {
      fileName: file.name,
      fileType: 'excel',
      excelData: { sheetNames, sheets, summary: `Excel 문서 - ${sheetNames.length}개 시트, 총 ${totalRows}행` },
      summary: `Excel 문서 - ${sheetNames.length}개 시트, 총 ${totalRows}행`,
    };
  } catch (err) {
    console.error('Excel 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'excel',
      summary: 'Excel 파싱 실패',
      parseError: true,
    };
  }
}

// ── PDF 파싱 (텍스트 우선 → 부족하면 이미지 OCR 자동 전환) ──────
async function parsePDF(file: File): Promise<ParsedFileData> {
  try {
    const buffer = await readAsArrayBuffer(file);
    const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;
    const maxPages = Math.min(pdf.numPages, 30);

    // ── 1단계: 텍스트 레이어 추출 시도 ────────────────────────
    const pages: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const page        = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) pages.push(text);
    }

    const fullText = pages.join('\n\n');

    // ── 2단계: 텍스트가 충분하면 바로 반환 ────────────────────
    // 페이지당 평균 50자 이상이면 텍스트 레이어 정상으로 판단
    if (fullText.trim().length > maxPages * 50) {
      return {
        fileName: file.name,
        fileType: 'pdf',
        textContent: fullText.slice(0, 50000),
        summary: `PDF 문서 - ${pdf.numPages}페이지, ${fullText.length}자`,
      };
    }

    // ── 3단계: 텍스트 부족 → 이미지 렌더링 + base64 OCR 모드 ──
    // 스캔본, 표 중심 PDF, 이미지 기반 문서에 자동 적용
    console.info(
      `[PDF Parser] 텍스트 부족(${fullText.length}자) → 이미지 OCR 모드 전환`
    );

    const canvas  = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('캔버스 컨텍스트를 가져올 수 없습니다.');

    const ocrMaxPages = Math.min(pdf.numPages, 20); // OCR은 최대 20페이지
    const imagePages: { mimeType: string; data: string }[] = [];

    for (let i = 1; i <= ocrMaxPages; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.8 }); // 해상도 조정 (1.5~2.0 권장)
      canvas.height  = viewport.height;
      canvas.width   = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      imagePages.push({ mimeType: 'image/jpeg', data: base64 });
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: fullText || undefined,
      summary: `PDF OCR 모드 - ${pdf.numPages}페이지`,
      // content에 이미지 배열 JSON 직렬화 저장 → buildAIPayload에서 처리
      content: JSON.stringify({
        type: 'pdf_images',
        pages: imagePages,
        totalPages: pdf.numPages,
        renderedPages: ocrMaxPages,
      }),
    };
  } catch (err) {
    console.error('PDF 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: 'PDF 파일을 읽지 못했습니다.',
      summary: 'PDF 파싱 실패',
      parseError: true,
    };
  }
}

// ── Word 파싱 ──────────────────────────────────────────────────
async function parseWord(file: File): Promise<ParsedFileData> {
  try {
    const mammoth  = await import('mammoth');
    const buffer   = await readAsArrayBuffer(file);
    const result   = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text     = result.value;

    if (!text || text.trim().length < 5) {
      return {
        fileName: file.name,
        fileType: 'word',
        textContent: 'Word 파일에서 텍스트를 추출할 수 없습니다.',
        summary: 'Word 파싱 실패 - 텍스트 없음',
        parseError: true,
      };
    }

    return {
      fileName: file.name,
      fileType: 'word',
      textContent: text.slice(0, 50000),
      summary: `Word 문서 - ${text.length}자`,
    };
  } catch (err) {
    console.error('Word 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'word',
      textContent: 'Word 파일을 읽지 못했습니다.',
      summary: 'Word 파싱 실패',
      parseError: true,
    };
  }
}

// ── 이미지 파싱 ────────────────────────────────────────────────
async function parseImage(file: File): Promise<ParsedFileData> {
  const dataUrl = await readAsDataURL(file);
  return {
    fileName: file.name,
    fileType: 'image',
    imageDataUrl: dataUrl,
    summary: `이미지 파일 - ${(file.size / 1024).toFixed(0)}KB`,
  };
}

// ── 텍스트 기반 파일 파싱 ──────────────────────────────────────
async function parseTextFile(file: File): Promise<ParsedFileData> {
  const text = await readAsText(file);
  return {
    fileName: file.name,
    fileType: 'text',
    textContent: text.slice(0, 50000),
    summary: `텍스트 파일 - ${text.length}자`,
  };
}

// ── 메인 parseFile 함수 ────────────────────────────────────────
export async function parseFile(file: File): Promise<ParsedFileData> {
  const name = file.name;

  if (EXCEL_EXTENSIONS.test(name)) return parseExcel(file);
  if (PDF_EXTENSION.test(name))    return parsePDF(file);
  if (WORD_EXTENSION.test(name))   return parseWord(file);
  if (IMAGE_EXTENSIONS.test(name)) return parseImage(file);
  if (PPTX_EXTENSIONS.test(name)) {
    return {
      fileName: file.name,
      fileType: 'presentation',
      summary: `프레젠테이션 파일 - ${(file.size / 1024).toFixed(0)}KB`,
    };
  }
  if (TEXT_EXTENSIONS.test(name))  return parseTextFile(file);
  if (name.endsWith('.csv'))        return parseTextFile(file);

  // 알 수 없는 형식 → 텍스트로 읽기 시도
  try {
    return await parseTextFile(file);
  } catch {
    return {
      fileName: file.name,
      fileType: 'unknown',
      summary: '지원하지 않는 파일 형식',
      parseError: true,
    };
  }
}

// ── AI 페이로드 빌더 ───────────────────────────────────────────
export function buildAIPayload(
  files: ParsedFileData[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const file of files) {
    // 파싱 실패
    if (file.parseError) {
      payload[file.fileName] = {
        type: file.fileType,
        error: true,
        note: file.summary,
      };
      continue;
    }

    // PDF OCR 이미지 모드 처리
    if (file.fileType === 'pdf' && file.content) {
      try {
        const parsed = JSON.parse(file.content);
        if (parsed.type === 'pdf_images') {
          payload[file.fileName] = {
            type: 'pdf_ocr',
            totalPages: parsed.totalPages,
            renderedPages: parsed.renderedPages,
            imagePages: parsed.pages,       // Gemini inlineData 파트 배열
            textContent: file.textContent ?? undefined,
          };
          continue;
        }
      } catch {
        // JSON 파싱 실패 시 아래 일반 처리로 fallback
      }
    }

    // Excel
    if (file.fileType === 'excel' && file.excelData) {
      payload[file.fileName] = {
        type: 'excel',
        data: summarizeForAI(file.excelData.sheets),
      };
      continue;
    }

    // 텍스트 기반 (pdf 일반 모드 포함)
    if (file.textContent) {
      payload[file.fileName] = {
        type: file.fileType,
        content: file.textContent,
      };
      continue;
    }

    // content 필드 있는 경우 (handlePromptSubmit 등)
    if (file.content) {
      payload[file.fileName] = {
        type: file.fileType,
        content: file.content,
      };
      continue;
    }

    // 이미지
    if (file.fileType === 'image') {
      payload[file.fileName] = {
        type: 'image',
        note: '이미지 파일 (시각적 내용 포함)',
      };
      continue;
    }
  }

  return payload;
}
