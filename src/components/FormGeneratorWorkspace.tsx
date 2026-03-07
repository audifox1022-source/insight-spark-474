import { useState } from 'react'
import { formAiService } from '@/lib/form-ai-service'
import { motion, AnimatePresence } from 'framer-motion'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, Download, RefreshCw,
  Loader2, PencilLine, Wand2, Send, Sparkles,
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
    // HTML 대신 Markdown 확장자로 저장
    const blob = new Blob([generatedHtml], { type: 'text/markdown;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${name ?? '문서'}.md`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Markdown (.md) 파일이 다운로드되었습니다!')
  }

  const handleReset = () => {
    setGeneratedHtml(null)
    setModifyRequest('')
    setShowModify(false)
  }

  const activePresetData = FORM_PRESETS.find(p => p.id === activePreset)

  return (
    <div className="flex flex-col h-full gap-0 overflow-hidden">

      {/* ── 상단 타이틀 바 ── */}
      <div className="flex-shrink-0 text-center py-6 border-b border-border bg-card/50">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3 border border-primary/20">
          <FileText className="w-3.5 h-3.5" /> AI 문서 생성기
        </div>
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          WorkAI로{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            업무 양식 자동 생성
          </span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          양식을 선택하고 요청사항을 입력하면 AI가 완성된 HTML 양식을 즉시 생성합니다.
        </p>
      </div>

      {/* ── 2-column 메인 ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ══ 왼쪽 패널 — 양식 선택 & 입력 ══ */}
        <div className="w-72 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-y-auto">

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

        {/* ══ 오른쪽 패널 — 미리보기 ══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
          {!generatedHtml ? (
            /* 생성 전 안내 화면 */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary/60" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-base font-bold text-foreground mb-2">
                  왼쪽에서 양식을 선택하세요
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  양식 종류를 선택하고 요청사항을 입력한 후<br />
                  <span className="text-primary font-semibold">AI 양식 생성</span> 버튼을 클릭하면<br />
                  여기에 완성된 양식이 표시됩니다.
                </p>
              </div>

              {/* 빠른 시작 카드 */}
              <div className="grid grid-cols-3 gap-3 max-w-md w-full">
                {FORM_PRESETS.filter(p => p.id !== 'manual').slice(0, 3).map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActivePreset(preset.id)
                      setFormName(preset.label)
                    }}
                    className={[
                      'p-4 rounded-xl border-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5',
                      activePreset === preset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40',
                    ].join(' ')}
                  >
                    <div className="text-2xl mb-1">{preset.icon}</div>
                    <p className="text-xs font-bold text-foreground">{preset.label}</p>
                  </button>
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
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-card/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-foreground">미리보기</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {activePresetData?.icon} {activePresetData?.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AI 생성 완료
                </div>
              </div>

              {/* 텍스트 렌더링 영역 (Markdown 원문 표시) */}
              <div className="flex-1 min-h-0 bg-background/50 p-6 overflow-y-auto custom-scrollbar">
                <pre className="text-sm font-sans text-foreground whitespace-pre-wrap font-medium">
                  {generatedHtml}
                </pre>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  )
}
