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

/**
 * Summarize large datasets to reduce payload size for AI processing.
 * Keeps column info, basic stats, and a sample of rows.
 */
export function summarizeForAI(sheets: Record<string, Record<string, unknown>[]>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [sheetName, rows] of Object.entries(sheets)) {
    if (rows.length === 0) {
      result[sheetName] = { rowCount: 0, columns: [], data: [] };
      continue;
    }

    const columns = Object.keys(rows[0]);
    const numericColumns: Record<string, number[]> = {};

    // Collect numeric values per column
    for (const col of columns) {
      const nums: number[] = [];
      for (const row of rows) {
        const v = row[col];
        if (typeof v === 'number' && !isNaN(v)) nums.push(v);
      }
      if (nums.length > 0) numericColumns[col] = nums;
    }

    // Compute stats for numeric columns
    const stats: Record<string, unknown> = {};
    for (const [col, nums] of Object.entries(numericColumns)) {
      const sorted = [...nums].sort((a, b) => a - b);
      stats[col] = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
        count: nums.length,
        first: nums[0],
        last: nums[nums.length - 1],
      };
    }

    // Sample rows: first 5, last 5, and evenly spaced 10 from middle
    const sampleRows: Record<string, unknown>[] = [];
    if (rows.length <= 30) {
      sampleRows.push(...rows);
    } else {
      sampleRows.push(...rows.slice(0, 5));
      const step = Math.floor(rows.length / 12);
      for (let i = step; i < rows.length - 5; i += step) {
        sampleRows.push(rows[i]);
        if (sampleRows.length >= 15) break;
      }
      sampleRows.push(...rows.slice(-5));
    }

    result[sheetName] = {
      rowCount: rows.length,
      columns,
      stats,
      sampleRows,
    };
  }

  return result;
}
