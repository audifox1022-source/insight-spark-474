import * as XLSX from 'xlsx';
import { ParsedExcelData, summarizeForAI } from './excel-parser';

export interface ParsedFileData {
  fileName: string;
  fileType: 'excel' | 'text' | 'text/plain' | 'pdf' | 'word' | 'image' | 'unknown';
  textContent?: string;
  content?: string;
  excelData?: ParsedExcelData;
  imageDataUrl?: string;
  summary: string;
  parseError?: boolean;
}

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|xml|html|htm|log|yaml|yml|toml|ini|cfg)$/i;
const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/i;
const PDF_EXTENSION = /\.pdf$/i;
const WORD_EXTENSION = /\.(docx)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

async function parseExcel(file: File): Promise<ParsedFileData> {
  try {
    const buffer = await readAsArrayBuffer(file);
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheets: Record<string, Record<string, unknown>[]> = {};
    const sheetNames = workbook.SheetNames;

    sheetNames.forEach((name) => {
      const worksheet = workbook.Sheets[name];
      sheets[name] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    });

    const totalRows = Object.values(sheets).reduce((acc, s) => acc + s.length, 0);

    return {
      fileName: file.name,
      fileType: 'excel',
      excelData: { sheetNames, sheets, summary: `시트 ${sheetNames.length}개, 총 ${totalRows}행` },
      summary: `엑셀 - 시트 ${sheetNames.length}개, ${totalRows}행`,
    };
  } catch (err) {
    console.error('Excel 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'excel',
      summary: '엑셀 - 파싱 실패',
      parseError: true,
    };
  }
}

async function parsePDF(file: File): Promise<ParsedFileData> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // ✅ unpkg CDN 사용으로 변경 (버전 안정성 확보)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const buffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];

    const maxPages = Math.min(pdf.numPages, 50);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // ✅ 빈 항목 제거 + 공백 정리
      const text = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text) pages.push(text);
    }

    const fullText = pages.join('\n\n');

    // ✅ 추출된 텍스트가 너무 짧으면 파싱 실패로 처리
    if (fullText.trim().length < 10) {
      return {
        fileName: file.name,
        fileType: 'pdf',
        textContent: '[PDF에서 텍스트를 추출할 수 없습니다. 스캔된 이미지 PDF일 수 있습니다.]',
        summary: `PDF - ${pdf.numPages}페이지 (텍스트 추출 불가)`,
        parseError: true,
      };
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: fullText.slice(0, 50000),
      summary: `PDF - ${pdf.numPages}페이지, ${fullText.length}자 추출`,
    };
  } catch (err) {
    console.error('PDF 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: '[PDF 파싱 실패]',
      summary: 'PDF - 파싱 실패',
      parseError: true,
    };
  }
}

async function parseWord(file: File): Promise<ParsedFileData> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;

    if (!text || text.trim().length < 5) {
      return {
        fileName: file.name,
        fileType: 'word',
        textContent: '[Word 문서에서 텍스트를 추출할 수 없습니다.]',
        summary: 'Word - 텍스트 추출 불가',
        parseError: true,
      };
    }

    return {
      fileName: file.name,
      fileType: 'word',
      textContent: text.slice(0, 50000),
      summary: `Word - ${text.length}자`,
    };
  } catch (err) {
    console.error('Word 파싱 오류:', err);
    return {
      fileName: file.name,
      fileType: 'word',
      textContent: '[Word 파싱 실패]',
      summary: 'Word - 파싱 실패',
      parseError: true,
    };
  }
}

async function parseImage(file: File): Promise<ParsedFileData> {
  const dataUrl = await readAsDataURL(file);
  return {
    fileName: file.name,
    fileType: 'image',
    imageDataUrl: dataUrl,
    summary: `이미지 - ${(file.size / 1024).toFixed(0)}KB`,
  };
}

async function parseTextFile(file: File): Promise<ParsedFileData> {
  const text = await readAsText(file);
  return {
    fileName: file.name,
    fileType: 'text',
    textContent: text.slice(0, 50000),
    summary: `텍스트 - ${text.length}자`,
  };
}

export async function parseFile(file: File): Promise<ParsedFileData> {
  const name = file.name;

  if (EXCEL_EXTENSIONS.test(name)) return parseExcel(file);
  if (PDF_EXTENSION.test(name)) return parsePDF(file);
  if (WORD_EXTENSION.test(name)) return parseWord(file);
  if (IMAGE_EXTENSIONS.test(name)) return parseImage(file);
  if (TEXT_EXTENSIONS.test(name)) return parseTextFile(file);
  if (name.endsWith('.csv')) return parseTextFile(file);

  try {
    return await parseTextFile(file);
  } catch {
    return {
      fileName: file.name,
      fileType: 'unknown',
      summary: '지원하지 않는 형식',
      parseError: true,
    };
  }
}

export function buildAIPayload(files: ParsedFileData[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const file of files) {
    // ✅ 파싱 실패 파일도 AI에 알려서 처리 가능하도록
    if (file.parseError) {
      payload[file.fileName] = {
        type: file.fileType,
        error: true,
        note: `이 파일은 파싱에 실패했습니다: ${file.summary}`,
      };
      continue;
    }

    if (file.fileType === 'excel' && file.excelData) {
      payload[file.fileName] = {
        type: 'excel',
        data: summarizeForAI(file.excelData.sheets),
      };
    } else if (file.textContent) {
      payload[file.fileName] = {
        type: file.fileType,
        content: file.textContent,
      };
    } else if (file.content) {
      // ✅ handlePromptSubmit에서 생성된 가상 파일 처리
      payload[file.fileName] = {
        type: file.fileType,
        content: file.content,
      };
    } else if (file.fileType === 'image') {
      payload[file.fileName] = {
        type: 'image',
        note: '이미지 파일이 포함되어 있습니다.',
      };
    }
  }

  return payload;
}
