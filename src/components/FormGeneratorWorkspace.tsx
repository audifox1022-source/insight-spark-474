// ============================================================
// FormGeneratorWorkspace.tsx — 문서생성기 UI 전면 개선판
// 개선: 로딩 파이프라인 UI, 새 창 열기, 프리셋 커스터마이징,
//       다운로드 상단 배치, 퀄리티 전반 향상
// ============================================================
import { useState, useRef } from 'react'
import { formAiService } from '@/lib/form-ai-service'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, Download, RefreshCw, Loader2, PencilLine,
  Wand2, Send, Sparkles, CheckCircle2, ExternalLink,
  RotateCcw, Copy, Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'

const FORM_PRESETS = [
  { id: 'report',    icon: '📊', label: '보고서',    desc: '주간/월간 업무 보고서',   color: 'from-blue-500 to-cyan-400'    },
  { id: 'plan',      icon: '📋', label: '계획서',    desc: '프로젝트·업무 계획서',    color: 'from-violet-500 to-purple-400'},
  { id: 'meeting',   icon: '👥', label: '회의록',    desc: '회의 내용 기록 양식',     color: 'from-emerald-500 to-teal-400' },
  { id: 'proposal',  icon: '🤝', label: '제안서',    desc: '사업·개선 제안서',        color: 'from-orange-500 to-amber-400' },
  { id: 'approval',  icon: '✅', label: '품의서',    desc: '결재·승인 요청 양식',     color: 'from-rose-500 to-pink-400'    },
  { id: 'resume',    icon: '👔', label: '이력서',    desc: '한국형 표준 이력서',      color: 'from-indigo-500 to-blue-400'  },
  { id: 'contract',  icon: '📜', label: '계약서',    desc: '표준 업무 계약서 양식',   color: 'from-yellow-500 to-orange-400'},
  { id: 'manual',    icon: '✏️', label: '직접 입력', desc: '양식명을 직접 입력',      color: 'from-slate-500 to-gray-400'   },
]

// 로딩 시 단계별 메시지 (파이프라인 느낌)
const LOADING_STEPS = [
  { icon: '🔍', label: '문서 구조 분석 중',   desc: 'AI가 양식의 최적 구조를 설계합니다' },
  { icon: '🎨', label: 'HTML 레이아웃 생성',  desc: 'Tailwind CSS로 전문 레이아웃을 구성합니다' },
  { icon: '⚙️', label: '동적 기능 탑재',      desc: '저장·계산·인쇄 기능을 자동 연결합니다' },
  { icon: '✨', label: '최종 문서 완성',       desc: '완성도 검수 후 바로 사용 가능한 양식을 준비합니다' },
]

