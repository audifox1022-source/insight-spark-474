// ============================================================
// src/utils/fileParser.ts - 고도화된 멀티모달 및 정형 데이터(Excel/CSV) 파서
// ============================================================

export interface ParsedFileData {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv' | 'txt' | 'plain' | 'image' | 'unknown';
  content: string | any[]; // 멀티모달일 경우 Gemini 파츠 배열, 정형 데이터일 경우 텍스트
  summary: string;
  parseError?: string;
}

const cleanExtractedText = (text: string): string =>
  text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const hasMeaningfulText = (text: string): boolean =>
  cleanExtractedText(text).replace(/\s/g, '').length >= 40;

const stripXmlText = (text: string): string =>
  text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 동적 스크립트 로드 유틸리티
 */
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

/**
 * PDF 파싱 (멀티모달 렌더링 지원)
 */
async function parsePdf(file: File): Promise<ParsedFileData> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    const pageLimit = Math.min(pdf.numPages, 20);

    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `\n[Page ${i}]\n${pageText}\n`;
      }
    }

    const cleanedText = cleanExtractedText(fullText);
    if (hasMeaningfulText(cleanedText)) {
      return {
        fileName: file.name,
        fileType: 'pdf',
        content: cleanedText,
        summary: cleanedText.substring(0, 1000)
      };
    }

    const multimodalParts: any[] = [];
    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvas, canvasContext: context!, viewport }).promise;
      
      const TILE_HEIGHT = 2500;
      if (canvas.height > TILE_HEIGHT) {
        const numTiles = Math.ceil(canvas.height / TILE_HEIGHT);
        for (let t = 0; t < numTiles; t++) {
          const tileCanvas = document.createElement('canvas');
          const tileContext = tileCanvas.getContext('2d');
          const currentTileHeight = Math.min(TILE_HEIGHT, canvas.height - (t * TILE_HEIGHT));
          
          tileCanvas.width = canvas.width;
          tileCanvas.height = currentTileHeight;
          
          tileContext?.drawImage(
            canvas,
            0, t * TILE_HEIGHT, canvas.width, currentTileHeight, 
            0, 0, canvas.width, currentTileHeight
          );
          
          const base64Tile = tileCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
          multimodalParts.push({
            inlineData: {
              data: base64Tile,
              mimeType: 'image/jpeg'
            },
            metadata: { pageNum: i, part: `${t + 1}/${numTiles}` }
          });
        }
      } else {
        const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
        multimodalParts.push({
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg'
          },
          metadata: { pageNum: i }
        });
      }
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      content: multimodalParts,
      summary: `Scanned or image-based PDF: ${file.name} (${multimodalParts.length} image parts). Use attached image parts as the source.`
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return { fileName: file.name, fileType: 'pdf', content: '', summary: '', parseError: err.message };
  }
}

async function parseDocx(file: File): Promise<ParsedFileData> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = cleanExtractedText(result.value || '');

    return {
      fileName: file.name,
      fileType: 'docx',
      content: text,
      summary: text.substring(0, 1000),
      parseError: text ? undefined : 'DOCX text extraction returned no content'
    };
  } catch (err: any) {
    console.error('DOCX parsing error:', err);
    return { fileName: file.name, fileType: 'docx', content: '', summary: '', parseError: err.message };
  }
}

async function parsePptx(file: File): Promise<ParsedFileData> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slideEntries = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const aNum = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
        const bNum = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
        return aNum - bNum;
      });

    const slideTexts: string[] = [];
    for (const entry of slideEntries) {
      const xml = await zip.files[entry].async('text');
      const matches = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g));
      const text = cleanExtractedText(matches.map((m) => stripXmlText(m[1])).filter(Boolean).join('\n'));
      if (text) {
        const slideNumber = entry.match(/slide(\d+)\.xml/i)?.[1] || String(slideTexts.length + 1);
        slideTexts.push(`[Slide ${slideNumber}]\n${text}`);
      }
    }

    const fullText = cleanExtractedText(slideTexts.join('\n\n'));
    return {
      fileName: file.name,
      fileType: 'pptx',
      content: fullText,
      summary: fullText.substring(0, 1000),
      parseError: fullText ? undefined : 'PPTX text extraction returned no content'
    };
  } catch (err: any) {
    console.error('PPTX parsing error:', err);
    return { fileName: file.name, fileType: 'pptx', content: '', summary: '', parseError: err.message };
  }
}

/**
 * 엑셀 및 CSV 파싱 (SheetJS 활용)
 */
