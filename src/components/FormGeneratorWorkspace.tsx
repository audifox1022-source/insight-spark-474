import { useState } from 'react'
import { formAiService } from '@/lib/form-ai-service'
import { motion, AnimatePresence } from 'framer-motion'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, Download, RefreshCw,
  Loader2, PencilLine, Wand2, Send, Sparkles, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'

const FORM_PRESETS = [
  { id: 'report',   icon: '📊', label: '보고서',   desc: '주간/월간 업무 보고서'   },
  { id: 'plan',     icon: '📋', label: '계획서',   desc: '프로젝트·업무 계획서'    },
  { id: 'meeting',  icon: '👥', label: '회의록',   desc: '회의 내용 기록 양식'      },
  { id: 'proposal', icon: '🤝', label: '제안서',   desc: '사업·개선 제안서'        },
  { id: 'approval', icon: '✅', label: '품의서',   desc: '결재·승인 요청 양식'     },
  { id: 'manual',   icon: '✏️', label: '직접 입력', desc: '양식명을 직접 입력'      },
]

export function FormGeneratorWorkspace() {
  const [activePreset,  setActivePreset]  = useState('report')
  const [formName,      setFormName]      = useState('보고서')
  const [requirements,  setRequirements]  = useState('')
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [isModifying,   setIsModifying]   = useState(false)
  const [modifyRequest, setModifyRequest] = useState('')
  const [showModify,    setShowModify]    = useState(false)

  const handleGenerate = async () => {
    const name = activePreset !== 'manual'
      ? FORM_PRESETS.find(p => p.id === activePreset)?.label ?? formName
      : formName
    if (!name.trim()) { toast.error('양식명을 입력해주세요.'); return }
    setIsGenerating(true)
    try {
      const html = await formAiService.generateForm(name, requirements)
      setGeneratedHtml(html)
      toast.success('양식이 생성되었습니다!')
    } catch (err: any) {
      toast.error(err.message ?? '양식 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleModify = async () => {
    if (!generatedHtml || !modifyRequest.trim()) return
    setIsModifying(true)
    try {
      const html = await formAiService.modifyForm(generatedHtml, modifyRequest)
      setGeneratedHtml(html)
      setModifyRequest('')
      setShowModify(false)
      toast.success('양식이 수정되었습니다!')
    } catch (err: any) {
      toast.error(err.message ?? '수정 중 오류가 발생했습니다.')
    } finally {
      setIsModifying(false)
    }
  }

  const handleDownload = () => {
    if (!generatedHtml) return
    const name = activePreset !== 'manual'
      ? FORM_PRESETS.find(p => p.id === activePreset)?.label
      : formName
    // .html 확장자로 저장
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${name ?? '문서'}.html`; a.click()
    URL.revokeObjectURL(url)
    toast.success('HTML 파일이 다운로드되었습니다!')
  }

  const handleReset = () => {
    setGeneratedHtml(null)
    setModifyRequest('')
    setShowModify(false)
  }

  const activePresetData = FORM_PRESETS.find(p => p.id === activePreset)

  return (
    <div className="flex flex-col h-full gap-4 p-2 md:p-4 overflow-hidden max-w-[1400px] mx-auto w-full">

      {/* ── 상단 타이틀 바 (간결하고 현대적인 디자인) ── */}
      <div className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border/60 shadow-sm relative overflow-hidden">
        {/* 장식용 배경 */}
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Wand2 className="w-48 h-48 rotate-12" />
        </div>
        
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 만능 문서 생성 마스터
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            WorkAI{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              고품격 웹 문서 제너레이터
            </span>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            아이디어만 입력하세요. 완벽한 레이아웃과 서식을 갖춘 HTML 양식을 즉시 만들어냅니다.
          </p>
        </div>
      </div>

      {/* ── 메인 워크스페이스 (Bento Grid) ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4 overflow-hidden">

        {/* ══ 왼쪽 패널 — 시크한 컨트롤 패널 ══ */}
        <div className="w-full lg:w-80 flex-shrink-0 rounded-2xl border border-border/60 bg-card shadow-sm flex flex-col overflow-y-auto">

          {/* 양식 종류 선택 */}
          <div className="p-4 border-b border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              양식 종류
            </p>
            <div className="space-y-1">
              {FORM_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setActivePreset(preset.id)
                    if (preset.id !== 'manual') setFormName(preset.label)
                    else setFormName('')
                    setGeneratedHtml(null)
                    setShowModify(false)
                  }}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all',
                    activePreset === preset.id
                      ? 'bg-primary/10 border border-primary/30 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent',
                  ].join(' ')}
                >
                  <span className="text-xl flex-shrink-0">{preset.icon}</span>
                  <div className="min-w-0">
                    <p className={['text-sm font-bold leading-tight',
                      activePreset === preset.id ? 'text-primary' : ''
                    ].join(' ')}>
                      {preset.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{preset.desc}</p>
                  </div>
                  {activePreset === preset.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 입력 폼 */}
          <div className="p-4 space-y-4 flex-1">

            {/* 양식명 (직접 입력 시) */}
            {activePreset === 'manual' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">양식명</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="예) 주간 업무 보고서"
                  className="bg-background h-10 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              </div>
            )}

            {/* 요청사항 */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                요청사항
                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">선택</span>
              </label>
              <Textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder={
                  activePreset === 'report'
                    ? '예) 결재란 3단계, 생산량/불량률 입력칸, 날짜 자동입력...'
                    : '예) 특별히 포함할 항목이나 형식을 입력하세요...'
                }
                className="bg-background resize-none text-sm min-h-[120px]"
                rows={5}
              />
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!formName.trim() && activePreset === 'manual')}
              className={[
                'w-full h-12 rounded-xl flex items-center justify-center gap-2',
                'text-white font-bold text-sm transition-all',
                'bg-gradient-to-r from-primary to-accent',
                'hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0',
              ].join(' ')}
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중…</>
                : <><Wand2 className="w-4 h-4" /> AI 양식 생성</>
              }
            </button>

            {/* 수정 요청 (생성 후) */}
            <AnimatePresence>
              {generatedHtml && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => setShowModify(!showModify)}
                      className={[
                        'w-full h-9 rounded-xl flex items-center justify-center gap-2',
                        'text-sm font-bold transition-all border',
                        showModify
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      <PencilLine className="w-3.5 h-3.5" /> 수정 요청
                    </button>

                    <AnimatePresence>
                      {showModify && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="space-y-2">
                            <Textarea
                              value={modifyRequest}
                              onChange={e => setModifyRequest(e.target.value)}
                              placeholder="수정 요청사항 예) 결재란 추가, 배경색 변경..."
                              className="bg-background resize-none text-sm min-h-[80px]"
                              rows={3}
                            />
                            <button
                              onClick={handleModify}
                              disabled={isModifying || !modifyRequest.trim()}
                              className={[
                                'w-full h-9 rounded-xl flex items-center justify-center gap-2',
                                'text-white font-bold text-sm transition-all',
                                'bg-gradient-to-r from-primary to-accent',
                                'hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
                              ].join(' ')}
                            >
                              {isModifying
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <><Send className="w-3.5 h-3.5" /> 수정 적용</>
                              }
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 다운로드 & 초기화 */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleDownload}
                        className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> 다운로드
                      </button>
                      <button
                        onClick={handleReset}
                        className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> 새 양식
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ══ 오른쪽 패널 — 라이브 뷰어 (Preview) ══ */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-border/60 shadow-sm overflow-hidden bg-muted/10 relative">
          {!generatedHtml ? (
            /* 생성 전 Empty State (Bento Style) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card border-none">
              
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 메인 타이틀 & 가이드 */}
                <div className="col-span-full text-center mb-6">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center mb-4 shadow-sm">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">새로운 캔버스가 준비되었습니다</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-md mx-auto">
                    왼쪽 패널에서 양식 종류를 선택하고 필요한 정보나 조건을 요청사항에 적어주세요. AI가 <strong className="text-primary font-semibold">단 10초 만에 분석 가능한 스마트 문서</strong>를 생성합니다.
                  </p>
                </div>

                {/* 제안 카드 그리드 */}
                {FORM_PRESETS.filter(p => p.id !== 'manual').slice(0, 4).map((preset, idx) => (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset.id)
                      setFormName(preset.label)
                    }}
                    className={[
                      'group p-5 rounded-2xl text-left transition-all border shadow-sm relative overflow-hidden flex flex-col justify-between h-32 hover:-translate-y-1',
                      activePreset === preset.id
                        ? 'bg-primary/5 border-primary shadow-primary/10'
                        : 'bg-background hover:bg-muted/50 border-border/60 hover:border-border hover:shadow-md',
                    ].join(' ')}
                  >
                    <div className="flex justify-between items-start z-10 relative">
                      <span className="text-3xl filter drop-shadow-sm">{preset.icon}</span>
                      {activePreset === preset.id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="z-10 relative mt-auto">
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{preset.label} 작성하기</h4>
                      <p className="text-xs text-muted-foreground mt-1">{preset.desc}</p>
                    </div>
                    {/* 호버 백그라운드 효과 */}
                    <div className="absolute right-0 bottom-0 opacity-[0.03] text-8xl -mr-6 -mb-6 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                      {preset.icon}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            /* 생성 후 미리보기 */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* 미리보기 헤더 */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/60 bg-card/80 backdrop-blur-sm z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      실시간 라이브 뷰어
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-md border border-border/50">
                        {activePresetData?.icon} {activePresetData?.label}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">스마트 생성 완료</span>
                </div>
              </div>

              {/* HTML 런타임 렌더링 영역 (iframe) */}
              <div className="flex-1 min-h-0 bg-[#eef2f5] dark:bg-[#0f1115] relative p-0 md:p-4 overflow-hidden">
                <div className="w-full h-full bg-white rounded-xl shadow-sm border border-border overflow-hidden ring-1 ring-black/5">
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-full border-none pointer-events-auto bg-white"
                    title="Form Preview"
                    sandbox="allow-scripts allow-downloads allow-same-origin allow-popups"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  )
}
