import React from 'react';
import { ArrowRight, Layers, BarChart3, Table as TableIcon, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * ScaledSlide — 가독성 개선판
 *
 * [주요 변경사항]
 * 1. 레이아웃: 패딩 p-16 → p-[5%_6%] (비율 기반, 내용 잘림 방지)
 * 2. 제목 계층: text-5xl font-black → text-[2.6rem] font-bold (덜 과격한 굵기)
 *    - 좌측 강조바 두께 12px → 6px (더 정제된 느낌)
 *    - 제목과 본문 간격 mb-12 → mb-7 (불필요한 공백 제거)
 * 3. 불릿 포인트: space-y-6 → space-y-[clamp(0.6rem,1.8vh,1.4rem)] (화면 크기 비례)
 *    - 텍스트 크기 text-2xl → text-[clamp(1.1rem,2.2vh,1.6rem)] (overflow 방지)
 *    - 줄간격 leading-snug → leading-relaxed (한국어 가독성 향상)
 * 4. KPI 카드: 배경/테두리 대비 강화, 수치 크기 반응형으로 조정
 * 5. 테이블: 홀짝 행 배경색 추가, 헤더 대비 강화
 * 6. 프로세스: 번호 배지 크기 키우고 연결선 추가
 * 7. 사이클: 화살표 위치 수정, 아이템 크기 반응형
 * 8. 공통 빈 상태: 더 간결한 안내 문구
 */

interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: string[];
  infographicType?: string;
  chartData?: {
    type?: string;
    labels?: string[];
    datasets?: { label: string; data: number[] }[];
  };
  tableData?: {
    headers?: string[];
    rows?: string[][];
  };
  keyMetrics?: { label: string; value: string; trend?: string }[];
  slideNumber?: number;
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ── 공통 빈 상태 컴포넌트 ──────────────────────────────────
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 text-gray-400">
      <div className="opacity-25">{icon}</div>
      <p className="text-[1.1rem] font-medium tracking-wide">{message}</p>
    </div>
  );
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  const rawContent = slide.content || slide.points || slide.items;
  const content = Array.isArray(rawContent) ? rawContent : [];

  // ── 인포그래픽 렌더링 ─────────────────────────────────────
  const renderInfographic = () => {
    switch (slide.infographicType) {

      // 순환형 (cycle)
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full gap-3 px-4">
            {content.map((item, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                  {/* 번호 뱃지 */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  {/* 원형 카드 */}
                  <div
                    className="w-full aspect-square max-w-[9rem] rounded-2xl border-2 border-primary/20 bg-white shadow-md flex items-center justify-center p-4 text-center leading-snug"
                    style={{ fontSize: 'clamp(0.75rem, 1.5vh, 1rem)', fontWeight: 600, color: '#1e293b' }}
                  >
                    {String(item)}
                  </div>
                </div>
                {i < content.length - 1 && (
                  <ArrowRight
                    className="text-primary/40 flex-shrink-0"
                    style={{ width: 'clamp(1rem,2vw,1.75rem)', height: 'clamp(1rem,2vw,1.75rem)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        );

      // 프로세스형 (process)
      case 'process':
        return (
          <div className="h-full flex flex-col justify-center gap-3 px-2">
            {content.map((item, i) => (
              <div key={i} className="flex items-start gap-4 group">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="rounded-xl bg-primary text-white flex items-center justify-center font-black flex-shrink-0"
                    style={{ width: 'clamp(2rem,3.5vh,2.75rem)', height: 'clamp(2rem,3.5vh,2.75rem)', fontSize: 'clamp(0.75rem,1.5vh,1rem)' }}
                  >
                    {i + 1}
                  </div>
                  {i < content.length - 1 && (
                    <div className="w-0.5 flex-1 min-h-[0.75rem] bg-primary/15 mt-1" />
                  )}
                </div>
                {/* 내용 카드 */}
                <div
                  className="flex-1 rounded-xl bg-white border border-gray-200 shadow-sm px-5 py-3 font-medium text-gray-800 leading-relaxed"
                  style={{ fontSize: 'clamp(0.85rem,1.8vh,1.2rem)' }}
                >
                  {String(item)}
                </div>
              </div>
            ))}
          </div>
        );

      // 기본 불릿 리스트
      default:
        return (
          <ul className="h-full flex flex-col justify-center" style={{ gap: 'clamp(0.5rem,1.6vh,1.2rem)' }}>
            {content.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-4 text-gray-800 leading-relaxed"
                style={{ fontSize: 'clamp(1rem,2vh,1.5rem)' }}
              >
                {/* 불릿 도트 — 텍스트 첫 줄 중앙에 맞춤 */}
                <span
                  className="rounded-full bg-primary flex-shrink-0 mt-[0.35em]"
                  style={{ width: 'clamp(0.45rem,0.9vh,0.65rem)', height: 'clamp(0.45rem,0.9vh,0.65rem)' }}
                />
                <span className="flex-1">{String(item)}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  // ── 차트 렌더링 (CSS 순수 막대 차트) ──────────────────────
  const renderChart = () => {
    const { chartData } = slide;
    if (!chartData || !Array.isArray(chartData.labels) || !Array.isArray(chartData.datasets)) {
      return <EmptyState icon={<BarChart3 size={56} />} message="차트 데이터를 분석 중입니다..." />;
    }

    return (
      <div className="h-full flex flex-col pt-4 gap-4">
        {/* 범례 */}
        <div className="flex justify-center gap-5 flex-wrap">
          {chartData.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-1.5 font-semibold text-gray-600" style={{ fontSize: 'clamp(0.7rem,1.3vh,0.9rem)' }}>
              <span className="rounded-sm bg-primary inline-block" style={{ width: 12, height: 12, opacity: 1 - i * 0.35 }} />
              {ds.label}
            </div>
          ))}
        </div>

        {/* 막대 영역 */}
        <div className="flex-1 flex items-end justify-around border-b-2 border-gray-200 pb-2 gap-2">
          {chartData.labels.map((label, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className="w-full flex justify-center items-end gap-1" style={{ height: 'clamp(6rem,18vh,14rem)' }}>
                {chartData.datasets?.map((ds, dsIdx) => {
                  const value = ds.data[idx] ?? 0;
                  const maxVal = Math.max(...ds.data.filter(v => typeof v === 'number'), 1);
                  const heightPct = `${(value / maxVal) * 100}%`;
                  return (
                    <div
                      key={dsIdx}
                      className="rounded-t-lg bg-primary transition-all duration-500 flex items-start justify-center overflow-hidden"
                      style={{
                        width: 'clamp(1.8rem,4vw,3.5rem)',
                        height: heightPct,
                        opacity: 1 - dsIdx * 0.35,
                        paddingTop: '0.3rem',
                        fontSize: 'clamp(0.6rem,1.1vh,0.8rem)',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
              <span className="font-semibold text-gray-700 text-center leading-tight" style={{ fontSize: 'clamp(0.65rem,1.2vh,0.85rem)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── 테이블 렌더링 ─────────────────────────────────────────
  const renderTable = () => {
    const { tableData } = slide;
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return <EmptyState icon={<TableIcon size={56} />} message="표 데이터를 구성 중입니다..." />;
    }

    return (
      <div className="w-full h-full overflow-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          {/* 헤더: 진한 primary 배경으로 대비 강화 */}
          <thead>
            <tr className="bg-primary text-white">
              {tableData.headers.map((header, i) => (
                <th
                  key={i}
                  className="px-5 py-3.5 font-bold tracking-wide border-r border-white/10 last:border-r-0"
                  style={{ fontSize: 'clamp(0.8rem,1.6vh,1.1rem)' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          {/* 본문: 홀짝 줄 배경으로 읽기 편하게 */}
          <tbody>
            {tableData.rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-b-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}`}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-5 py-3 text-gray-700 border-r border-gray-100 last:border-r-0"
                    style={{ fontSize: 'clamp(0.75rem,1.5vh,1rem)' }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── KPI 지표 렌더링 ──────────────────────────────────────
  const renderKPI = () => {
    const { keyMetrics } = slide;
    if (!keyMetrics || !Array.isArray(keyMetrics) || keyMetrics.length === 0) {
      return <EmptyState icon={<Target size={56} />} message="핵심 지표를 도출 중입니다..." />;
    }

    const cols = keyMetrics.length <= 2 ? keyMetrics.length : keyMetrics.length <= 4 ? 2 : 3;

    return (
      <div
        className="h-full content-center"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 'clamp(0.75rem,2vh,1.5rem)' }}
      >
        {keyMetrics.map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 shadow-md flex flex-col items-center justify-center text-center"
            style={{ padding: 'clamp(1rem,3vh,2rem) clamp(0.75rem,2vw,1.5rem)', gap: 'clamp(0.4rem,1vh,0.75rem)' }}
          >
            {/* 레이블 */}
            <p
              className="font-semibold text-gray-500 uppercase tracking-widest leading-tight"
              style={{ fontSize: 'clamp(0.6rem,1.2vh,0.85rem)' }}
            >
              {kpi.label}
            </p>

            {/* 수치 — 가장 눈에 띄어야 함 */}
            <p
              className="font-black text-primary leading-none"
              style={{ fontSize: 'clamp(1.8rem,5.5vh,3.5rem)' }}
            >
              {kpi.value}
            </p>

            {/* 트렌드 배지 */}
            {kpi.trend && (
              <span
                className={`flex items-center gap-1 font-bold rounded-full px-3 py-1 ${
                  kpi.trend === 'up'
                    ? 'bg-emerald-100 text-emerald-700'
                    : kpi.trend === 'down'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
                style={{ fontSize: 'clamp(0.6rem,1.2vh,0.8rem)' }}
              >
                {kpi.trend === 'up'
                  ? <><TrendingUp size={12} /> 상승</>
                  : kpi.trend === 'down'
                  ? <><TrendingDown size={12} /> 하락</>
                  : <><Minus size={12} /> 유지</>}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── 타입별 분기 ───────────────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'chart': return renderChart();
      case 'table': return renderTable();
      case 'kpi':   return renderKPI();
      default:
        if (content.length === 0) {
          return (
            <EmptyState
              icon={<Layers size={64} />}
              message="슬라이드 내용을 구성 중입니다..."
            />
          );
        }
        return renderInfographic();
    }
  };

  // ── 슬라이드 타입별 배경 ──────────────────────────────────
  const isTitle = slide.type === 'title';
  const isClosing = slide.type === 'closing';
  const isAccentSlide = isTitle || isClosing;

  return (
    <div
      className={`aspect-video w-full relative overflow-hidden ${containerClassName}`}
      style={{ background: isAccentSlide ? 'hsl(var(--primary))' : '#ffffff' }}
    >
      {/* ── 배경 장식 (title/closing 전용) ──────────────────── */}
      {isAccentSlide && (
        <>
          <div
            className="absolute -top-1/4 -right-1/4 rounded-full opacity-10"
            style={{ width: '70%', paddingBottom: '70%', background: 'hsl(var(--accent))' }}
          />
          <div
            className="absolute -bottom-1/3 -left-1/4 rounded-full opacity-[0.07]"
            style={{ width: '60%', paddingBottom: '60%', background: 'white' }}
          />
        </>
      )}

      {/* ── 워터마크 ─────────────────────────────────────────── */}
      {watermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none rotate-[-30deg] font-black text-gray-900 opacity-[0.025]"
          style={{ fontSize: 'clamp(3rem,10vw,8rem)' }}
        >
          {watermark}
        </div>
      )}

      {/* ── 로고 ─────────────────────────────────────────────── */}
      {logoUrl && (
        <div className="absolute top-6 right-8 flex items-center justify-end" style={{ width: '10%', maxWidth: '6rem' }}>
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-10 object-contain" />
        </div>
      )}

      {/* ── 하단 액센트 바 ────────────────────────────────────── */}
      {!isAccentSlide && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary/20" />
      )}

      {/* ── 메인 레이아웃 ─────────────────────────────────────── */}
      <div
        className="h-full flex flex-col"
        style={{ padding: 'clamp(1.5rem,5vh,3.5rem) clamp(2rem,5.5vw,4.5rem)' }}
      >
        {/* 제목 영역 */}
        {isAccentSlide ? (
          // title/closing 슬라이드: 중앙 정렬, 흰 글씨
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <h1
              className="font-black text-white leading-tight tracking-tight"
              style={{ fontSize: 'clamp(1.8rem,5.5vh,4rem)' }}
            >
              {slide.title || '제목'}
            </h1>
            {content.length > 0 && (
              <p
                className="text-white/70 font-medium leading-relaxed max-w-[70%]"
                style={{ fontSize: 'clamp(0.9rem,2vh,1.4rem)' }}
              >
                {content[0]}
              </p>
            )}
          </div>
        ) : (
          // 일반 슬라이드
          <>
            {/* 제목 + 좌측 강조바 */}
            <div className="flex items-stretch gap-4 mb-6 flex-shrink-0">
              <div className="w-1.5 rounded-full bg-primary flex-shrink-0" style={{ minHeight: '100%' }} />
              <h2
                className="font-bold text-gray-900 leading-tight tracking-tight"
                style={{ fontSize: 'clamp(1.4rem,3.2vh,2.4rem)' }}
              >
                {slide.title || '제목 없음'}
              </h2>
            </div>

            {/* 본문 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderContent()}
            </div>
          </>
        )}
      </div>

      {/* ── 페이지 번호 ──────────────────────────────────────── */}
      {slide.slideNumber && (
        <div
          className={`absolute bottom-3 right-5 font-mono font-semibold ${isAccentSlide ? 'text-white/40' : 'text-gray-300'}`}
          style={{ fontSize: 'clamp(0.55rem,1vh,0.75rem)' }}
        >
          {slide.slideNumber}
        </div>
      )}
    </div>
  );
};
