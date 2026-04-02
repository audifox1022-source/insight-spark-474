// ============================================================
// src/utils/fileParser.ts - 고도화된 멀티모달 및 정형 데이터(Excel/CSV) 파서
// ============================================================

export interface ParsedFileData {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'plain' | 'image' | 'unknown';
  content: string | any[]; // 멀티모달일 경우 Gemini 파츠 배열, 정형 데이터일 경우 텍스트
  summary: string;
  parseError?: string;
}

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
    await loadScript('https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.min.js');
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const multimodalParts: any[] = [];
    let fullText = '';

    const pageLimit = Math.min(pdf.numPages, 20);

    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context!, viewport }).promise;
      
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
          }
        });
      }

      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      content: multimodalParts,
      summary: fullText.substring(0, 500)
    };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return { fileName: file.name, fileType: 'pdf', content: '', summary: '', parseError: err.message };
  }
}

/**
 * 엑셀 및 CSV 파싱 (SheetJS 활용)
 */
async function parseExcel(file: File): Promise<ParsedFileData> {
  try {
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
      content: fullText,
      summary: fullText.substring(0, 500)
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

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) {
    return parseImage(file);
  }
  
  const text = await file.text();
  return {
    fileName: file.name,
    fileType: ext === 'txt' || ext === 'md' ? 'txt' : 'plain',
    content: text,
    summary: text.substring(0, 500)
  };
}

/**
 * AI 요청을 위한 파츠 배열 빌더
 */
export function buildAIParts(files: ParsedFileData[]): any[] {
  const parts: any[] = [];
  
  files.forEach(f => {
    if (Array.isArray(f.content)) {
      parts.push(...f.content);
    } else {
      parts.push({ text: `[파일 원본 데이터: ${f.fileName}]\n${f.content}` });
    }
  });
  
  return parts;
}
