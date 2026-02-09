import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  sheetNames: string[];
  sheets: Record<string, Record<string, unknown>[]>;
  summary: string;
}

export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets: Record<string, Record<string, unknown>[]> = {};
        const sheetNames = workbook.SheetNames;
        
        sheetNames.forEach((name) => {
          const worksheet = workbook.Sheets[name];
          sheets[name] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        });

        const totalRows = Object.values(sheets).reduce((acc, s) => acc + s.length, 0);
        const summary = `시트 ${sheetNames.length}개, 총 ${totalRows}행의 데이터`;

        resolve({ sheetNames, sheets, summary });
      } catch (err) {
        reject(new Error('엑셀 파일 파싱에 실패했습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsArrayBuffer(file);
  });
}
