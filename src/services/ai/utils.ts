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
  s.items = s.content; // Mirror for components expecting 'items'
  s.points = s.content; // Mirror for components expecting 'points'

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

  // ✅ 정규표현식 완전 배제: indexOf를 이용해 안전하게 마크다운 코드블록을 도려냅니다.
  let startIndex = cleanText.indexOf('```json');
  if (startIndex !== -1) {
    startIndex += 7;
  } else {
    startIndex = cleanText.indexOf('```');
    if (startIndex !== -1) {
      startIndex += 3;
    }
  }

  if (startIndex !== -1) {
    const endIndex = cleanText.indexOf('```', startIndex);
    if (endIndex !== -1) {
      cleanText = cleanText.substring(startIndex, endIndex).trim();
    } else {
      cleanText = cleanText.substring(startIndex).trim();
    }
  }

  // 2. 앞뒤 불필요한 텍스트 제거 (JSON 시작/끝 찾기)
  const jsonStart = cleanText.indexOf('{') !== -1 && cleanText.indexOf('[') !== -1 
    ? Math.min(cleanText.indexOf('{'), cleanText.indexOf('['))
    : Math.max(cleanText.indexOf('{'), cleanText.indexOf('['));
    
  const jsonEnd = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
    const sliced = cleanText.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(sliced); 
    } catch {
      cleanText = cleanText.slice(jsonStart);
    }
  }

  // 3. 정상 파싱 시도
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    // 4. 강력한 Auto-Healer (끊긴 문자열 억지로 닫기)
    try {
      // 제어문자 및 줄바꿈을 안전하게 치환
      let forced = cleanText.replace(/[\u0000-\u0009\u000B-\u001F]+/g, " ");
      forced = forced.replace(/\n/g, "\\n"); 
      
      // 열린 따옴표 확인
      let inString = false;
      for (let i = 0; i < forced.length; i++) {
        if (forced[i] === '"' && forced[i-1] !== '\\') {
          inString = !inString;
        }
      }
      if (inString) forced += '"';
      
      // 마지막 콤마 찌꺼기 제거
      forced = forced.replace(/,\s*$/g, '');
      forced = forced.replace(/,\s*}/g, '}');
      forced = forced.replace(/,\s*]/g, ']');

      // 열린/닫힌 괄호 카운트
      let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
      inString = false;
      for (let i = 0; i < forced.length; i++) {
        if (forced[i] === '"' && forced[i-1] !== '\\') inString = !inString;
        if (!inString) {
          if (forced[i] === '{') openBraces++;
          if (forced[i] === '}') closeBraces++;
          if (forced[i] === '[') openBrackets++;
          if (forced[i] === ']') closeBrackets++;
        }
      }

      // 부족한 괄호 닫기 (배열 먼저, 객체 나중)
      for (let i = 0; i < (openBrackets - closeBrackets); i++) forced += ']';
      for (let i = 0; i < (openBraces - closeBraces); i++) forced += '}';

      const finalData = JSON.parse(forced);
      console.warn('⚠️ [extractJSON] 끊어진 JSON을 강제로 복구했습니다.', finalData);
      return finalData;

    } catch (error3) {
      console.error('[extractJSON] 최종 파싱 실패:', cleanText.slice(-100));
      return { title: "데이터 생성 지연", slides: [] };
    }
  }
}
