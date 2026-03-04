import { useState } from 'react'
import { formAiService } from '@/lib/form-ai-service'
import { motion, AnimatePresence } from 'framer-motion'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles, FileText, Download, RefreshCw,
  Loader2, PencilLine, Wand2, Send,
} from 'lucide-react'
import { toast } from 'sonner'

const FORM_PRESETS = [
  { id: 'report',   icon: '📊', label: '보고서'   },
  { id: 'plan',     icon: '📋', label: '계획서'   },
  { id: 'meeting',  icon: '👥', label: '회의록'   },
  { id: 'proposal', icon: '🤝', label: '제안서'   },
  { id: 'approval', icon: '✅', label: '품의서'   },
  { id: 'manual',   icon: '✏️', label: '직접 입력' },
]

export function FormGeneratorWorkspace() {
  const [activePreset,  setActivePreset]  = useState('manual')
  const [formName,      setFormName]      = useState('')
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
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${name ?? '양식'}.html`; a.click()
    URL.revokeObjectURL(url)
    toast.success('HTML 파일이 다운로드되었습니다!')
  }

  const handleReset = () => {
    setGeneratedHtml(null); setModifyRequest('')
    setShowModify(false);   setRequirements('')
  }

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto">

      {/* ── 타이틀 ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto pt-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 border border-primary/20">
          <FileText className="w-3.5 h-3.5" /> AI 문서 생성기
        </div>
        <h2 className="text-4xl font-black tracking-tight leading-tight text-foreground">
          WorkAI로<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            업무 양식 자동 생성
          </span>
        </h2>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          양식명과 요청사항을 입력하면<br className="hidden sm:block" />
          AI가 완성된 HTML 양식을 즉시 생성합니다.
        </p>
      </motion.div>

      {/* ── 입력 영역 ── */}
      {!generatedHtml && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto w-full space-y-5"
        >
          {/* 프리셋 탭 */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-muted/60 rounded-2xl w-fit mx-auto border border-border">
            {FORM_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setActivePreset(preset.id)
                  if (preset.id !== 'manual') setFormName(preset.label)
                  else setFormName('')
                }}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all',
                  activePreset === preset.id
                    ? 'bg-background shadow-sm text-primary border border-border/50 ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                ].join(' ')}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* 카드 래퍼 */}
          <div className="bg-card rounded-2xl border border-border shadow-md p-6 space-y-5">

            {/* 양식명 (직접 입력 시) */}
            {activePreset === 'manual' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">양식명</label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="예) 주간 업무 보고서, 출장 신청서, 프로젝트 계획서"
                  className="bg-background h-11 text-sm font-medium border-border/80 focus:border-primary"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
              </div>
            )}

            {/* 프리셋 선택 시 양식명 표시 */}
            {activePreset !== 'manual' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
                <span className="text-2xl">
                  {FORM_PRESETS.find(p => p.id === activePreset)?.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {FORM_PRESETS.find(p => p.id === activePreset)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground">AI가 최적화된 양식을 생성합니다</p>
                </div>
              </div>
            )}

            {/* 요청사항 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground flex items-center gap-2">
                요청사항
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md">선택</span>
              </label>
              <Textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder={`예) 태웅 15000톤 프레스 생산 현황 입력 칸 포함, 결재란 3단계, 날짜 자동 입력...`}
                className="bg-background min-h-[110px] resize-none text-sm leading-relaxed border-border/80 focus:border-primary"
                rows={4}
              />
            </div>

            {/* 생성 버튼 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!formName.trim() && activePreset === 'manual')}
              className={[
                'w-full h-14 rounded-xl flex items-center justify-center gap-2.5',
                'text-white font-bold text-base transition-all',
                'bg-gradient-to-r from-primary to-accent shadow-lg',
                'hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
              ].join(' ')}
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> AI가 양식을 생성하고 있습니다…</>
              ) : (
                <><Wand2 className="w-5 h-5" /> AI 양식 생성</>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* ── 생성 결과 영역 ── */}
      <AnimatePresence>
        {generatedHtml && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-4 flex-1 min-h-0"
          >
            {/* 버튼 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-foreground">양식 생성 완료!</span>
                <span className="text-xs text-muted-foreground">
                  {FORM_PRESETS.find(p => p.id === activePreset)?.label ?? formName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => setShowModify(!showModify)}
                  className={['gap-1.5 text-xs h-8', showModify ? 'border-primary text-primary' : ''].join(' ')}
                >
                  <PencilLine className="w-3.5 h-3.5" /> 수정 요청
                </Button>
                <Button variant="outline" size="sm"
                  onClick={handleDownload}
                  className="gap-1.5 text-xs h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Download className="w-3.5 h-3.5" /> HTML 다운로드
                </Button>
                <Button variant="outline" size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-xs h-8 text-muted-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 새 양식
                </Button>
              </div>
            </div>

            {/* 수정 요청 입력창 */}
            <AnimatePresence>
              {showModify && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-primary/30 rounded-xl p-4 flex gap-2 shadow-sm">
                    <Textarea
                      value={modifyRequest}
                      onChange={e => setModifyRequest(e.target.value)}
                      placeholder="수정 요청사항을 입력하세요. 예) 결재란 추가, 배경색을 파란색으로 변경..."
                      className="flex-1 min-h-[60px] resize-none text-sm"
                      rows={2}
                    />
                    <button
                      onClick={handleModify}
                      disabled={isModifying || !modifyRequest.trim()}
                      className={[
                        'px-4 rounded-lg flex items-center justify-center',
                        'bg-gradient-to-r from-primary to-accent text-white font-bold',
                        'hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      {isModifying
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send    className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 미리보기 iframe */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-border shadow-xl min-h-[500px]">
              <iframe
                srcDoc={generatedHtml}
                className="w-full h-full"
                title="양식 미리보기"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
