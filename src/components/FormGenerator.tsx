// ============================================================
// FormGenerator.tsx — 양식 생성기 메인 컴포넌트
// ============================================================
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formAiService } from '@/lib/form-ai-service';
import { getKoreanErrorMessage } from '@/lib/retry-with-backoff';
import {
  Sparkles, Download, RefreshCw, Loader2,
  FileText, Wand2, RotateCcw, Edit3,
  ChevronDown, ExternalLink,
} from 'lucide-react';

// 자주 쓰는 양식 빠른 선택
const PRESET_FORMS = [
  { name: '주간업무 보고서',    icon: '📊', desc: '주간 업무 현황 및 성과 보고' },
  { name: '회의록',             icon: '📝', desc: '회의 안건, 논의사항, 결정사항 기록' },
  { name: '업무 기획서',        icon: '💡', desc: '신규 업무/프로젝트 기획안' },
  { name: '프로젝트 제안서',    icon: '🤝', desc: '사업 제안 및 협력 요청 문서' },
  { name: '품의서',             icon: '✅', desc: '결재 요청 및 승인 문서' },
  { name: '출장 보고서',        icon: '✈️', desc: '출장 결과 및 성과 보고' },
  { name: '교육훈련 계획서',    icon: '🎓', desc: '직원 교육 계획 및 실적 문서' },
  { name: '이력서',             icon: '👔', desc: '한국형 표준 이력서' },
  { name: '사업 계획서',        icon: '📈', desc: '연간/분기 사업 계획' },
  { name: '보도자료',           icon: '📰', desc: '공식 보도자료 양식' },
  { name: '납품 확인서',        icon: '📦', desc: '물품 납품 및 검수 확인' },
  { name: '업무 인수인계서',    icon: '🔄', desc: '업무 인수인계 체크리스트' },
];

