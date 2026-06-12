// ============================================================
// src/services/ai/utils.ts - 데이터 가공 및 파싱 로직 (데이터 무결성 강화 버전)
// ============================================================
import { MAX_FILE_BYTES, ALLOWED_SLIDE_TYPES, AllowedSlideType, TYPE_ALIAS_MAP } from './constants';

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: false });
const TRAILING_DECODE_ARTIFACT_PATTERN = /\uFFFD+$/;

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
  return decoded
    .replace(TRAILING_DECODE_ARTIFACT_PATTERN, "")
    .replace(/\\u[\dA-Fa-f]{0,3}$|\\x[\dA-Fa-f]?$|\\$/, "");
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
    const ignoredKeys = ['slideNumber', 'id', 'type', 'layout', 'notes', 'slideIndex', 'index'];
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
      const values = Object.entries(item)
        .filter(([k, v]) => !ignoredKeys.includes(k) && (typeof v === "string" && v.length > 1))
        .map(([_, v]) => v as string);
      if (values.length > 0) result.push(...values);
    }
    return result;
  }
  return [String(item)];
}

export function normalizeType(raw: string, index: number, total: number): AllowedSlideType {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'closing';
  
  const rawLower = (raw || 'content').toLowerCase().replace(/[_\s-]/g, '');
  const alias = TYPE_ALIAS_MAP[rawLower];
  if (alias && ALLOWED_SLIDE_TYPES.includes(alias as any)) {
    return alias as AllowedSlideType;
  }

  if (rawLower.includes('table') || rawLower.includes('grid') || rawLower.includes('matrix') || rawLower.includes('data')) return 'table';
  if (rawLower.includes('process') || rawLower.includes('step') || rawLower.includes('flow') || rawLower.includes('workflow')) return 'process';
  if (rawLower.includes('compare') || rawLower.includes('versus') || rawLower.includes('vs') || rawLower.includes('comparison')) return 'compare';
  if (rawLower.includes('timeline') || rawLower.includes('roadmap') || rawLower.includes('schedule') || rawLower.includes('milestone')) return 'timeline';
  if (rawLower.includes('toc') || rawLower.includes('agenda') || rawLower.includes('index') || rawLower.includes('list')) return 'toc';
  if (rawLower.includes('cover') || rawLower.includes('title') || rawLower.includes('main')) return 'cover';
  if (rawLower.includes('closing') || rawLower.includes('summary') || rawLower.includes('end') || rawLower.includes('thanks')) return 'closing';
  
  return 'content';
}

export function normalizeSlide(s: any, index = 0, total = 1): any {
  if (!s || typeof s !== "object") {
    const type = index === 0 ? 'cover' : index === total - 1 ? 'closing' : 'content';
    return {
      id: `slide-${Math.random().toString(36).substring(2, 11)}`,
      type,
      title: type === 'cover' ? "무제 프레젠테이션" : "새 슬라이드",
      points: [],
      items: [],
      content: [],
      message: type === 'closing' ? "경청해주셔서 감사합니다." : ""
    };
  }

  s.id = s.id || `slide-${Math.random().toString(36).substring(2, 11)}`;
  s.type = normalizeType(s.type, index, total);
  s.title = s.title || s.header || s.heading || s.subject || "";

  const mergeToList = (...args: any[]) => {
    const combined: any[] = [];
    args.forEach(arg => {
      if (Array.isArray(arg)) combined.push(...arg);
      else if (arg && typeof arg === 'string') combined.push(arg);
      else if (arg && typeof arg === 'object') combined.push(arg);
    });
    return combined.slice(0, 5);
  };

  if (s.type === 'cover') {
    s.subtitle = s.subtitle || s.subhead || s.description || "";
  } else if (s.type === 'toc') {
    s.items = mergeToList(s.items, s.toc, s.list, s.content);
  } else if (s.type === 'content') {
    const normalized = mergeToList(s.content, s.points, s.bullets, s.items, s.body);
    s.points = normalized;
    s.content = normalized;
  } else if (s.type === 'compare') {
    s.leftTitle = s.leftTitle || s.leftColumn?.title || "AS-IS";
    s.rightTitle = s.rightTitle || s.rightColumn?.title || "TO-BE";
    s.leftItems = mergeToList(s.leftItems, s.leftColumn?.items);
    s.rightItems = mergeToList(s.rightItems, s.rightColumn?.items, s.items, s.points, s.content);
    
    if (s.leftItems.length === 0 && s.rightItems.length >= 2) {
      const mid = Math.ceil(s.rightItems.length / 2);
      s.leftItems = s.rightItems.slice(0, mid);
      s.rightItems = s.rightItems.slice(mid);
    }
  } else if (s.type === 'process' || s.type === 'timeline') {
    const steps = mergeToList(s.content, s.points, s.items, s.milestones);
    s.content = steps;
    s.points = steps;
  } else if (s.type === 'table') {
    const tableData = s.tableData || s;
    s.headers = Array.isArray(tableData.headers) ? tableData.headers : (s.headers || []);
    s.rows = Array.isArray(tableData.rows) ? tableData.rows : (s.rows || []);
    
    if ((s.headers.length === 0 || s.rows.length === 0) && (s.content?.length > 0 || s.points?.length > 0)) {
      const items = mergeToList(s.content, s.points);
      s.headers = ["항목", "내용"];
      s.rows = items.map((p: any) => {
        if (typeof p === 'string') return [p, ""];
        if (p && typeof p === 'object') {
           // ── [Safe Object.values Access] ──
           const vals = Object.values(p);
           const firstVal = vals.length > 0 ? vals[0] : "";
           return [p.title || p.label || firstVal, p.desc || p.value || ""];
        }
        return [String(p), ""];
      });
    }
  } else if (s.type === 'closing') {
    // ── [Safe Array Access] ──
    s.message = s.message || (Array.isArray(s.content) && s.content.length > 0 ? s.content[0] : s.content) || s.text || "경청해주셔서 감사합니다.";
  }

  s.layout = s.layout || 'default';
  return s;
}

