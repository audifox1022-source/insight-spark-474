// src/lib/export-presentation.tsx 내부의 exportToPptx 함수 교체

export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 비율 (13.33 x 7.5 inches)
  pptx.author = brand.companyName || 'AI Presentation';
  pptx.title = presentation.title || 'Untitled';

  const PRIMARY = hex(brand.primaryColor);
  const ACCENT  = hex(brand.accentColor);
  const WHITE   = 'FFFFFF';
  const DARK    = '1A2133';
  const GRAY    = '64748B';
  const BORDER  = 'E2E8F0';

  // 시스템 폰트 폴백 (JASO Sans가 PC에 없으면 굴림/맑은고딕으로 깨짐 방지)
  const SAFE_FONT = FONT + ', Malgun Gothic, Arial'; 

  const SW = 13.33;
  const SH = 7.5; 
  const PAD_X = 0.6;
  const PAD_Y = 0.5;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 1. 배경 처리
    const bgUrl = (slide as any).aiGeneratedBackgroundUrl || slide.imageUrl;
    const isSplit = (slide.layout === 'split-left' || slide.layout === 'split-right');

    if (bgUrl && !isSplit) {
      s.background = { path: bgUrl };
      // 배경 위에 텍스트가 잘 보이도록 흰색 반투명 레이어 덮기
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 15 } });
    }

    // 상단 브랜드 컬러 띠
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.08,
      fill: { color: PRIMARY }
    });

    const TITLE_PT = slide.titleFontPt ?? 32;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.025; // 폰트 크기에 비례한 높이 계산
    
    // 2. 표지 (Title) 슬라이드 
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: SH, fill: { color: PRIMARY } });
      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.35, w: SW - 2, fontSize: TITLE_PT + 16, bold: true, color: WHITE, align: 'center', fontFace: SAFE_FONT, breakLine: true
      });
      if (slide.subhead) {
        s.addText(safeString(slide.subhead), {
          x: 1, y: (SH * 0.35) + 1.2, w: SW - 2, fontSize: CONTENT_PT + 4, color: WHITE, transparency: 20, align: 'center', fontFace: SAFE_FONT
        });
      }
      continue;
    }

    // 3. 공통 헤더 (제목 영역)
    s.addShape(pptx.ShapeType.rect, { x: PAD_X, y: PAD_Y + 0.1, w: 0.1, h: TITLE_H * 0.8, fill: { color: PRIMARY } });
    s.addText(safeString(slide.title), {
      x: PAD_X + 0.25, y: PAD_Y, w: SW - 2, h: TITLE_H, fontSize: TITLE_PT, bold: true, color: DARK, fontFace: SAFE_FONT, valign: 'middle'
    });
    if (slide.subhead) {
      s.addText(safeString(slide.subhead), {
        x: PAD_X + 0.25, y: PAD_Y + TITLE_H, w: SW - 2, h: 0.4, fontSize: CONTENT_PT - 2, color: GRAY, fontFace: SAFE_FONT
      });
    }

    // 4. 레이아웃 영역 계산 (Split 대응)
    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const contentW = SW - (PAD_X * 2);
    const mainW = isSplit ? (contentW * (1 - visualRatio)) - 0.4 : contentW;
    const imgW  = isSplit ? (contentW * visualRatio) : 0;
    const contentX = (isSplit && slide.layout === 'split-left') ? PAD_X + imgW + 0.4 : PAD_X;
    const imgX = (slide.layout === 'split-left') ? PAD_X : PAD_X + mainW + 0.4;
    const contentY = PAD_Y + TITLE_H + (slide.subhead ? 0.6 : 0.4);
    const contentH = SH - contentY - 0.6;

    // 5. 슬라이드 타입별 콘텐츠 렌더링
    switch (slide.type) {
      case 'kpi':
        if (slide.keyMetrics && slide.keyMetrics.length > 0) {
          const gap = 0.3;
          const cols = slide.keyMetrics.length > 2 ? 2 : slide.keyMetrics.length;
          const cardW = (mainW - (gap * (cols - 1))) / cols;
          
          slide.keyMetrics.forEach((kpi, i) => {
            const x = contentX + (i % cols) * (cardW + gap);
            const y = contentY + Math.floor(i / cols) * 1.8;
            
            // 카드 배경
            s.addShape(pptx.ShapeType.roundRect, {
              x, y, w: cardW, h: 1.5, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1
            });
            s.addText(safeString(kpi.label), { x: x + 0.2, y: y + 0.2, w: cardW - 0.4, fontSize: CONTENT_PT - 4, color: GRAY, fontFace: SAFE_FONT });
            s.addText(safeString(kpi.value), { x: x + 0.2, y: y + 0.6, w: cardW - 0.4, fontSize: CONTENT_PT + 12, bold: true, color: PRIMARY, fontFace: SAFE_FONT });
            if (kpi.description) {
               s.addText(safeString(kpi.description), { x: x + 0.2, y: y + 1.1, w: cardW - 0.4, fontSize: CONTENT_PT - 6, color: DARK, fontFace: SAFE_FONT });
            }
          });
        }
        break;

      case 'chart':
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          const chartTypes: any = { bar: pptx.ChartType.bar, line: pptx.ChartType.line, pie: pptx.ChartType.pie };
          const chartTypeToUse = chartTypes[cd.chartType || 'bar'] || pptx.ChartType.bar;
          try {
             s.addChart(chartTypeToUse, 
              [{ name: cd.series1Label || 'Data', labels: cd.data.map(d => safeString(d.name)), values: cd.data.map(d => Number(d.value) || 0) }],
              { x: contentX, y: contentY, w: mainW, h: contentH, showLegend: true, chartColors: [PRIMARY, ACCENT, '22C55E', 'F59E0B'] }
            );
          } catch (e) {
            s.addText("차트 생성 오류", { x: contentX, y: contentY, color: 'FF0000' });
          }
        }
        break;

      case 'table': // ✅ 새로 추가된 테이블 로직
        if (slide.tableData?.headers && slide.tableData?.rows) {
          const tableRows = [];
          // 헤더 디자인
          tableRows.push(slide.tableData.headers.map(h => ({
            text: safeString(h),
            options: { fill: PRIMARY, color: WHITE, bold: true, fontSize: CONTENT_PT - 2, fontFace: SAFE_FONT, align: 'center', valign: 'middle' }
          })));
          // 로우 디자인
          slide.tableData.rows.forEach((row, rIdx) => {
            const rowColor = rIdx % 2 === 0 ? 'F8FAFC' : WHITE;
            tableRows.push(row.map(cell => ({
              text: safeString(cell),
              options: { fill: rowColor, color: DARK, fontSize: CONTENT_PT - 4, fontFace: SAFE_FONT, align: 'center', valign: 'middle' }
            })));
          });
          
          s.addTable(tableRows, {
            x: contentX, y: contentY, w: mainW,
            border: { pt: 1, color: BORDER },
            rowH: slide.tableDensity === 'compact' ? 0.4 : 0.6
          });
        }
        break;

      case 'compare': // ✅ 새로 추가된 좌우 비교 로직
        const halfW = (mainW / 2) - 0.2;
        // 왼쪽 박스 (AS-IS)
        s.addShape(pptx.ShapeType.roundRect, { x: contentX, y: contentY, w: halfW, h: contentH, fill: { color: 'F1F5F9' }, rectRadius: 0.1 });
        s.addText(safeString(slide.leftTitle || 'AS-IS'), { x: contentX + 0.2, y: contentY + 0.2, w: halfW - 0.4, fontSize: CONTENT_PT, bold: true, color: GRAY, align: 'center' });
        if (slide.leftItems) {
            const leftBullets = slide.leftItems.map(item => ({ text: safeString(item), options: { bullet: true, fontSize: CONTENT_PT - 2, color: DARK, paraSpaceAfter: 10 } }));
            s.addText(leftBullets, { x: contentX + 0.3, y: contentY + 0.8, w: halfW - 0.6, h: contentH - 1, valign: 'top' });
        }
        
        // 오른쪽 박스 (TO-BE)
        const rightX = contentX + halfW + 0.4;
        s.addShape(pptx.ShapeType.roundRect, { x: rightX, y: contentY, w: halfW, h: contentH, fill: { color: 'EFF6FF' }, line: { color: PRIMARY, width: 2 }, rectRadius: 0.1 });
        s.addText(safeString(slide.rightTitle || 'TO-BE'), { x: rightX + 0.2, y: contentY + 0.2, w: halfW - 0.4, fontSize: CONTENT_PT, bold: true, color: PRIMARY, align: 'center' });
        if (slide.rightItems) {
            const rightBullets = slide.rightItems.map(item => ({ text: safeString(item), options: { bullet: true, fontSize: CONTENT_PT - 2, color: DARK, paraSpaceAfter: 10 } }));
            s.addText(rightBullets, { x: rightX + 0.3, y: contentY + 0.8, w: halfW - 0.6, h: contentH - 1, valign: 'top' });
        }
        break;

      case 'quote': // ✅ 새로 추가된 인용구 로직
        s.addText('"', { x: contentX, y: contentY, w: mainW, fontSize: 80, color: ACCENT, transparency: 80, fontFace: SAFE_FONT });
        s.addText(safeString(slide.text || slide.content?.[0]), {
          x: contentX + 0.5, y: contentY + 0.5, w: mainW - 1, h: contentH - 2,
          fontSize: CONTENT_PT + 6, bold: true, color: DARK, align: 'center', fontFace: SAFE_FONT, italic: true
        });
        if (slide.author) {
          s.addText(`- ${safeString(slide.author)}`, {
            x: contentX, y: contentY + contentH - 1, w: mainW, fontSize: CONTENT_PT, color: GRAY, align: 'center', bold: true
          });
        }
        break;

      default: // 기본 텍스트 (Agenda, Content, Summary 등)
        const items = slide.content ?? slide.points ?? [];
        if (Array.isArray(items) && items.length > 0) {
          const bulletItems = items.map(item => ({
            text: safeString(item), 
            options: { bullet: { type: 'bullet' }, fontSize: CONTENT_PT, color: DARK, fontFace: SAFE_FONT, paraSpaceAfter: 12, lineSpacing: 28 }
          }));
          s.addText(bulletItems, { x: contentX, y: contentY, w: mainW, h: contentH, valign: 'top' });
        }
    }

    // 6. 이미지 처리 (Split 레이아웃일 경우)
    const finalImgUrl = (slide as any).aiGeneratedImageUrl || (isSplit ? slide.imageUrl : null);
    if (finalImgUrl) {
      try {
        s.addImage({
          path: finalImgUrl,
          x: isSplit ? imgX : contentX,
          y: contentY,
          w: isSplit ? imgW : mainW,
          h: contentH,
          sizing: { type: 'cover', w: isSplit ? imgW : mainW, h: contentH }
        });
      } catch (e) {
        console.error("PPT 이미지 삽입 실패", e);
      }
    }

    // 발표자 노트
    if (slide.notes) s.addNotes(safeString(slide.notes));
  }

  await pptx.writeFile({ fileName: `${presentation.title || 'Presentation'}_Editable.pptx` });
}