export function FormGenerator() {
  const [formName,      setFormName]      = useState('');
  const [requirements,  setRequirements]  = useState('');
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [modifyRequest, setModifyRequest] = useState('');
  const [isModifying,   setIsModifying]   = useState(false);
  const [showPresets,   setShowPresets]   = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 양식 생성
  const handleGenerate = async () => {
    if (!formName.trim()) {
      toast.error('양식명을 입력해주세요.');
      return;
    }
    setIsGenerating(true);
    setShowPresets(false);
    try {
      toast.loading('AI가 양식을 생성 중입니다...', { id: 'form-gen' });
      const html = await formAiService.generateForm(formName, requirements);
      setGeneratedHtml(html);
      toast.success('양식이 생성되었습니다!', { id: 'form-gen' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'form-gen' });
    } finally {
      setIsGenerating(false);
    }
  };

  // 양식 수정
  const handleModify = async () => {
    if (!generatedHtml) return;
    if (!modifyRequest.trim()) {
      toast.error('수정 요청사항을 입력해주세요.');
      return;
    }
    setIsModifying(true);
    try {
      toast.loading('AI가 양식을 수정 중...', { id: 'form-mod' });
      const html = await formAiService.modifyForm(generatedHtml, modifyRequest);
      setGeneratedHtml(html);
      setModifyRequest('');
      toast.success('양식이 수정되었습니다!', { id: 'form-mod' });
    } catch (err: any) {
      toast.error(getKoreanErrorMessage(err), { id: 'form-mod' });
    } finally {
      setIsModifying(false);
    }
  };

  // HTML 파일 다운로드
  const handleDownloadHtml = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${formName}_양식_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML 파일이 다운로드되었습니다.');
  };

  // 새 창에서 열기
  const handleOpenInNewTab = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // 프리셋 선택
  const handlePresetSelect = (preset: typeof PRESET_FORMS[0]) => {
    setFormName(preset.name);
    setRequirements('');
    setShowPresets(false);
  };

  // 초기화
  const handleReset = () => {
    setFormName('');
    setRequirements('');
    setGeneratedHtml(null);
    setModifyRequest('');
    setShowPresets(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">

      {/* ── 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <span className="text-3xl">📝</span>
          AI 양식 생성기
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          양식명과 요청사항을 입력하면 AI가 한국 업무환경에 최적화된 HTML 양식을 즉시 생성합니다.
        </p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">

        {/* ── 왼쪽 입력 패널 */}
        <div className="w-full lg:w-[380px] flex-shrink-0 space-y-4">

          {/* 양식명 입력 */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <label className="text-sm font-bold text-foreground mb-2 block">
              <FileText className="w-4 h-4 inline mr-1.5 text-primary" />
              양식명 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="예: 주간업무 보고서, 회의록, 품의서..."
              className="mb-3"
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
            />

            <label className="text-sm font-bold text-foreground mb-2 block">
              <Edit3 className="w-4 h-4 inline mr-1.5 text-primary" />
              추가 요청사항
            </label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={"예: 결재란 3단계 포함\n예: 태웅 회사 양식으로\n예: 15000톤 프레스 관련 항목 추가"}
              rows={4}
              className="resize-none text-sm mb-4"
            />

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !formName.trim()}
              className="w-full gap-2 gradient-primary text-primary-foreground border-0 h-11"
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" />양식 생성 중...</>
                : <><Sparkles className="w-4 h-4" />AI 양식 생성</>
              }
            </Button>
          </div>

          {/* 생성 후 액션 버튼 */}
          <AnimatePresence>
            {generatedHtml && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
              >
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">다운로드 / 열기</p>

                <Button
                  onClick={handleDownloadHtml}
                  variant="outline"
                  className="w-full gap-2 text-sm"
                >
                  <Download className="w-4 h-4 text-primary" />
                  HTML 파일 다운로드
                </Button>

                <Button
                  onClick={handleOpenInNewTab}
                  variant="outline"
                  className="w-full gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  새 창에서 열기 (PDF 저장 가능)
                </Button>

                <Button
                  onClick={handleReset}
                  variant="ghost"
                  className="w-full gap-2 text-sm text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  처음으로
                </Button>

                {/* 수정 요청 */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">AI 수정 요청</p>
                  <Textarea
                    value={modifyRequest}
                    onChange={(e) => setModifyRequest(e.target.value)}
                    placeholder={"예: 결재란을 5단계로 늘려줘\n예: 표 색상을 파란색으로 변경\n예: 항목 추가: 담당자 연락처"}
                    rows={3}
                    className="resize-none text-sm mb-2"
                  />
                  <Button
                    onClick={handleModify}
                    disabled={isModifying || !modifyRequest.trim()}
                    variant="outline"
                    className="w-full gap-2 text-sm"
                  >
                    {isModifying
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />수정 중...</>
                      : <><Wand2 className="w-3.5 h-3.5" />수정 요청</>
                    }
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 자주 쓰는 양식 프리셋 */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-between text-sm font-bold text-foreground mb-3"
            >
              <span>⚡ 자주 쓰는 양식</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  {PRESET_FORMS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <span className="text-lg flex-shrink-0">{preset.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{preset.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── 오른쪽 미리보기 */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden" style={{ minHeight: '600px' }}>
            {generatedHtml ? (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                  <span className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    미리보기: {formName}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      재생성
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenInNewTab}
                      className="h-7 text-xs gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      새 창
                    </Button>
                  </div>
                </div>
                <iframe
                  ref={iframeRef}
                  srcDoc={generatedHtml}
                  className="w-full border-0"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}
                  title="양식 미리보기"
                  sandbox="allow-scripts allow-same-origin allow-modals allow-downloads"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-32 text-center">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">AI가 양식을 생성하고 있습니다...</p>
                      <p className="text-xs text-muted-foreground">한국 업무환경에 최적화된 양식을 만드는 중</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      <span className="text-6xl">📋</span>
                      <p className="text-base font-semibold text-muted-foreground">
                        양식명을 입력하고 생성 버튼을 눌러주세요
                      </p>
                      <p className="text-xs text-muted-foreground">
                        또는 왼쪽 "자주 쓰는 양식"에서 선택하세요
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
