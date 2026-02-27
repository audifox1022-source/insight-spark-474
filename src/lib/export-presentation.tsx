import React from 'react';
import { createRoot } from 'react-dom/client';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';

export interface BrandSettings {
  primaryColor: string;   // hex without #
  accentColor: string;    // hex without #
  companyName: string;
  logoDataUrl: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor:  '0D8ECF',
  companyName:  'TFT',
  logoDataUrl:  null,
};

// ─────────────────────────────────────────────────────────────
// ✅ CSS 변수 → 실제 hex 값으로 인라인 치환
//    html2canvas는 CSS custom properties를 읽지 못하므로
//    캡처 전 container 내 모든 요소의 computed style을 인라인화
// ─────────────────────────────────────────────────────────────
function inlineComputedStyles(root: HTMLElement) {
  const all = root.querySelectorAll<HTMLElement>('*');
  const props = [
    'color', 'background-color', 'background',
    'border-color', 'border-top-color', 'border-right-color',
    'border-bottom-color', 'border-left-color',
    'fill', 'stroke',
    'font-size', 'font-weight', 'font-family',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin',  'margin-top',  'margin-right',  'margin-bottom',  'margin-left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'display', 'flex-direction', 'align-items', 'justify-content',
    'position', 'top', 'right', 'bottom', 'left',
    'border-radius', 'border-width', 'border-style',
    'opacity', 'z-index', 'overflow',
    'text-align', 'line-height', 'letter-spacing',
    'gap', 'grid-template-columns', 'grid-template-rows',
    'transform', 'box-shadow',
  ];

  all.forEach((el) => {
    const computed = window.getComputedStyle(el);
    props.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val) el.style.setProperty(prop, val);
    });
  });

  // root 자체도 처리
  const rootComputed = window.getComputedStyle(root);
  props.forEach((prop) => {
    const val = rootComputed.getPropertyValue(prop);
    if (val) root.style.setProperty(prop, val);
  });
}

// ─────────────────────────────────────────────────────────────
// ✅ SVG 내부 CSS 변수 치환 (Recharts SVG 대응)
// ─────────────────────────────────────────────────────────────
function fixSvgStyles(root: HTMLElement) {
  const svgs = root.querySelectorAll<SVGElement>('svg, svg *');
  svgs.forEach((el) => {
    const computed = window.getComputedStyle(el);
    ['fill', 'stroke', 'color'].forEach((attr) => {
      const val = computed.getPropertyValue(attr);
      if (val && val !== 'none' && val !== '') {
        (el as HTMLElement).style.setProperty(attr, val);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// ✅ 렌더 완료 대기 — MutationObserver + rAF + 타임아웃 조합
// ─────────────────────────────────────────────────────────────
function waitForRender(container: HTMLElement, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let mutationTimer: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      // rAF 2회 후 최종 확정 (애니메이션 1프레임 보장)
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };

    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(finish, 300); // DOM 변경 후 300ms 정적 상태면 완료
    });

    observer.observe(container, { childList: true, subtree: true, attributes: true });

    // 최대 대기 시간
    setTimeout(finish, timeoutMs);

    // 초기 DOM이 이미 정적이면 바로 완료
    mutationTimer = setTimeout(finish, 400);
  });
}

// ─────────────────────────────────────────────────────────────
// ✅ 핵심 캡처 함수
// ─────────────────────────────────────────────────────────────
async function captureSlideAsImage(
  slide: Slide,
  brand: BrandSettings
): Promise<string> {
  const W = 1920;
  const H = 1080;

  // 1. 컨테이너 생성 — document.body가 아닌 position:fixed 독립 레이어
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: ${W}px; height: ${H}px;
    z-index: 99999;
    pointer-events: none;
    overflow: hidden;
    background: #ffffff;
  `;
  document.body.appendChild(container);

  // 2. 브랜드 CSS 변수 주입 — html2canvas가 읽을 수 있도록 인라인 변수 설정
  const brandStyle = document.createElement('style');
  brandStyle.id = 'export-brand-vars';
  brandStyle.textContent = `
    #export-root {
      --primary: #${brand.primaryColor};
      --accent:  #${brand.accentColor};
      --primary-foreground: #ffffff;
      --background: #ffffff;
      --foreground: #111827;
      --muted: #f3f4f6;
      --muted-foreground: #6b7280;
      --border: #e5e7eb;
      --card: #ffffff;
      --gray-50:  #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --gray-900: #111827;
    }
  `;
  document.head.appendChild(brandStyle);

  // 3. React Root 마운트
  const reactRoot = document.createElement('div');
  reactRoot.id = 'export-root';
  reactRoot.style.cssText = `width: ${W}px; height: ${H}px; background: #ffffff;`;
  container.appendChild(reactRoot);

  const root = createRoot(reactRoot);

  return new Promise<string>((resolve, reject) => {
    root.render(
      <div style={{ width: W, height: H, background: '#ffffff', overflow: 'hidden' }}>
        <ScaledSlide
          slide={slide}
          logoUrl={brand.logoDataUrl ?? undefined}
          watermark={brand.companyName}
        />
      </div>
    );

    // 4. 렌더 완료 대기
    waitForRender(reactRoot, 3000).then(async () => {
      try {
        // 5. CSS 변수 인라인화 (html2canvas 대응)
        inlineComputedStyles(reactRoot);
        fixSvgStyles(reactRoot);

        // 6. 추가 안정화 대기
        await new Promise(r => setTimeout(r, 200));

        // 7. html2canvas 캡처
        const canvas = await html2canvas(reactRoot, {
          scale:           2,          // 3840x2160 고해상도
          useCORS:         true,
          allowTaint:      true,
          logging:         false,
          backgroundColor: '#ffffff',
          width:           W,
          height:          H,
          windowWidth:     W,
          windowHeight:    H,
          foreignObjectRendering: false, // SVG 렌더링 안정화
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        resolve(imgData);
      } catch (err) {
        reject(err);
      } finally {
        // 8. 정리
        root.unmount();
        document.body.removeChild(container);
        document.head.removeChild(brandStyle);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// ✅ PDF 내보내기
// ─────────────────────────────────────────────────────────────
export async function exportToPdf(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW  = 297;
  const pageH  = 210;

  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  }

  doc.save(`${presentation.title}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// ✅ PPTX 내보내기
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx   = new PptxGenJS();
  pptx.author  = brand.companyName;
  pptx.title   = presentation.title;
  pptx.layout  = 'LAYOUT_WIDE'; // 16:9

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();
    const imgData  = await captureSlideAsImage(slide, brand);

    // PPTX는 base64 data URL 직접 사용
    pptSlide.addImage({
      data: imgData,
      x: 0, y: 0,
      w: '100%', h: '100%',
    });

    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