/**
 * [Phase 16 - 궁극의 고도화 적용]
 * Regex 안전 파싱 및 스택 기반 미완성 문자열 복구(Self-Healing) 로직 도입
 */
export function extractJSON(text: string): any {
  // 1. [지침 준수] 최상단 Guard Clause(방어 코드) 강제 적용
  if (!text || typeof text !== 'string') {
    console.error('파싱 에러: 유효하지 않은 텍스트', text);
    return null;
  }
  
  let cleanText = text.trim();

  // 2. 안전한 JSON 추출 로직 (Regex 도입)
  try {
    // substring 대신 정규식을 이용해 { ... } 또는 [ ... ] 추출하여 가드 강화
    const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.warn("Regex match found but JSON.parse failed in utils.ts. Retrying with cleaning...");
      }
    }
    
    let processedText = cleanText;
    if (processedText.startsWith('```json')) processedText = processedText.replace(/```json/gi, '').replace(/```/g, '').trim();
    else if (processedText.startsWith('```')) processedText = processedText.replace(/```/g, '').trim();
    
    return JSON.parse(processedText);

  } catch (error) {
    console.warn("Standard JSON Parsing Failed in utils.ts. Launching Repair Engine...");
    
    // 3. 에러 로깅 강화
    console.error('JSON 파싱 실패 원본 텍스트:', text);

    try {
      const firstOpenBrace = cleanText.indexOf('{');
      const firstOpenBracket = cleanText.indexOf('[');
      let startIdx = -1;
      if (firstOpenBrace !== -1 && firstOpenBracket !== -1) startIdx = Math.min(firstOpenBrace, firstOpenBracket);
      else startIdx = firstOpenBrace !== -1 ? firstOpenBrace : firstOpenBracket;

      if (startIdx === -1) {
        console.warn("extractJSON: No JSON structure found in string.");
        return null;
      }
      
      // substring 호출 전 cleanText 존재 여부 재확인
      let repairTarget = (cleanText || "").substring(startIdx);
      repairTarget = repairTarget.replace(/,\s*$/, '');

      let inString = false;
      let escapeNext = false;
      const stack: string[] = [];

      for (let i = 0; i < repairTarget.length; i++) {
        const char = repairTarget[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{' || char === '[') {
            stack.push(char);
          } else if (char === '}') {
            if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
          } else if (char === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
          }
        }
      }

      let healedString = repairTarget;
      if (inString) healedString += '"';
      
      while (stack.length > 0) {
        const openChar = stack.pop();
        if (openChar === '{') healedString += '}';
        else if (openChar === '[') healedString += ']';
      }

      try {
        const parsed = JSON.parse(healedString);
        console.log(`✅ Repair Successful in utils.ts: Healed broken JSON structure.`);
        return parsed;
      } catch (err2) {
        console.error("CRITICAL: Self-Healing Engine Failed in utils.ts.", err2);
        return { title: "데이터 생성 지연", slides: [] };
      }
    } catch (innerError) {
      console.error("extractJSON Catch Block Critical Failure:", innerError);
      return null;
    }
  }
}
