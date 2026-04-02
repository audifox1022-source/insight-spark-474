// ============================================================
// src/utils/fontLoader.ts (Work AI - Professional Font Asset Loader)
// [Enterprise] Caching & High-Performance Fetch for .ttf Fonts
// ============================================================

/**
 * 전역 폰트 캐시 (메모리 내 보관으로 중복 네트워크 요청 방지)
 */
const fontCache: Record<string, Uint8Array> = {};

/**
 * 원격 URL로부터 .ttf 폰트 파일을 로드하여 Uint8Array로 반환합니다.
 * @param url 폰트 파일의 직접 다운로드 URL
 */
export const loadFont = async (url: string): Promise<Uint8Array> => {
  if (fontCache[url]) {
    console.log(`[FontLoader] Using cached font: ${url}`);
    return fontCache[url];
  }

  try {
    console.log(`[FontLoader] Fetching font from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    fontCache[url] = uint8Array;
    return uint8Array;
  } catch (error) {
    console.error(`[FontLoader] Error loading font (${url}):`, error);
    throw error;
  }
};

/**
 * Noto Sans KR Regular 폰트의 안정적인 CDN 경로
 */
export const NOTO_SANS_KR_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/unhinted/ttf/NotoSansKR/NotoSansKR-Regular.ttf';
