import * as XLSX from 'xlsx';
import { ParsedExcelData, summarizeForAI } from './excel-parser';

export interface ParsedFileData {
  fileName: string;
  fileType: 'excel' | 'text' | 'pdf' | 'word' | 'image' | 'unknown';
  textContent?: string;
  excelData?: ParsedExcelData;
  imageDataUrl?: string;
  summary: string;
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
}

async function parsePDF(file: File): Promise<ParsedFileData> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set up worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const buffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages: string[] = [];

    const maxPages = Math.min(pdf.numPages, 50);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      if (text.trim()) pages.push(text.trim());
    }

    const fullText = pages.join('\n\n');
    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: fullText.slice(0, 50000),
      summary: `PDF - ${pdf.numPages}페이지, ${fullText.length}자`,
    };
  } catch {
    return {
      fileName: file.name,
      fileType: 'pdf',
      textContent: '[PDF 파싱 실패]',
      summary: 'PDF - 파싱 실패',
    };
  }
}

async function parseWord(file: File): Promise<ParsedFileData> {
  try {
    const mammoth = await import('mammoth');
    const buffer = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;

    return {
      fileName: file.name,
      fileType: 'word',
      textContent: text.slice(0, 50000),
      summary: `Word - ${text.length}자`,
    };
  } catch {
    return {
      fileName: file.name,
      fileType: 'word',
      textContent: '[Word 파싱 실패]',
      summary: 'Word - 파싱 실패',
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

  // CSV handled by text parser
  if (name.endsWith('.csv')) return parseTextFile(file);

  // Try reading as text for unknown types
  try {
    return await parseTextFile(file);
  } catch {
    return {
      fileName: file.name,
      fileType: 'unknown',
      summary: '지원하지 않는 형식',
    };
  }
}

/**
 * Combine all parsed file data into a single payload for AI processing.
 */
export function buildAIPayload(files: ParsedFileData[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const file of files) {
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
    } else if (file.fileType === 'image') {
      // Send image info without the full data URL to keep payload manageable
      payload[file.fileName] = {
        type: 'image',
        note: '이미지 파일이 포함되어 있습니다. 이미지 내용에 대한 설명이 필요하면 별도로 분석해주세요.',
      };
    }
  }

  return payload;
}
