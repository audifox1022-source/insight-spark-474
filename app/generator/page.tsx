// ============================================================
// app/generator/page.tsx 
// [Enterprise] AI Generator Page Route
// [Next.js] App Router Framework - Full Viewport Render
// ============================================================

import React from 'react';
import { WorkAIGenerator } from '@/components/ai/WorkAIGenerator';

/**
 * BANANA NL 엔진이 탑재된 독립 생성 페이지입니다.
 * 기존 시스템과 격리된 상태에서 전체 화면 UI를 제공합니다.
 */
export default function GeneratorPage() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#F8FAFC]">
      {/* 
        독립된 AI 생성 워크플로우 컴포넌트를 렌더링합니다.
        내부적으로 3단 레이아웃(Prompt, Canvas, Inspector)을 포함하고 있습니다.
      */}
      <WorkAIGenerator />
    </main>
  );
}