async function parseExcel(file: File): Promise<ParsedFileData> {
  try {
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = cleanExtractedText(await file.text());
      return {
        fileName: file.name,
        fileType: 'csv',
        content: text,
        summary: text.substring(0, 1000)
      };
    }

    await loadScript('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');
    const XLSX = (window as any).XLSX;
    
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    let fullText = '';
    
    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      fullText += `\n[Sheet: ${sheetName}]\n`;
      fullText += json.map((row: any) => row.join('\t')).join('\n');
    });

    return {
      fileName: file.name,
      fileType: file.name.endsWith('.csv') ? 'csv' : 'xlsx',
      content: cleanExtractedText(fullText),
      summary: cleanExtractedText(fullText).substring(0, 1000)
    };
  } catch (err: any) {
    console.error('Excel/CSV parsing error:', err);
    return { fileName: file.name, fileType: 'xlsx', content: '', summary: '', parseError: err.message };
  }
}

/**
 * 이미지 파일 파싱
 */
async function parseImage(file: File): Promise<ParsedFileData> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = (e.target?.result as string);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context?.drawImage(img, 0, 0);

        const multimodalParts: any[] = [];
        const TILE_HEIGHT = 2500;

        if (canvas.height > TILE_HEIGHT) {
          const numTiles = Math.ceil(canvas.height / TILE_HEIGHT);
          for (let t = 0; t < numTiles; t++) {
            const tileCanvas = document.createElement('canvas');
            const tileContext = tileCanvas.getContext('2d');
            const currentTileHeight = Math.min(TILE_HEIGHT, canvas.height - (t * TILE_HEIGHT));
            
            tileCanvas.width = canvas.width;
            tileCanvas.height = currentTileHeight;
            tileContext?.drawImage(canvas, 0, t * TILE_HEIGHT, canvas.width, currentTileHeight, 0, 0, canvas.width, currentTileHeight);
            
            multimodalParts.push({
              inlineData: {
                data: tileCanvas.toDataURL('image/jpeg', 0.9).split(',')[1],
                mimeType: 'image/jpeg'
              },
              metadata: { part: `${t + 1}/${numTiles}` }
            });
          }
        } else {
          multimodalParts.push({
            inlineData: {
              data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1],
              mimeType: 'image/jpeg'
            }
          });
        }

        resolve({
          fileName: file.name,
          fileType: 'image',
          content: multimodalParts,
          summary: `이미지 파일: ${file.name} (${multimodalParts.length} 조각)`
        });
      };
      img.src = base64Data;
    };
    reader.onerror = () => resolve({ fileName: file.name, fileType: 'unknown', content: '', summary: '', parseError: '이미지 로드 실패' });
    reader.readAsDataURL(file);
  });
}

/**
 * 통합 파일 파싱 분기
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (ext === 'pdf') {
    return parsePdf(file);
  }
  
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return parseExcel(file);
  }

  if (ext === 'docx') {
    return parseDocx(file);
  }

  if (ext === 'pptx') {
    return parsePptx(file);
  }

  if (ext === 'ppt') {
    return {
      fileName: file.name,
      fileType: 'unknown',
      content: '',
      summary: '',
      parseError: 'Legacy .ppt files are not text-extractable in the browser. Please upload .pptx, .pdf, .docx, .txt, or .csv.'
    };
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) {
    return parseImage(file);
  }
  
  const text = await file.text();
  const cleanedText = cleanExtractedText(text);
  return {
    fileName: file.name,
    fileType: ext === 'txt' || ext === 'md' ? 'txt' : 'plain',
    content: cleanedText,
    summary: cleanedText.substring(0, 1000)
  };
}

/**
 * AI 요청을 위한 파츠 배열 빌더
 */
export function extractInlinePartsFromContent(content: string | any[] | undefined): any[] {
  if (!Array.isArray(content)) return [];
  return content
    .filter((part) => part?.inlineData || part?.fileData)
    .map((part) => {
      if (part.inlineData) return { inlineData: part.inlineData };
      if (part.fileData) return { fileData: part.fileData };
      return part;
    });
}

export function formatParsedFileForPrompt(
  file: Pick<ParsedFileData, 'fileName' | 'fileType' | 'content' | 'summary' | 'parseError'>
): string {
  const header = `[Uploaded file: ${file.fileName} (${file.fileType})]`;
  if (file.parseError) {
    return `${header}\nParse warning: ${file.parseError}`;
  }

  if (typeof file.content === 'string') {
    const text = cleanExtractedText(file.content);
    return `${header}\n${text || file.summary || 'No readable text was extracted.'}`;
  }

  const textParts = (file.content || [])
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n\n');

  if (textParts.trim()) {
    return `${header}\n${cleanExtractedText(textParts)}`;
  }

  return `${header}\n${file.summary || `Visual source with ${(file.content || []).length} attached part(s). The attached image parts must be used as source evidence.`}`;
}

export function buildAIParts(files: ParsedFileData[]): any[] {
  const parts: any[] = [];
  
  files.forEach(f => {
    if (Array.isArray(f.content)) {
      parts.push(...f.content);
    } else {
      parts.push({ text: formatParsedFileForPrompt(f) });
    }
  });
  
  return parts;
}
