// ============================================================
// src/utils/pptxExporter.ts
// [SYNC REPAIR] PPTX 그리드 레이아웃 수학적 배치 동기화 (2x2, 2x3)
// [GRID FIX] 아이템 개수에 따른 동적 컬럼(2/3) 및 정밀 좌표 계산기 구현
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import pptxgen from 'pptxgenjs';
import { Presentation, SlideContent } from '@/types/presentation';

/**
 * 헥스 컬러값을 PPTX 호환 형식(앞의 # 제거)으로 변환
 */
const cleanColor = (hex: string): string => hex ? hex.replace('#', '') : '333333';

/**
 * 프레젠테이션 데이터를 PPTX 파일로 변환하여 다운로드
 */
export async function exportToPptx(presentation: Presentation) {
  const pptx = new pptxgen();
  const brandColor = presentation.brandColor || '#6366f1';
  
  // 1. 프레젠테이션 메타데이터 설정
  pptx.title = presentation.title;
  pptx.subject = 'Work AI Generated Presentation';
  pptx.author = 'Work AI Enterprise Architect';
  pptx.layout = 'LAYOUT_16x9';

  // 2. 각 슬라이드 루프
  presentation.slides.forEach((slide, index) => {
    const pptSlide = pptx.addSlide();
    const isFirstSlide = index === 0;
    const layout = slide.layout || 'default';

    // 슬라이드별 테마 설정
    const theme = slide.theme || {};
    const bgColor = cleanColor(theme.backgroundColor || theme.bgColor || (isFirstSlide ? '#0f172a' : '#ffffff'));
    const textColor = cleanColor(theme.textColor || (isFirstSlide ? '#ffffff' : '#0f172a'));
    const accentColor = cleanColor(theme.accentColor || brandColor);

    pptSlide.background = { color: bgColor };

    // 브랜드 상단 바 (공통 요소)
    if (layout !== 'cover') {
        pptSlide.addShape('RECTANGLE' as any, {
            x: 0, y: 0, w: '100%', h: 0.12,
            fill: { color: accentColor }
        });
    }

    // ── 컨텐츠 파싱 로직 (AI 데이터 스키마 오류 방어) ─────────────────────
    let contentList: SlideContent[] = [];
    if (Array.isArray(slide.content)) {
        contentList = slide.content.map((item: any) => ({
            heading: item.heading || item.title || item.text || item.head || (typeof item === 'string' ? item : ''),
            description: item.description || item.content || item.body || item.desc || ''
        }));
    } else if (typeof slide.content === 'string') {
        try {
            const parsed = JSON.parse(slide.content);
            contentList = Array.isArray(parsed) ? parsed.map((item: any) => ({
                heading: item.heading || item.title || item.text || '',
                description: item.description || item.content || item.body || ''
            })) : [{ heading: slide.content, description: '' }];
        } catch (e) {
            contentList = slide.content.split('\n').filter(Boolean).map(line => ({ heading: line, description: '' }));
        }
    }

    // ── [Layout Switcher] 레이아웃별 정밀 배치 ─────────────────
    switch (layout) {
      case 'cover':
        // 배경 데코 (큰 원형)
        pptSlide.addShape('ELLIPSE' as any, {
            x: 7.5, y: -1.5, w: 4, h: 4,
            fill: { color: accentColor, transparency: 80 }
        });

        pptSlide.addText(slide.title || 'Untitled Presentation', {
            x: 1, y: 1.8, w: 8, h: 1.2,
            fontSize: 44, bold: true, align: 'center', color: textColor, fontFace: 'Arial'
        });

        pptSlide.addShape('RECTANGLE' as any, {
            x: 4.25, y: 3.2, w: 1.5, h: 0.1,
            fill: { color: accentColor }
        });

        if (slide.subtitle) {
            pptSlide.addText(slide.subtitle, {
                x: 1, y: 3.5, w: 8, h: 0.5,
                fontSize: 22, align: 'center', color: accentColor, fontFace: 'Arial', bold: true
            });
        }
        
        pptSlide.addText('Strategic Analysis & Reporting by Work AI', {
            x: 0, y: 5.0, w: '100%',
            fontSize: 10, color: '64748B', align: 'center', bold: true
        });
        break;

      case 'grid': {
        // 제목 바인딩
        pptSlide.addText(slide.title || '', {
            x: 0.5, y: 0.4, w: 9, h: 0.8,
            fontSize: 32, bold: true, color: textColor, align: 'left'
        });

        // [CRITICAL FIX] 그리드 동적 좌표 계산 시스템 (2x2 또는 3x2 대응)
        const totalItems = contentList.length;
        const cols = totalItems <= 4 ? 2 : 3;
        const limit = cols === 2 ? 4 : 6;
        
        contentList.slice(0, limit).forEach((item, cIdx) => {
            const col = cIdx % cols;
            const row = Math.floor(cIdx / cols);
            
            // 수학적으로 레이아웃 비례 계산 (Inch 단위)
            // 16:9 슬라이드 기준 너비 10, 높이 5.625
            const horizontalGap = 0.25;
            const verticalGap = 0.25;
            const startX = 0.5;
            const startY = 1.3;
            
            const availableWidth = 9.0;
            const availableHeight = 4.0;
            
            const cardW = (availableWidth - (cols - 1) * horizontalGap) / cols;
            const cardH = (availableHeight - (1) * verticalGap) / 2; // 최대 2행 기준

            const xPos = startX + (col * (cardW + horizontalGap));
            const yPos = startY + (row * (cardH + verticalGap));

            // [PPTX REPRODUCTION] 카드 배경
            pptSlide.addShape('RECTANGLE' as any, {
                x: xPos, y: yPos, w: cardW, h: cardH,
                fill: { color: 'F8FAFC' },
                line: { color: 'E2E8F0', width: 1 }
            });

            // 숫자 인덱스 배지
            pptSlide.addShape('RECTANGLE' as any, {
                x: xPos + 0.15, y: yPos + 0.15, w: 0.4, h: 0.3,
                fill: { color: '1E293B' }
            });

            pptSlide.addText(String(cIdx + 1).padStart(2, '0'), {
                x: xPos + 0.15, y: yPos + 0.15, w: 0.4, h: 0.3,
                fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
            });

            // 제목 (heading) - line-clamp 대신 높이 제한으로 관리
            pptSlide.addText(item.heading || '제목 없음', {
                x: xPos + 0.65, y: yPos + 0.15, w: cardW - 0.8,
                fontSize: cols === 3 ? 14 : 16, 
                bold: true, 
                color: '0F172A', 
                fontFace: 'Arial'
            });

            // 본문 (description) - 줄 간격 및 폰트 크기 최적화
            pptSlide.addText(item.description || '내용 없음', {
                x: xPos + 0.15, y: yPos + 0.6, w: cardW - 0.3,
                fontSize: cols === 3 ? 9 : 10,
                color: '334155',
                fontFace: 'Arial',
                lineSpacing: 16,
                align: 'left',
                valign: 'top'
            });
        });
        break;
      }

      case 'split':
        pptSlide.addText(slide.title || '', {
            x: 0.5, y: 1.5, w: 4.0, h: 2.0,
            fontSize: 36, bold: true, color: textColor, align: 'left', valign: 'middle'
        });

        pptSlide.addShape('LINE' as any, {
            x: 5.0, y: 1.2, w: 0, h: 3.5,
            line: { color: 'E2E8F0', width: 1 }
        });

        contentList.forEach((item, cIdx) => {
            const yPos = 1.2 + (cIdx * 0.9);
            if (yPos > 4.8) return;

            pptSlide.addText(item.heading, {
                x: 5.4, y: yPos, w: 4.1,
                fontSize: 18, bold: true, color: '1E293B',
                bullet: { type: 'bullet', code: '2022' }
            });

            if (item.description) {
                pptSlide.addText(item.description, {
                    x: 5.7, y: yPos + 0.35, w: 3.8,
                    fontSize: 11, color: '64748B'
                });
            }
        });
        break;

      case 'timeline':
        pptSlide.addText(slide.title || '', {
            x: 0.5, y: 0.4, w: 9, h: 0.8,
            fontSize: 30, bold: true, color: textColor
        });

        pptSlide.addShape('LINE' as any, {
            x: 0.5, y: 3.2, w: 9.0, h: 0,
            line: { color: accentColor, width: 3 }
        });

        contentList.slice(0, 5).forEach((item, cIdx) => {
            const xPos = 0.5 + (cIdx * 1.8);
            const isTop = cIdx % 2 === 0;
            const yPos = isTop ? 1.6 : 3.5;

            pptSlide.addShape('ELLIPSE' as any, {
                x: xPos + 0.75, y: 3.1, w: 0.25, h: 0.25,
                fill: { color: accentColor }
            });

            pptSlide.addText(item.heading, {
                x: xPos, y: yPos, w: 1.8,
                fontSize: 14, bold: true, color: '1E293B', align: 'center'
            });

            pptSlide.addText(item.description, {
                x: xPos, y: isTop ? yPos + 0.4 : yPos + 0.4, w: 1.8,
                fontSize: 10, color: '64748B', align: 'center'
            });
        });
        break;

      case 'quote': {
        pptSlide.addShape('RECTANGLE' as any, {
            x: 0, y: 1.5, w: '100%', h: 2.5,
            fill: { color: accentColor, transparency: 95 }
        });

        const quoteText = contentList[0]?.heading || slide.title || '';
        pptSlide.addText(`"${quoteText}"`, {
            x: 1.0, y: 1.5, w: 8.0, h: 2.5,
            fontSize: 36, italic: true, bold: true, color: accentColor, align: 'center', valign: 'middle'
        });
        break;
      }

      default:
        pptSlide.addText(slide.title || '', {
            x: 0.5, y: 0.4, w: 9, h: 0.8,
            fontSize: 32, bold: true, color: textColor
        });

        contentList.slice(0, 5).forEach((item, cIdx) => {
            const yPos = 1.4 + (cIdx * 0.85);
            if (yPos > 5.2) return;

            pptSlide.addShape('RECTANGLE' as any, {
                x: 0.5, y: yPos + 0.1, w: 0.08, h: 0.4,
                fill: { color: accentColor }
            });

            pptSlide.addText(item.heading, {
                x: 0.7, y: yPos, w: 8.8,
                fontSize: 22, bold: true, color: '0F172A'
            });

            if (item.description) {
                pptSlide.addText(item.description, {
                    x: 0.7, y: yPos + 0.45, w: 8.8,
                    fontSize: 12, color: '475569'
                });
            }
        });
    }

    // 공통 푸터
    if (layout !== 'cover') {
        pptSlide.addText(`Work AI Intelligence | ${presentation.title} | Page ${index + 1}`, {
            x: 0.5, y: 5.3, w: 8.0,
            fontSize: 8, color: '94A3B8'
        });

        pptSlide.addShape('RECTANGLE' as any, {
            x: 9.35, y: 5.3, w: 0.25, h: 0.25,
            fill: { color: accentColor }
        });

        pptSlide.addText(`${index + 1}`, {
            x: 9.35, y: 5.3, w: 0.25, h: 0.25,
            fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle'
        });
    }
  });

  // 3. 파일 저장
  const safeTitle = (presentation.title || 'Presentation').replace(/[^a-z0-9가-힣]/gi, '_').toLowerCase();
  const fileName = `WorkAI_${safeTitle}_${Date.now()}.pptx`;
  await pptx.writeFile({ fileName });
}
