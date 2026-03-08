// ============================================================
// src/components/AudienceToggle.tsx
// Feature 3: 다중 청중 적응형 엔진 — 토글 스위치 UI
// ============================================================
import { useAudienceStore } from '@/store/audienceStore';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export function AudienceToggle() {
  const { audienceMode, toggleAudienceMode } = useAudienceStore();
  const isInvestor = audienceMode === 'investor';

  const handleToggle = () => {
    toggleAudienceMode();
    const newModeIsInvestor = audienceMode !== 'investor';
    toast.success(`청중 모드가 [${newModeIsInvestor ? '투자자' : '실무진'}]용으로 변경되었습니다. 이후 AI 생성 시 반영됩니다.`);
  };

  return (
    <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-1.5 select-none">
      {/* 투자자 라벨 */}
      <span
        className={`text-xs font-bold transition-colors duration-200 ${
          isInvestor ? 'text-amber-500' : 'text-muted-foreground'
        }`}
      >
        💰 투자자
      </span>

      {/* 토글 버튼 */}
      <button
        onClick={handleToggle}
        title={`현재: ${isInvestor ? '투자자용' : '실무진용'} — 클릭해서 전환`}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isInvestor ? 'bg-amber-400' : 'bg-blue-500'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md"
          style={{ left: isInvestor ? 2 : 26 }}
        />
      </button>

      {/* 실무진 라벨 */}
      <span
        className={`text-xs font-bold transition-colors duration-200 ${
          !isInvestor ? 'text-blue-500' : 'text-muted-foreground'
        }`}
      >
        🔧 실무진
      </span>
    </div>
  );
}