export function FormGeneratorWorkspace() {
  const [activePreset,   setActivePreset]   = useState('report')
  const [customName,     setCustomName]     = useState('')
  const [requirements,   setRequirements]   = useState('')
  const [generatedHtml,  setGeneratedHtml]  = useState<string | null>(null)
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [isModifying,    setIsModifying]    = useState(false)
  const [modifyRequest,  setModifyRequest]  = useState('')
  const [showModify,     setShowModify]     = useState(false)
  const [loadingStep,    setLoadingStep]    = useState(0)
  const [isFullscreen,   setIsFullscreen]   = useState(false)
  const loadingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const activePresetData = FORM_PRESETS.find(p => p.id === activePreset)
  const resolvedName = activePreset === 'manual' ? customName : (activePresetData?.label ?? '')

  // ── 로딩 타이머 (파이프라인 단계 시각화)
  const startLoadingTimer = () => {
    setLoadingStep(0)
    loadingTimer.current = setInterval(() => {
      setLoadingStep(s => (s < LOADING_STEPS.length - 1 ? s + 1 : s))
    }, 2500)
  }
  const stopLoadingTimer = () => {
    if (loadingTimer.current) { clearInterval(loadingTimer.current); loadingTimer.current = null }
    setLoadingStep(0)
  }

  // ── 양식 생성
  const handleGenerate = async () => {
    if (!resolvedName.trim()) { toast.error('양식명을 입력해주세요.'); return }
    setIsGenerating(true)
    setGeneratedHtml(null)
    startLoadingTimer()
    try {
      const html = await formAiService.generateForm(resolvedName, requirements)
      setGeneratedHtml(html)
      toast.success(`✅ "${resolvedName}" 양식 생성 완료!`)
    } catch (err: any) {
      toast.error(err.message ?? '양식 생성 중 오류가 발생했습니다.')
    } finally {
      stopLoadingTimer()
      setIsGenerating(false)
    }
  }

  // ── AI 수정
  const handleModify = async () => {
    if (!generatedHtml || !modifyRequest.trim()) return
    setIsModifying(true)
    startLoadingTimer()
    try {
      const html = await formAiService.modifyForm(generatedHtml, modifyRequest)
      setGeneratedHtml(html)
      setModifyRequest('')
      setShowModify(false)
      toast.success('수정 완료!')
    } catch (err: any) {
      toast.error(err.message ?? '수정 중 오류가 발생했습니다.')
    } finally {
      stopLoadingTimer()
      setIsModifying(false)
    }
  }

  // ── HTML 다운로드
  const handleDownload = () => {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')
    a.href = url; a.download = `${resolvedName}_${date}.html`; a.click()
    URL.revokeObjectURL(url)
    toast.success('💾 HTML 파일 다운로드 완료!')
  }

  // ── 새 창에서 열기 (PDF 저장 가능)
  const handleOpenInNewTab = () => {
    if (!generatedHtml) return
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  // ── HTML 소스 복사
  const handleCopyHtml = () => {
    if (!generatedHtml) return
    navigator.clipboard.writeText(generatedHtml)
    toast.success('HTML 소스가 클립보드에 복사되었습니다.')
  }

  // ── 초기화
  const handleReset = () => {
    setGeneratedHtml(null)
    setModifyRequest('')
    setShowModify(false)
    setIsFullscreen(false)
  }

  return (
    <div className={`flex flex-col gap-4 p-2 md:p-4 overflow-hidden w-full mx-auto transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-0' : 'max-w-[1400px] h-full'}`}>

      {/* ── 헤더 ── */}
      {!isFullscreen && (
        <div className="flex-shrink-0 relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm">
          {/* 배경 장식 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-2xl" />
            <div className="absolute -bottom-4 left-12 w-32 h-32 rounded-full bg-gradient-to-br from-accent/10 to-primary/5 blur-xl" />
          </div>
          <div className="relative flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                <Wand2 className="w-3 h-3" /> AI 문서 생성 마스터
              </div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                WorkAI{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  고품격 문서 생성기
                </span>
              </h2>
              <p className="text-muted-foreground text-xs hidden md:block">
                양식 종류를 선택하고 요청사항을 입력하면 AI가 즉시 완성된 HTML 문서를 만들어냅니다.
              </p>
            </div>
            {/* 통계 배지 — 우측 */}
            <div className="hidden lg:flex gap-2 flex-shrink-0">
              {[
                { label: '생성 가능', value: `${FORM_PRESETS.length - 1}종+` },
                { label: '생성 시간', value: '~10초' },
                { label: 'PDF 변환', value: '즉시' },
              ].map(stat => (
                <div key={stat.label} className="text-center px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-sm font-extrabold text-primary">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 메인 워크스페이스 ── */}
      <div className={`flex flex-col lg:flex-row gap-4 overflow-hidden ${isFullscreen ? 'flex-1 p-4' : 'flex-1 min-h-0'}`}>

        {/* ══ 왼쪽 컨트롤 패널 ══ */}
        {!isFullscreen && (
          <div className="w-full lg:w-72 flex-shrink-0 rounded-2xl border border-border/60 bg-card shadow-sm flex flex-col overflow-y-auto">

            {/* 양식 종류 선택 */}
            <div className="p-4 border-b border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-3">
                양식 종류 선택
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {FORM_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset.id)
                      if (preset.id !== 'manual') setCustomName('')
                      setGeneratedHtml(null)
                      setShowModify(false)
                    }}
                    className={[
                      'flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all border group',
                      activePreset === preset.id
                        ? 'bg-primary/10 border-primary/40 shadow-sm'
                        : 'border-transparent hover:bg-muted/60 hover:border-border',
                    ].join(' ')}
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <p className={`text-xs font-bold leading-tight ${activePreset === preset.id ? 'text-primary' : 'text-foreground'}`}>
                      {preset.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 입력 폼 */}
            <div className="p-4 space-y-4 flex-1">

              {/* 양식명 — 항상 수정 가능 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  양식명
                  {activePreset !== 'manual' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">자동</span>
                  )}
                </label>
                <Input
                  value={activePreset === 'manual' ? customName : (activePresetData?.label ?? '')}
                  onChange={e => {
                    if (activePreset === 'manual') setCustomName(e.target.value)
                    else {
                      // 프리셋 모드에서도 이름 수정 가능하도록 manual로 전환
                      setActivePreset('manual')
                      setCustomName(e.target.value)
                    }
                  }}
                  placeholder={activePreset === 'manual' ? '예) 주간 업무 보고서' : '클릭해서 이름 수정 가능'}
                  className="bg-background h-9 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              </div>

              {/* 추가 요청사항 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  추가 요청사항
                  <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">선택</span>
                </label>
                <Textarea
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder={
                    activePreset === 'report'   ? '예) 결재란 3단계, 생산량/불량률 입력칸, 합계 자동 계산...' :
                    activePreset === 'resume'   ? '예) 사진란 포함, 자격증 섹션, 외국어 능력 등급 표기...' :
                    activePreset === 'contract' ? '예) 갑·을 서명란, 위약금 조항, 계약 기간 자동 계산...' :
                    '예) 특별히 포함할 항목이나 형식을 입력하세요...'
                  }
                  className="bg-background resize-none text-sm"
                  rows={4}
                />
              </div>

              {/* AI 생성 버튼 */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !resolvedName.trim()}
                className={[
                  'w-full h-11 rounded-xl flex items-center justify-center gap-2',
                  'text-white font-bold text-sm transition-all select-none',
                  'bg-gradient-to-r from-primary to-accent',
                  'hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5',
                  'active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none',
                ].join(' ')}
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중…</>
                  : <><Wand2 className="w-4 h-4" /> AI 양식 생성</>
                }
              </button>

              {/* ── 생성 후 액션 영역 ── */}
              <AnimatePresence>
                {generatedHtml && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-3">
                        문서 액션
                      </p>

                      {/* 다운로드 — 최상단 배치 */}
                      <button
                        onClick={handleDownload}
                        className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> HTML 다운로드
                      </button>

                      {/* 새 창에서 열기 (PDF 저장) */}
                      <button
                        onClick={handleOpenInNewTab}
                        className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-600 hover:bg-blue-500/20 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> 새 창 열기 (PDF 저장)
                      </button>

                      {/* HTML 소스 복사 */}
                      <button
                        onClick={handleCopyHtml}
                        className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" /> HTML 소스 복사
                      </button>

                      {/* AI 수정 요청 */}
                      <button
                        onClick={() => setShowModify(!showModify)}
                        className={[
                          'w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border',
                          showModify
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                        ].join(' ')}
                      >
                        <PencilLine className="w-3.5 h-3.5" /> AI 수정 요청
                      </button>

                      <AnimatePresence>
                        {showModify && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-2"
                          >
                            <Textarea
                              value={modifyRequest}
                              onChange={e => setModifyRequest(e.target.value)}
                              placeholder="예) 결재란 5단계로, 표 색상 파란색으로, 합계 자동 계산 추가..."
                              className="bg-background resize-none text-sm"
                              rows={3}
                            />
                            <button
                              onClick={handleModify}
                              disabled={isModifying || !modifyRequest.trim()}
                              className="w-full h-9 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {isModifying
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><Send className="w-3.5 h-3.5" /> 수정 적용</>
                              }
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* 재생성 / 새 양식 */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> 재생성
                        </button>
                        <button
                          onClick={handleReset}
                          className="flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <RotateCcw className="w-3 h-3" /> 새 양식
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ══ 오른쪽 미리보기 패널 ══ */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-card relative">

          <AnimatePresence mode="wait">

            {/* ── 로딩 상태 (파이프라인 UI) ── */}
            {(isGenerating || isModifying) && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-card z-10 p-8"
              >
                {/* 메인 스피너 */}
                <div className="relative mb-8">
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
                    animate={{ rotate: [0, 6, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <motion.span
                      key={loadingStep}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl"
                    >
                      {LOADING_STEPS[loadingStep]?.icon}
                    </motion.span>
                  </motion.div>
                  {[1, 2].map(r => (
                    <motion.div
                      key={r}
                      className="absolute -inset-3 rounded-3xl border border-primary/20"
                      animate={{ scale: [1, 1.12 + r * 0.06, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: r * 0.5 }}
                    />
                  ))}
                </div>

                {/* 현재 단계 */}
                <motion.h3
                  key={`label-${loadingStep}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-bold text-foreground mb-1"
                >
                  {LOADING_STEPS[loadingStep]?.label}
                </motion.h3>
                <motion.p
                  key={`desc-${loadingStep}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm text-muted-foreground mb-6"
                >
                  {LOADING_STEPS[loadingStep]?.desc}
                </motion.p>

                {/* 진행률 바 */}
                <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    animate={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  {loadingStep + 1} / {LOADING_STEPS.length} 단계
                </p>

                {/* 단계 인디케이터 */}
                <div className="flex gap-3 mt-6">
                  {LOADING_STEPS.map((step, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        i === loadingStep ? 'bg-primary/10 text-primary border border-primary/20' :
                        i < loadingStep  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                        'bg-muted text-muted-foreground/40 border border-transparent'
                      }`}
                      animate={{ scale: i === loadingStep ? 1.05 : 1 }}
                    >
                      {i < loadingStep ? <CheckCircle2 className="w-3 h-3" /> : <span>{step.icon}</span>}
                      <span className="hidden sm:inline">{step.label.split(' ')[0]}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Empty State ── */}
            {!generatedHtml && !isGenerating && !isModifying && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto"
              >
                <div className="w-full max-w-2xl">
                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center mb-4 shadow-sm">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">캔버스가 준비되었습니다</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
                      왼쪽에서 양식 종류를 선택하고 <strong className="text-primary">AI 양식 생성</strong> 버튼을 누르세요.
                      단 10초 만에 완성된 HTML 문서가 여기에 나타납니다.
                    </p>
                  </div>

                  {/* 빠른 시작 카드 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {FORM_PRESETS.filter(p => p.id !== 'manual').slice(0, 4).map((preset, idx) => (
                      <motion.button
                        key={preset.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        onClick={() => { setActivePreset(preset.id); setCustomName('') }}
                        className={[
                          'group p-4 rounded-2xl text-left transition-all border flex flex-col gap-3 hover:-translate-y-1 hover:shadow-md relative overflow-hidden',
                          activePreset === preset.id
                            ? 'bg-primary/5 border-primary/40 shadow-sm'
                            : 'bg-muted/30 border-border/60 hover:border-border hover:bg-card',
                        ].join(' ')}
                      >
                        <span className="text-2xl filter drop-shadow-sm">{preset.icon}</span>
                        <div>
                          <h4 className={`text-sm font-bold ${activePreset === preset.id ? 'text-primary' : 'text-foreground group-hover:text-primary transition-colors'}`}>
                            {preset.label}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{preset.desc}</p>
                        </div>
                        {activePreset === preset.id && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── 생성 완료 미리보기 ── */}
            {generatedHtml && !isGenerating && !isModifying && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* 미리보기 헤더 */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {activePresetData?.icon} {resolvedName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">실시간 라이브 뷰어</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={handleCopyHtml} className="h-7 px-2 text-xs gap-1">
                      <Copy className="w-3 h-3" /> 복사
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleOpenInNewTab} className="h-7 px-2 text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> 새 창
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDownload} className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      <Download className="w-3 h-3" /> 저장
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="h-7 px-2 text-xs gap-1"
                      title={isFullscreen ? '창 모드로 전환' : '전체화면으로 보기'}
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} /> 재생성
                    </Button>
                    {isFullscreen && (
                      <Button size="sm" variant="outline" onClick={() => setIsFullscreen(false)} className="h-7 px-2 text-xs gap-1">
                        <RotateCcw className="w-3 h-3" /> 닫기
                      </Button>
                    )}
                  </div>
                </div>

                {/* iframe 뷰어 */}
                <div className={`flex-1 min-h-0 bg-[#f1f5f9] dark:bg-[#0d1117] p-3 overflow-hidden`}>
                  <div className="w-full h-full bg-white rounded-xl shadow-sm border border-border/40 overflow-hidden ring-1 ring-black/5">
                    <iframe
                      srcDoc={generatedHtml}
                      className="w-full h-full border-none pointer-events-auto bg-white"
                      title="문서 미리보기"
                      sandbox="allow-scripts allow-downloads allow-same-origin allow-popups allow-modals"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
