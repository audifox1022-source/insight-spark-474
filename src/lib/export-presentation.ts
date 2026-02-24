import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';

export interface BrandSettings {
  primaryColor: string;   // hex without #
  accentColor: string;    // hex without #
  companyName: string;
  logoDataUrl: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor: '0D8ECF',
  companyName: '가스원단위 절감 TFT',
  logoDataUrl: null,
};

const FIXED = {
  white: 'FFFFFF',
  dark: '1A2332',
  muted: '6B7A8D',
  bg: 'F5F6F8',
  success: '33A06B',
  destructive: 'E04040',
  cardBg: '1E2A3A',
  slideBg: '0F1923',
};

const slideTypeLabels: Record<string, string> = {
  title: '표지', data: '데이터', chart: '차트', action: '실행계획', summary: '요약',
};

const trendSymbols: Record<string, string> = { up: '▲', down: '▼', flat: '―' };

function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── PDF Export (html2canvas 기반 — 한글 완벽 지원) ──────────────

export async function exportToPdf(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;

  // 임시 렌더링 컨테이너 생성
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
  document.body.appendChild(container);

  try {
    for (let idx = 0; idx < presentation.slides.length; idx++) {
      if (idx > 0) doc.addPage();

      // ScaledSlide와 동일한 구조의 HTML을 만들어 렌더링
      const slideHtml = buildSlideHtml(presentation.slides[idx], brand);
      container.innerHTML = slideHtml;

      // 렌더링 대기
      await new Promise(r => setTimeout(r, 100));

      const slideEl = container.firstElementChild as HTMLElement;
      if (!slideEl) continue;

      const canvas = await html2canvas(slideEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
        width: 1920,
        height: 1080,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
    }
  } finally {
    document.body.removeChild(container);
  }

  doc.save(`${presentation.title || '발표자료'}.pdf`);
}

/** 슬라이드 HTML 빌더 — CSS 인라인으로 한글 폰트 포함 */
function buildSlideHtml(slide: Slide, brand: BrandSettings): string {
  const accent = `#${brand.accentColor}`;
  const primary = `#${brand.primaryColor}`;
  const hasMetrics = slide.keyMetrics && slide.keyMetrics.length > 0;
  const badge = slideTypeLabels[slide.type] || slide.type;

  const trendColor = (t: string) =>
    t === 'up' ? '#33A06B' : t === 'down' ? '#E04040' : '#6B7A8D';
  const trendBar = (t: string) =>
    t === 'up' ? '78%' : t === 'down' ? '35%' : '50%';

  const bgImage = slide.imageUrl ? `
    <div style="position:absolute;inset:0;z-index:0;">
      <img src="${slide.imageUrl}" style="width:100%;height:100%;object-fit:cover;" crossorigin="anonymous" />
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(15,25,35,0.85),rgba(15,25,35,0.65),rgba(15,25,35,0.8));"></div>
    </div>
  ` : '';

  // 메트릭 카드 HTML
  const metricsHtml = hasMetrics ? slide.keyMetrics!.map(m => `
    <div style="flex:1;background:linear-gradient(145deg,${trendColor(m.trend)}18,rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px;position:relative;overflow:hidden;">
      <div style="position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;border:3px solid ${trendColor(m.trend)};opacity:0.06;"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:16px;opacity:0.5;font-weight:500;text-transform:uppercase;">${m.label}</span>
        <span style="color:${trendColor(m.trend)};font-size:18px;background:${trendColor(m.trend)}20;padding:3px 8px;border-radius:20px;">${trendSymbols[m.trend]}</span>
      </div>
      <div style="font-size:${slide.type === 'data' ? '52px' : '40px'};font-weight:900;letter-spacing:-0.03em;line-height:1;color:${trendColor(m.trend)};text-shadow:0 0 30px ${trendColor(m.trend)}25;">
        ${m.value}
      </div>
      ${slide.type === 'data' ? `<div style="margin-top:12px;height:5px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,0.06);">
        <div style="height:100%;width:${trendBar(m.trend)};border-radius:3px;background:linear-gradient(90deg,${trendColor(m.trend)}80,${trendColor(m.trend)});box-shadow:0 0 10px ${trendColor(m.trend)}40;"></div>
      </div>` : ''}
    </div>
  `).join('') : '';

  // 콘텐츠 불릿 HTML
  const contentHtml = slide.content && slide.content.length > 0 ? slide.content.map(item => `
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px;">
      <div style="margin-top:10px;display:flex;align-items:center;gap:5px;flex-shrink:0;">
        <span style="width:7px;height:7px;border-radius:50%;background:${accent};box-shadow:0 0 12px ${accent}50;display:inline-block;"></span>
        <span style="width:18px;height:1px;background:${accent}40;display:inline-block;"></span>
      </div>
      <span style="font-size:24px;line-height:1.6;font-weight:300;opacity:0.85;">${item}</span>
    </div>
  `).join('') : '';

  const notesHtml = slide.notes ? `
    <div style="position:absolute;bottom:8px;left:100px;right:100px;font-size:11px;color:rgba(255,255,255,0.3);font-style:italic;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;">
      💡 ${slide.notes}
    </div>
  ` : '';

  // 타이틀 슬라이드
  if (slide.type === 'title') {
    return `<div style="width:1920px;height:1080px;background:linear-gradient(135deg,#0F1520,#141E2D,#182636);color:white;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
      ${bgImage}
      <div style="position:absolute;inset:0;pointer-events:none;z-index:1;">
        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${accent}50,${accent},${accent}50,transparent);"></div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,transparent,${accent}80,${accent},${accent}80,transparent);"></div>
      </div>
      <div style="position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 140px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:40px;">
          <div style="height:1px;width:40px;background:${accent};"></div>
          <span style="font-size:16px;font-weight:500;letter-spacing:0.3em;color:${accent};font-family:monospace;">INTRO</span>
          <div style="height:1px;width:40px;background:${accent};"></div>
        </div>
        <h1 style="font-size:76px;font-weight:900;line-height:1.08;letter-spacing:-0.03em;max-width:1400px;text-shadow:0 4px 40px rgba(0,0,0,0.4);">
          ${slide.title}
        </h1>
        <div style="margin:32px 0 28px;height:3px;width:100px;border-radius:2px;background:linear-gradient(90deg,${accent},transparent);"></div>
        ${contentHtml ? `<div style="max-width:900px;">${contentHtml}</div>` : ''}
        ${metricsHtml ? `<div style="display:flex;gap:28px;margin-top:44px;">${metricsHtml}</div>` : ''}
      </div>
      ${notesHtml}
      <div style="position:absolute;bottom:28px;left:140px;font-size:12px;opacity:0.2;font-family:monospace;">${brand.companyName}</div>
    </div>`;
  }

  // 일반 슬라이드 (data/chart/action/summary)
  const isData = slide.type === 'data';
  const isAction = slide.type === 'action';
  const isSummary = slide.type === 'summary';

  let bodyHtml = '';

  if (isData && hasMetrics) {
    // 인포그래픽 레이아웃: 대형 메트릭 + 콘텐츠
    bodyHtml = `
      <div style="flex:1;display:flex;gap:40px;padding:28px 100px;min-height:0;">
        <div style="display:flex;flex-direction:column;gap:20px;justify-content:center;width:${contentHtml ? '460px' : '100%'};flex-shrink:0;">
          <div style="display:${contentHtml && !slide.chartData ? 'flex' : 'grid'};gap:18px;${!contentHtml ? 'grid-template-columns:repeat(' + Math.min(slide.keyMetrics!.length, 3) + ',1fr);' : 'flex-direction:column;'}">
            ${metricsHtml}
          </div>
        </div>
        ${contentHtml ? `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${contentHtml}</div>` : ''}
      </div>`;
  } else if (isAction && slide.content && slide.content.length > 0) {
    // CTA 레이아웃
    const mainCta = slide.content[0];
    const subItems = slide.content.slice(1);
    bodyHtml = `
      <div style="flex:1;display:flex;gap:48px;padding:28px 100px;min-height:0;">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
          <div style="border-radius:16px;padding:32px;background:linear-gradient(135deg,${accent}18,${accent}06);border:2px solid ${accent}30;position:relative;overflow:hidden;margin-bottom:16px;">
            <div style="display:flex;align-items:flex-start;gap:16px;">
              <div style="flex-shrink:0;width:48px;height:48px;border-radius:12px;background:${accent}25;display:flex;align-items:center;justify-content:center;font-size:24px;">⚡</div>
              <span style="font-size:28px;font-weight:700;line-height:1.4;">${mainCta}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:16px;margin-left:64px;">
              <div style="height:2px;width:32px;background:${accent};border-radius:1px;"></div>
              <span style="color:${accent};font-size:18px;">→</span>
            </div>
          </div>
          ${subItems.map(item => `
            <div style="display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:8px;">
              <span style="color:${accent};font-size:18px;">✓</span>
              <span style="font-size:22px;font-weight:300;opacity:0.8;line-height:1.5;">${item}</span>
            </div>
          `).join('')}
        </div>
        ${metricsHtml ? `<div style="width:380px;flex-shrink:0;display:flex;flex-direction:column;gap:16px;justify-content:center;">${metricsHtml}</div>` : ''}
      </div>`;
  } else if (isSummary) {
    // 카드 그리드
    const cols = slide.content && slide.content.length <= 3 ? slide.content.length : (slide.content && slide.content.length <= 6 ? 3 : 4);
    bodyHtml = `
      <div style="flex:1;padding:28px 100px;min-height:0;">
        ${metricsHtml ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(slide.keyMetrics!.length, 4)},1fr);gap:16px;margin-bottom:24px;">${metricsHtml}</div>` : ''}
        ${slide.content && slide.content.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:14px;">
          ${slide.content.map((item, i) => `
            <div style="border-radius:14px;padding:24px;background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015));border:1px solid rgba(255,255,255,0.06);display:flex;align-items:flex-start;gap:14px;">
              <div style="flex-shrink:0;width:36px;height:36px;border-radius:10px;background:${accent}18;color:${accent};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;">
                ${String(i + 1).padStart(2, '0')}
              </div>
              <span style="font-size:20px;line-height:1.5;font-weight:300;opacity:0.85;">${item}</span>
            </div>
          `).join('')}
        </div>` : ''}
      </div>`;
  } else {
    // 기본 (chart 등)
    bodyHtml = `
      <div style="flex:1;display:flex;gap:40px;padding:32px 100px;min-height:0;">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${contentHtml}</div>
        ${metricsHtml && !slide.chartData ? `<div style="width:400px;flex-shrink:0;display:flex;flex-direction:column;gap:16px;justify-content:center;">${metricsHtml}</div>` : ''}
      </div>`;
  }

  return `<div style="width:1920px;height:1080px;background:linear-gradient(135deg,#0F1520,#141E2D,#182636);color:white;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column;">
    ${bgImage}
    <div style="position:absolute;inset:0;pointer-events:none;z-index:1;">
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${accent}50,${accent},${accent}50,transparent);"></div>
      <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,transparent,${accent}80,${accent},${accent}80,transparent);"></div>
    </div>
    <div style="padding:56px 100px 16px;position:relative;z-index:3;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:13px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;font-family:monospace;color:${accent};padding:4px 12px;border-radius:20px;border:1px solid ${accent}40;">${badge.toUpperCase()}</span>
        <div style="width:1px;height:14px;background:rgba(255,255,255,0.15);"></div>
        <span style="font-size:14px;font-family:monospace;opacity:0.3;letter-spacing:0.15em;">${String(slide.slideNumber).padStart(2, '0')}</span>
      </div>
      <h1 style="font-size:${isData ? '48px' : '52px'};font-weight:800;line-height:1.1;letter-spacing:-0.025em;max-width:1200px;text-shadow:0 2px 24px rgba(0,0,0,0.3);">
        ${slide.title}
      </h1>
    </div>
    <div style="margin:0 100px;height:2px;border-radius:1px;background:linear-gradient(90deg,${accent}60,${accent}15,transparent);"></div>
    ${bodyHtml}
    ${notesHtml}
    <div style="padding:0 100px 24px;position:relative;z-index:3;display:flex;align-items:center;opacity:0.2;">
      <span style="font-size:12px;font-family:monospace;letter-spacing:0.15em;">${String(slide.slideNumber).padStart(2, '0')}</span>
      <span style="margin-left:auto;font-size:11px;">${brand.companyName}</span>
    </div>
  </div>`;
}


// ─── PPTX Export (향상된 디자인) ────────────────────────────────

export async function exportToPptx(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const pptx = new PptxGenJS();
  pptx.author = brand.companyName;
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE';

  const primary = brand.primaryColor;
  const accent = brand.accentColor;

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();
    const isTitle = slide.type === 'title';
    const isData = slide.type === 'data';
    const isAction = slide.type === 'action';
    const isSummary = slide.type === 'summary';

    // ── 다크 배경 ──
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { type: 'solid', color: FIXED.slideBg },
    });

    // ── 배경 이미지 ──
    if (slide.imageUrl) {
      const imgData = await imageUrlToDataUrl(slide.imageUrl);
      if (imgData) {
        pptSlide.addImage({
          data: imgData, x: 0, y: 0, w: '100%', h: '100%',
          sizing: { type: 'cover', w: 13.33, h: 7.5 },
        });
        pptSlide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: '100%', h: '100%',
          fill: { type: 'solid', color: '000000' },
          opacity: 0.6,
        } as any);
      }
    }

    // ── 좌측 악센트 바 ──
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.04, h: '100%',
      fill: { type: 'solid', color: accent },
      opacity: 0.6,
    } as any);

    // ── 하단 악센트 라인 ──
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.46, w: '100%', h: 0.04,
      fill: { type: 'solid', color: accent },
      opacity: 0.5,
    } as any);

    if (isTitle) {
      // ═══ TITLE 슬라이드 ═══
      const badge = `── INTRO ──`;
      pptSlide.addText(badge, {
        x: 1.2, y: 2.0, w: 4, h: 0.35,
        fontSize: 11, color: accent, fontFace: 'Malgun Gothic',
      });

      pptSlide.addText(slide.title, {
        x: 1.2, y: 2.5, w: 11, h: 1.5,
        fontSize: 38, bold: true, color: FIXED.white, fontFace: 'Malgun Gothic',
      });

      // 악센트 라인
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 1.2, y: 4.1, w: 1.2, h: 0.04,
        fill: { type: 'solid', color: accent },
      });

      let yPos = 4.4;
      if (slide.content && slide.content.length > 0) {
        const bulletText = slide.content.map(c => ({
          text: c,
          options: { fontSize: 15, color: 'AABBCC', breakLine: true, paraSpaceAfter: 6 },
        }));
        pptSlide.addText(bulletText as any, {
          x: 1.2, y: yPos, w: 9, h: 1.5,
          fontFace: 'Malgun Gothic', valign: 'top',
        });
        yPos += 1.6;
      }

      if (slide.keyMetrics && slide.keyMetrics.length > 0) {
        addMetrics(pptx, pptSlide, slide.keyMetrics, yPos, accent);
      }

    } else {
      // ═══ 일반 슬라이드 ═══
      const badge = slideTypeLabels[slide.type] || slide.type;
      pptSlide.addText(badge.toUpperCase(), {
        x: 0.8, y: 0.5, w: 1.5, h: 0.35,
        fontSize: 9, color: accent, fontFace: 'Malgun Gothic',
        shape: pptx.ShapeType.roundRect,
        rectRadius: 0.15,
        line: { color: accent, width: 0.75 },
        fill: { type: 'solid', color: FIXED.slideBg },
        align: 'center',
      } as any);

      pptSlide.addText(String(slide.slideNumber).padStart(2, '0'), {
        x: 2.5, y: 0.5, w: 0.6, h: 0.35,
        fontSize: 9, color: '4A5568', fontFace: 'Courier New',
      });

      pptSlide.addText(slide.title, {
        x: 0.8, y: 1.0, w: 11.5, h: 0.8,
        fontSize: 26, bold: true, color: FIXED.white, fontFace: 'Malgun Gothic',
      });

      // Divider
      pptSlide.addShape(pptx.ShapeType.rect, {
        x: 0.8, y: 1.85, w: 5, h: 0.025,
        fill: { type: 'solid', color: accent },
        opacity: 0.5,
      } as any);

      let yPos = 2.1;

      // ── DATA 인포그래픽 ──
      if (isData && slide.keyMetrics && slide.keyMetrics.length > 0) {
        const hasContent = slide.content && slide.content.length > 0;
        addInfographicMetrics(pptx, pptSlide, slide.keyMetrics, yPos, accent, hasContent);

        if (hasContent) {
          const bulletText = slide.content!.map(c => ({
            text: c,
            options: { fontSize: 12, color: 'C0CDD8', bullet: { code: '25CF', color: accent }, breakLine: true, paraSpaceAfter: 6 },
          }));
          pptSlide.addText(bulletText as any, {
            x: 6.6, y: yPos, w: 6, h: 4.5,
            fontFace: 'Malgun Gothic', valign: 'top',
          });
        }
        yPos += 4.8;

      // ── ACTION CTA ──
      } else if (isAction && slide.content && slide.content.length > 0) {
        // Main CTA
        pptSlide.addShape(pptx.ShapeType.roundRect, {
          x: 0.8, y: yPos, w: 7, h: 1.3,
          rectRadius: 0.15,
          fill: { type: 'solid', color: accent },
          opacity: 0.12,
          line: { color: accent, width: 1.5 },
        } as any);

        pptSlide.addText(`⚡  ${slide.content[0]}`, {
          x: 1.0, y: yPos + 0.15, w: 6.6, h: 1.0,
          fontSize: 16, bold: true, color: FIXED.white, fontFace: 'Malgun Gothic',
          valign: 'middle',
        });
        yPos += 1.6;

        // Sub items
        slide.content.slice(1).forEach((item, i) => {
          pptSlide.addText(`✓  ${item}`, {
            x: 1.0, y: yPos + i * 0.55, w: 7, h: 0.45,
            fontSize: 12, color: 'C0CDD8', fontFace: 'Malgun Gothic',
          });
        });

        if (slide.keyMetrics && slide.keyMetrics.length > 0) {
          addMetrics(pptx, pptSlide, slide.keyMetrics, 2.1, accent, 8.2, 4.8);
        }

      // ── SUMMARY 카드 그리드 ──
      } else if (isSummary) {
        if (slide.keyMetrics && slide.keyMetrics.length > 0) {
          addMetrics(pptx, pptSlide, slide.keyMetrics, yPos, accent);
          yPos += 1.4;
        }

        if (slide.content && slide.content.length > 0) {
          const cols = Math.min(slide.content.length, 3);
          const cardW = (12 - 0.3 * (cols - 1)) / cols;
          slide.content.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = 0.8 + col * (cardW + 0.3);
            const y = yPos + row * 1.4;

            pptSlide.addShape(pptx.ShapeType.roundRect, {
              x, y, w: cardW, h: 1.2,
              rectRadius: 0.12,
              fill: { type: 'solid', color: FIXED.cardBg },
              line: { color: '2A3A4A', width: 0.5 },
            });

            pptSlide.addText(String(i + 1).padStart(2, '0'), {
              x: x + 0.15, y: y + 0.15, w: 0.45, h: 0.35,
              fontSize: 10, bold: true, color: accent, fontFace: 'Courier New',
              shape: pptx.ShapeType.roundRect,
              rectRadius: 0.08,
              fill: { type: 'solid', color: accent },
              opacity: 0.15,
              align: 'center',
            } as any);

            pptSlide.addText(item, {
              x: x + 0.7, y: y + 0.15, w: cardW - 0.9, h: 0.9,
              fontSize: 11, color: 'C0CDD8', fontFace: 'Malgun Gothic',
              valign: 'top',
            });
          });
        }

      // ── 기본 레이아웃 ──
      } else {
        if (slide.keyMetrics && slide.keyMetrics.length > 0 && !slide.chartData) {
          addMetrics(pptx, pptSlide, slide.keyMetrics, yPos, accent);
          yPos += 1.4;
        }

        // Chart
        if (slide.chartData && slide.chartData.data && slide.chartData.data.length > 0) {
          const cd = slide.chartData;
          const chartW = slide.content && slide.content.length > 0 ? 6 : 11.4;
          const chartX = slide.content && slide.content.length > 0 ? 6.8 : 0.8;

          if (cd.chartType === 'pie') {
            const chartData = [{
              name: cd.title || '데이터',
              labels: cd.data.map(d => d.name),
              values: cd.data.map(d => d.value),
            }];
            pptSlide.addChart(pptx.ChartType.pie, chartData, {
              x: chartX, y: yPos, w: chartW, h: 4.2,
              showTitle: !!cd.title, title: cd.title || '',
              titleColor: FIXED.white, titleFontSize: 10,
              showLegend: cd.showLegend !== false, legendPos: 'r', legendColor: FIXED.muted,
              dataLabelPosition: 'outEnd', showPercent: true, showValue: false,
              chartColors: [accent, primary, FIXED.success, 'F5A623', FIXED.destructive, '7C3AED'],
            });
          } else {
            const chartTypeMap: Record<string, any> = {
              bar: pptx.ChartType.bar, line: pptx.ChartType.line, area: pptx.ChartType.area,
            };
            const pptxChartType = chartTypeMap[cd.chartType] || pptx.ChartType.bar;
            const chartData: any[] = [{
              name: cd.series1Label || '값',
              labels: cd.data.map(d => d.name),
              values: cd.data.map(d => d.value),
            }];
            if (cd.data.some(d => d.value2 !== undefined && d.value2 !== null)) {
              chartData.push({
                name: cd.series2Label || '비교값',
                labels: cd.data.map(d => d.name),
                values: cd.data.map(d => d.value2 ?? 0),
              });
            }
            pptSlide.addChart(pptxChartType, chartData, {
              x: chartX, y: yPos, w: chartW, h: 4.2,
              showTitle: !!cd.title, title: cd.title || '',
              titleColor: FIXED.white, titleFontSize: 10,
              showLegend: cd.showLegend !== false, legendPos: 'b', legendColor: FIXED.muted,
              catAxisLabelColor: FIXED.muted, valAxisLabelColor: FIXED.muted,
              catAxisTitle: cd.xAxisLabel || '', valAxisTitle: cd.yAxisLabel || '',
              chartColors: [accent, primary, FIXED.success, 'F5A623', FIXED.destructive],
              lineDataSymbol: 'circle', lineDataSymbolSize: 6,
              plotArea: { fill: { color: FIXED.cardBg } },
            } as any);
          }

          // Metrics bar below chart
          if (slide.keyMetrics && slide.keyMetrics.length > 0) {
            addMetricsBar(pptx, pptSlide, slide.keyMetrics, 6.5, accent);
          }
        }

        // Content bullets
        if (slide.content && slide.content.length > 0) {
          const bulletX = 0.8;
          const bulletW = slide.chartData ? 5.5 : 11.4;
          const bulletText = slide.content.map(c => ({
            text: c,
            options: { fontSize: 13, color: 'C0CDD8', bullet: { code: '25CF', color: accent }, breakLine: true, paraSpaceAfter: 8 },
          }));
          pptSlide.addText(bulletText as any, {
            x: bulletX, y: yPos, w: bulletW, h: 7.5 - yPos - 0.8,
            fontFace: 'Malgun Gothic', valign: 'top',
          });
        }
      }

      // Footer
      pptSlide.addText(brand.companyName, {
        x: 0.8, y: 7.0, w: 6, h: 0.35,
        fontSize: 8, color: '4A5568', fontFace: 'Malgun Gothic',
      });
    }

    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || '발표자료'}.pptx` });
}

// ── Helper: 인포그래픽 메트릭 (data 슬라이드용) ──
function addInfographicMetrics(
  pptx: PptxGenJS, slide: any, metrics: Slide['keyMetrics'],
  startY: number, accent: string, hasContent: boolean | undefined
) {
  if (!metrics) return;
  const cardW = hasContent ? 5.5 : Math.min(3.8, 12 / metrics.length);

  metrics.forEach((m, i) => {
    const trendColor = m.trend === 'up' ? FIXED.success : m.trend === 'down' ? FIXED.destructive : FIXED.muted;
    const x = hasContent ? 0.8 : 0.8 + i * (cardW + 0.3);
    const y = hasContent ? startY + i * 1.5 : startY;
    const h = hasContent ? 1.3 : 1.6;

    // Card background
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: cardW, h,
      rectRadius: 0.15,
      fill: { type: 'solid', color: FIXED.cardBg },
      line: { color: '2A3A4A', width: 0.5 },
    });

    // Label
    slide.addText(m.label, {
      x: x + 0.2, y: y + 0.1, w: cardW - 0.8, h: 0.3,
      fontSize: 9, color: FIXED.muted, fontFace: 'Malgun Gothic',
    });

    // Trend badge
    slide.addText(trendSymbols[m.trend] || '', {
      x: x + cardW - 0.6, y: y + 0.1, w: 0.4, h: 0.25,
      fontSize: 10, color: trendColor, fontFace: 'Malgun Gothic', align: 'center',
      shape: pptx.ShapeType.roundRect, rectRadius: 0.1,
      fill: { type: 'solid', color: trendColor },
      opacity: 0.12,
    } as any);

    // Large value
    slide.addText(m.value, {
      x: x + 0.2, y: y + 0.45, w: cardW - 0.4, h: 0.55,
      fontSize: 26, bold: true, color: trendColor, fontFace: 'Malgun Gothic',
    });

    // Progress bar background
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.2, y: y + h - 0.25, w: cardW - 0.4, h: 0.08,
      rectRadius: 0.04,
      fill: { type: 'solid', color: '2A3A4A' },
    });

    // Progress bar fill
    const barWidth = (cardW - 0.4) * (m.trend === 'up' ? 0.78 : m.trend === 'down' ? 0.35 : 0.5);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.2, y: y + h - 0.25, w: barWidth, h: 0.08,
      rectRadius: 0.04,
      fill: { type: 'solid', color: trendColor },
    });
  });
}

// ── Helper: 기본 메트릭 카드 ──
function addMetrics(
  pptx: PptxGenJS, slide: any, metrics: Slide['keyMetrics'],
  startY: number, accent: string, startX = 0.8, totalW = 12
) {
  if (!metrics) return;
  const mw = Math.min(3.5, (totalW - 0.3 * (metrics.length - 1)) / metrics.length);
  metrics.forEach((m, i) => {
    const trendColor = m.trend === 'up' ? FIXED.success : m.trend === 'down' ? FIXED.destructive : FIXED.muted;
    const x = startX + i * (mw + 0.3);

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: startY, w: mw, h: 1.1,
      rectRadius: 0.12,
      fill: { type: 'solid', color: FIXED.cardBg },
      line: { color: '2A3A4A', width: 0.5 },
    });

    slide.addText(m.label, {
      x: x + 0.15, y: startY + 0.1, w: mw - 0.6, h: 0.25,
      fontSize: 9, color: FIXED.muted, fontFace: 'Malgun Gothic',
    });

    slide.addText(trendSymbols[m.trend] || '', {
      x: x + mw - 0.45, y: startY + 0.1, w: 0.3, h: 0.25,
      fontSize: 10, color: trendColor, fontFace: 'Malgun Gothic', align: 'right',
    });

    slide.addText(m.value, {
      x: x + 0.15, y: startY + 0.45, w: mw - 0.3, h: 0.5,
      fontSize: 20, bold: true, color: FIXED.white, fontFace: 'Malgun Gothic',
    });
  });
}

// ── Helper: 차트 아래 가로 메트릭 바 ──
function addMetricsBar(pptx: PptxGenJS, slide: any, metrics: Slide['keyMetrics'], y: number, accent: string) {
  if (!metrics) return;
  const mw = Math.min(3, 12 / metrics.length);
  metrics.forEach((m, i) => {
    const trendColor = m.trend === 'up' ? FIXED.success : m.trend === 'down' ? FIXED.destructive : FIXED.muted;
    const x = 0.8 + i * (mw + 0.2);

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: mw, h: 0.6,
      rectRadius: 0.08,
      fill: { type: 'solid', color: FIXED.cardBg },
      line: { color: '2A3A4A', width: 0.5 },
    });

    slide.addText(`${m.label}  ${trendSymbols[m.trend]}  ${m.value}`, {
      x: x + 0.1, y, w: mw - 0.2, h: 0.6,
      fontSize: 10, color: 'C0CDD8', fontFace: 'Malgun Gothic',
      valign: 'middle',
    });
  });
}
