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

// ── 양식 프리셋 ────────────────────────────────────────────
const FORM_PRESETS = [
  { id: 'report',   icon: '📊', label: '보고서'  },
  { id: 'plan',     icon: '📋', label: '계획서'  },
  { id: 'meeting',  icon: '👥', label: '회의록'  },
  { id: 'proposal', icon: '🤝', label: '제안서'  },
  { id: 'approval', icon: '✅', label: '품의서'  },
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

  // ── 양식 생성 ──────────────────────────────────────────
  const handleGenerate = async () => {
    const name = activePreset !== 'manual'
      ? FORM_PRESETS.find(p => p.id === activePreset)?.label ?? formName
      : formName

    if (!name.trim()) {
      toast.error('양식명을 입력해주세요.')
      return
    }

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

  // ── 양식 수정 ──────────────────────────────────────────
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

  // ── HTML 파일 다운로드 ────────────────────────────────
  const handleDownload = () => {
    if (!generatedHtml) return
    const name = activePreset !== 'manual'
      ? FORM_PRESETS.find(p => p.id === activePreset)?.label
      : formName
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${name ?? '양식'}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('HTML 파일이 다운로드되었습니다!')
  }

  // ── 초기화 ─────────────────────────────────────────────
  const handleReset = () => {
    setGeneratedHtml(null)
    setModifyRequest('')
    setShowModify(false)
    setRequirements('')
  }

  return (
    <div className="flex flex-col h-full gap-6">

      {/* ── 상단 타이틀 ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-3">
          <FileText className="w-3 h-3" /> AI 문서 생성기
        </div>
        <h2 className="text-3xl font-black tracking-tight leading-tight">
          WorkAI로<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            업무 양식 자동 생성
          </span>
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          양식명과 요청사항을 입력하면<br />
          AI가 완성된 HTML 양식을 즉시 생성합니다.
        </p>
      </motion.div>

      {/* ── 입력 영역 ─────────────────────────────────────── */}
      {!generatedHtml && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto w-full space-y-4"
        >
          {/* 프리셋 선택 */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
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
                    ? 'bg-background shadow-sm text-primary border border-border/50'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* 양식명 입력 (직접 입력 모드일 때만) */}
          {activePreset === 'manual' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">양식명</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="예) 주간 업무 보고서, 출장 신청서, 프로젝트 계획서"
                className="bg-background h-11"
              />
            </div>
          )}

          {/* 요청사항 */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">
              요청사항 <span className="font-normal text-muted-foreground">(선택)</span>
            </label>
            <Textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="예) 태웅 15000톤 프레스 생산 현황 입력 칸 포함, 결재란 3단계, 날짜 자동 입력..."
              className="bg-background min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          {/* 생성 버튼 */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!formName.trim() && activePreset === 'manual')}
            className="w-full h-14 rounded-xl gap-2 gradient-primary border-0 text-white font-bold text-base shadow-sm"
          >
            {isGenerating
              ? <><Loader2 className="w-5 h-5 animate-spin" /> AI가 양식을 생성하고 있습니다…</>
              : <><Wand2   className="w-5 h-5" /> AI 양식 생성</>
            }
          </Button>
        </motion.div>
      )}

      {/* ── 생성 결과 영역 ────────────────────────────────── */}
      <AnimatePresence>
        {generatedHtml && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-4 flex-1 min-h-0"
          >
            {/* 버튼 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-foreground">양식 생성 완료!</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowModify(!showModify)}
                  className="gap-1.5 text-xs h-8"
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  수정 요청
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={handleDownload}
                  className="gap-1.5 text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  HTML 다운로드
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-xs h-8 text-muted-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  새 양식
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
                  <div className="bg-card border border-border rounded-xl p-4 flex gap-2">
                    <Textarea
                      value={modifyRequest}
                      onChange={e => setModifyRequest(e.target.value)}
                      placeholder="수정 요청사항을 입력하세요. 예) 결재란 추가, 배경색을 파란색으로 변경..."
                      className="flex-1 min-h-[60px] resize-none text-sm"
                      rows={2}
                    />
                    <Button
                      onClick={handleModify}
                      disabled={isModifying || !modifyRequest.trim()}
                      className="h-full px-4 gradient-primary border-0 text-white font-bold self-end"
                    >
                      {isModifying
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send    className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 미리보기 iframe */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-border shadow-elevated min-h-[500px]">
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
