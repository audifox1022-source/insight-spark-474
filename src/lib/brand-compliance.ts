// ============================================================
// src/lib/brand-compliance.ts
// Feature 2: 브랜드킷 강제화 (Compliance Engine)
// brand_guidelines.md를 파싱해 CSS 변수를 런타임에 덮어씁니다.
// ============================================================

export interface BrandTokens {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  companyName?: string;
}

// ─────────────────────────────────────────────────────────
// brand_guidelines.md 텍스트 파싱 → BrandTokens 추출
// ─────────────────────────────────────────────────────────
export function parseBrandGuidelines(mdText: string): BrandTokens {
  const tokens: BrandTokens = {};

  // 색상 파싱: `Primary Color: #1B3A5C` 또는 `primary_color: #hex` 형태
  const primaryMatch = mdText.match(/primary[_\s-]?color[:\s]+([#\w(),%.\s]+)/i);
  if (primaryMatch) tokens.primaryColor = primaryMatch[1].trim().split('\n')[0].trim();

  const accentMatch = mdText.match(/accent[_\s-]?color[:\s]+([#\w(),%.\s]+)/i);
  if (accentMatch) tokens.accentColor = accentMatch[1].trim().split('\n')[0].trim();

  const bgMatch = mdText.match(/background[_\s-]?color[:\s]+([#\w(),%.\s]+)/i);
  if (bgMatch) tokens.backgroundColor = bgMatch[1].trim().split('\n')[0].trim();

  // 폰트 파싱: `Font Family: Inter` 형태
  const fontMatch = mdText.match(/font[_\s-]?family[:\s]+([^\n]+)/i);
  if (fontMatch) tokens.fontFamily = fontMatch[1].trim();

  // 로고 URL 파싱: `Logo URL: https://...` 형태
  const logoMatch = mdText.match(/logo[_\s-]?url[:\s]+(https?:\/\/[^\s\n]+)/i);
  if (logoMatch) tokens.logoUrl = logoMatch[1].trim();

  // 회사명 파싱: `Company Name: ...` 형태
  const companyMatch = mdText.match(/company[_\s-]?name[:\s]+([^\n]+)/i);
  if (companyMatch) tokens.companyName = companyMatch[1].trim();

  return tokens;
}

// ─────────────────────────────────────────────────────────
// BrandTokens → CSS 전역 변수 오버라이드
// :root 레벨 CSS 변수를 런타임에 덮어써 모든 슬라이드에 강제 적용
// ─────────────────────────────────────────────────────────
export function applyBrandTokens(tokens: BrandTokens): void {
  const root = document.documentElement;

  if (tokens.primaryColor) {
    root.style.setProperty('--brand-primary', tokens.primaryColor);
    root.style.setProperty('--slide-accent', tokens.primaryColor);
    // 기존 테마 primary도 오버라이드
    root.style.setProperty('--primary', tokens.primaryColor);
  }

  if (tokens.accentColor) {
    root.style.setProperty('--brand-accent', tokens.accentColor);
  }

  if (tokens.backgroundColor) {
    root.style.setProperty('--brand-bg', tokens.backgroundColor);
  }

  if (tokens.fontFamily) {
    root.style.setProperty('--brand-font', tokens.fontFamily);
    root.style.setProperty('--font-sans', tokens.fontFamily);
    // 동적 Google Fonts 로드 시도
    loadGoogleFont(tokens.fontFamily);
  }

  // localStorage에 저장 (새로고침 후에도 유지)
  localStorage.setItem('brandTokens', JSON.stringify(tokens));
}

// ─────────────────────────────────────────────────────────
// 저장된 BrandTokens 복원 (앱 초기화 시 호출)
// ─────────────────────────────────────────────────────────
export function restoreBrandTokens(): BrandTokens | null {
  try {
    const saved = localStorage.getItem('brandTokens');
    if (!saved) return null;
    const tokens: BrandTokens = JSON.parse(saved);
    applyBrandTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// 브랜드 토큰 초기화 (기본값으로 되돌리기)
// ─────────────────────────────────────────────────────────
export function resetBrandTokens(): void {
  const root = document.documentElement;
  ['--brand-primary', '--brand-accent', '--brand-bg', '--brand-font',
   '--slide-accent', '--font-sans'].forEach((v) => root.style.removeProperty(v));
  localStorage.removeItem('brandTokens');
}

// ─────────────────────────────────────────────────────────
// AI 프롬프트에 브랜드 가이드라인 주입용 텍스트 생성
// ─────────────────────────────────────────────────────────
export function getBrandPromptContext(tokens: BrandTokens): string {
  const parts: string[] = [];
  if (tokens.primaryColor) parts.push(`주 색상(Primary Color): ${tokens.primaryColor}`);
  if (tokens.accentColor) parts.push(`강조 색상(Accent Color): ${tokens.accentColor}`);
  if (tokens.fontFamily) parts.push(`폰트: ${tokens.fontFamily}`);
  if (tokens.companyName) parts.push(`회사명: ${tokens.companyName}`);
  if (parts.length === 0) return '';
  return `\n[🎨 브랜드 가이드라인 - 반드시 준수]\n${parts.join('\n')}\n위 브랜드 컬러와 스타일을 슬라이드 전체에 일관되게 적용하세요.\n`;
}

// ─────────────────────────────────────────────────────────
// Google Fonts 동적 로드 헬퍼
// ─────────────────────────────────────────────────────────
function loadGoogleFont(fontFamily: string): void {
  try {
    const safeName = fontFamily.trim().replace(/\s+/g, '+');
    const linkId = 'brand-google-font';
    const existing = document.getElementById(linkId);
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${safeName}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
  } catch (e) {
    console.warn('Google Font 로드 실패:', fontFamily, e);
  }
}
