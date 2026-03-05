// ============================================================
// src/services/ai/utils.ts - 데이터 가공 및 파싱 로직 (완성본)
// ============================================================
import { MAX_FILE_BYTES, ALLOWED_SLIDE_TYPES, AllowedSlideType, TYPE_ALIAS_MAP } from './constants';

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });

/**
 * 대용량 파일 데이터를 전송 가능한 크기로 제한합니다.
 */
export function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  const raw = typeof fileData === "string" ? fileData : JSON.stringify(fileData);
  const encoded = encoder.encode(raw);
  if (encoded.length <= MAX_FILE_BYTES) return raw;
  const sliced = encoded.slice(0, MAX_FILE_BYTES);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const decoded = decoder.decode(sliced);
  return decoded.replace(/\\u[\dA-Fa-f]{0,3}$|\\x[\dA-Fa-f]?$|\\$/, "");
}

/**
 * 다양한 형태의 데이터 구조에서 순수 텍스트 리스트를 추출합니다.
 */
export function extractTextFromItem(item: any, depth = 0): string[] {
  if (depth > 4) return [String(item)];
  if (!item) return [];

  if (typeof item === "string") {
    let cleanStr = item.trim();
    cleanStr = cleanStr.replace(/^[^a-zA-Z0-9가-힣{[]+/, "").trim();
    if ((cleanStr.startsWith("{") && cleanStr.endsWith("}")) || (cleanStr.startsWith("[") && cleanStr.endsWith("]"))) {
      try { item = JSON.parse(cleanStr); } catch { return [cleanStr]; }
    } else { return [cleanStr]; }
  }

  if (Array.isArray(item)) return item.flatMap((el) => extractTextFromItem(el, depth + 1));

  if (typeof item === "object") {
    const result: string[] = [];
    const title = item.title || item.heading || item.name || item.subject || "";
    const bodyData = item.content || item.items || item.points || item.bullets || item.text || item.desc || item.description || null;

    if (Array.isArray(bodyData)) {
      if (title) result.push(`[${title}]`);
      result.push(...bodyData.flatMap((c: any) => {
        if (typeof c === "string") return [c];
        if (c && typeof c === "object") {
          if (c.title && c.desc) return [`${c.title}: ${c.desc}`];
          if (c.label && c.value) return [`${c.label}: ${c.value}`];
          return extractTextFromItem(c, depth + 1);
        }
        return [String(c)];
      }));
    } else if (bodyData && typeof bodyData === "string") {
      result.push(title ? `[${title}] ${bodyData}` : bodyData);
    } else if (title) {
      result.push(title);
    } else {
      const values = Object.values(item).filter((v) => typeof v === "string");
      if (values.length > 0) result.push(...(values as string[]));
    }
    return result;
  }
  return [String(item)];
}

/**
 * 슬라이드 타입을 표준 타입으로 변환합니다.
 */
export function normalizeType(raw: string, index: number, total: number): AllowedSlideType {
  if (index === 0) return 'title';
  if (index === total - 1) return 'summary';
  const lower = (raw || 'content').toLowerCase().replace(/[_\s-]/g, '');
  if (ALLOWED_SLIDE_TYPES.includes(lower as AllowedSlideType)) return lower as AllowedSlideType;
  return (TYPE_ALIAS_MAP[lower] as AllowedSlideType) ?? 'content';
}

/**
 * 슬라이드 객체의 데이터를 검증하고 필수 필드를 보장합니다.
 */
export function normalizeSlide(s: any, index = 0, total = 1): any {
  if (!s || typeof s !== "object") {
    return {
      id: `slide-${Math.random().toString(36).substring(2, 11)}`,
      type: index === 0 ? 'title' : index === total - 1 ? 'summary' : 'content',
      title: "",
      content: [],
      chartData: null,
      tableData: { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id = s.id || `slide-${Math.random().toString(36).substring(2, 11)}`;
  s.title = s.title || "";
  s.type = normalizeType(s.type || 'content', index, total);

  const rawContent = s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent) ? rawContent : typeof rawContent === "string" ? [rawContent] : [];
  s.content = contentArray.flatMap((item: any) => extractTextFromItem(item));

  // ── 타입별 보정 로직 (chart, table, kpi 등) ──
  if (s.type === 'chart') {
    const raw = s.chartData || {};
    let parsedChartData: any = null;
    if (Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0]?.name !== undefined) {
      parsedChartData = {
        chartType: raw.chartType ?? raw.type ?? 'bar',
        title: raw.title ?? '',
        data: raw.data,
        series1Label: raw.series1Label ?? '값',
        series2Label: raw.series2Label ?? undefined,
        showLegend: raw.showLegend ?? true,
      };
    } else if (Array.isArray(raw.labels) && raw.labels.length > 0 && Array.isArray(raw.datasets)) {
      const primaryDs = raw.datasets[0];
      const secondaryDs = raw.datasets[1];
      parsedChartData = {
        chartType: (raw.type === 'line' ? 'line' : raw.type === 'pie' ? 'pie' : raw.type === 'area' ? 'area' : 'bar'),
        title: raw.title ?? '',
        data: (raw.labels as string[]).map((label: string, i: number) => ({
          name: String(label),
          value: Number(primaryDs?.data?.[i] ?? 0),
          ...(secondaryDs ? { value2: Number(secondaryDs.data?.[i] ?? 0) } : {}),
        })),
        series1Label: primaryDs?.label ?? '값',
        series2Label: secondaryDs?.label ?? undefined,
        showLegend: (raw.datasets?.length ?? 0) > 1,
      };
    }
    s.chartData = parsedChartData;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];
    if (!parsedChartData) s.type = 'content';
  } else if (s.type === 'table') {
    s.tableData = s.tableData || { headers: [], rows: [] };
    s.chartData = null;
    s.keyMetrics = [];
  } else if (s.type === 'kpi') {
    const rawMetrics = s.keyMetrics || s.metrics || s.indicators || [];
    s.keyMetrics = Array.isArray(rawMetrics) ? rawMetrics.map((m: any) => ({
      label: m.label || m.name || '',
      value: m.value || m.score || '',
      trend: (['up', 'down', 'flat'].includes(m.trend) ? m.trend : 'flat'),
    })) : [];
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
  } else if (s.type === 'compare') {
    s.leftItems = Array.isArray(s.leftItems) ? s.leftItems : [];
    s.rightItems = Array.isArray(s.rightItems) ? s.rightItems : [];
    s.leftTitle = s.leftTitle || 'AS-IS';
    s.rightTitle = s.rightTitle || 'TO-BE';
  } else if (s.type === 'timeline') {
    s.milestones = Array.isArray(s.milestones) ? s.milestones.map((m: any) => ({
      label: m.label || m.title || '',
      date: m.date || '',
      state: (['done', 'next', 'todo'].includes(m.state) ? m.state : 'todo'),
    })) : [];
  } else if (s.type === 'quote') {
    s.text = s.text || s.quote || s.content?.[0] || '';
    s.author = s.author || s.source || s.content?.[1] || '';
  } else {
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];
  }

  return s;
}

/**
 * AI의 텍스트 응답에서 JSON을 추출하고 망가진 경우 복구를 시도합니다.
 */
export function extractJSON(text: string): any {
  if (!text) return null;
  let cleanText = text.trim();

  // ✅ Vite(esbuild) 정규식 빌드 에러의 원인이 되는 백틱(```) 파싱 충돌을 피하기 위해
  // 문자열 메서드를 활용하여 마크다운 코드블록을 안전하게 잘라냅니다.
  const codeBlockStart = cleanText.indexOf('```json');
  const fallbackStart = cleanText.indexOf('```');
  
  const startIdx = codeBlockStart !== -1 ? codeBlockStart + 7 : (fallbackStart !== -1 ? fallbackStart + 3 : -1);
  
  if (startIdx !== -1) {
    const endIdx = cleanText.lastIndexOf('```');
    if (endIdx !== -1 && endIdx > startIdx) {
      cleanText = cleanText.substring(startIdx, endIdx).trim();
    }
  }

  // 2. 앞뒤 불필요한 텍스트 제거 (JSON 시작/끝 찾기)
  const jsonStart = cleanText.search(/[\{\[]/);
  const jsonEnd = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
    const sliced = cleanText.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(sliced); // 완벽하게 닫혀있다면 여기서 통과
    } catch {
      cleanText = cleanText.slice(jsonStart); // 실패했다면 끝을 자르지 않고 복구 시도로 넘김
    }
  }

  // 3. 정상 파싱 시도
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    // 4. 1단계 복구: 흔한 오류 (제어문자, 콤마) 제거
    try {
      let repaired = cleanText
        .replace(/[\u0000-\u0009\u000B-\u001F]+/g, " ") // 줄바꿈(\n) 외의 깨진 제어문자 공백 변환
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(repaired);
    } catch (error2) {
      // 🚀 5. 2단계 복구(Auto-Healer): AI 토큰 부족으로 문자열이 뚝 끊긴 경우 강제로 닫아버림
      try {
        let forced = cleanText.replace(/[\u0000-\u0009\u000B-\u001F]+/g, " ");
        
        // 열린 따옴표 개수가 홀수면 닫아줌
        if ((forced.match(/"/g) || []).length % 2 !== 0) {
          forced += '"';
        }
        
        // 마지막이 콤마로 끝나면 제거
        forced = forced.replace(/,\s*$/g, '');

        // 열린 괄호와 닫힌 괄호 개수를 세서 부족한 만큼 채워 넣음
        const openBraces = (forced.match(/\{/g) || []).length;
        const closeBraces = (forced.match(/\}/g) || []).length;
        const openBrackets = (forced.match(/\[/g) || []).length;
        const closeBrackets = (forced.match(/\]/g) || []).length;

        for (let i = 0; i < (openBrackets - closeBrackets); i++) forced += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) forced += '}';

        const finalData = JSON.parse(forced);
        console.warn('⚠️ [extractJSON] 잘린 JSON을 강제로 복구하여 살려냈습니다!', finalData);
        return finalData;

      } catch (error3) {
        console.error('[extractJSON] 최종 파싱 실패 (복구 불가):', cleanText.slice(0, 300) + '...');
        return null;
      }
    }
  }
}
