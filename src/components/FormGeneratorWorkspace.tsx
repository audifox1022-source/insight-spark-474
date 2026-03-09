import { useState, useImperativeHandle, forwardRef } from 'react'
import { formAiService } from '@/lib/form-ai-service'
import { motion, AnimatePresence } from 'framer-motion'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, Download, RefreshCw,
  Loader2, PencilLine, Wand2, Send, Sparkles, X, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DocumentHtmlEditor } from './form/DocumentHtmlEditor'
import { FormHelpModal } from './form/FormHelpModal'

const FORM_PRESETS = [
  { id: 'report',   icon: '📊', label: '보고서',   desc: '주간/월간 업무 보고서'   },
  { id: 'plan',     icon: '📋', label: '계획서',   desc: '프로젝트·업무 계획서'    },
  { id: 'meeting',  icon: '👥', label: '회의록',   desc: '회의 내용 기록 양식'      },
  { id: 'proposal', icon: '🤝', label: '제안서',   desc: '사업·개선 제안서'        },
  { id: 'approval', icon: '✅', label: '품의서',   desc: '결재·승인 요청 양식'     },
  { id: 'manual',   icon: '✏️', label: '직접 입력', desc: '양식명을 직접 입력'      },
]

export const FormGeneratorWorkspace = forwardRef(({ onBack }: { onBack?: () => void }, ref) => {
  const [activePreset,  setActivePreset]  = useState('report')
  const [formName,      setFormName]      = useState('보고서')
  const [requirements,  setRequirements]  = useState('')
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null)
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [isModifying,   setIsModifying]   = useState(false)
  const [modifyRequest, setModifyRequest] = useState('')
  const [showModify,    setShowModify]    = useState(false)
  const [isCompact,     setIsCompact]     = useState(false)
  const [isAutoFill,    setIsAutoFill]    = useState(false)
  const [isHelpOpen,    setIsHelpOpen]    = useState(false)

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (generatedHtml) {
        handleReset()
        return true
      }
      return false
    }
  }))

  const handleGenerate = async () => {
    const name = activePreset !== 'manual'
      ? FORM_PRESETS.find(p => p.id === activePreset)?.label ?? formName
      : formName
    if (!name.trim()) { toast.error('양식명을 입력해주세요.'); return }
    setIsGenerating(true)
    try {
      const html = await formAiService.generateForm(name, requirements, {
        isCompact,
        isAutoFill
      })
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
    setGeneratedHtml(null)
    setModifyRequest('')
    setShowModify(false)
  }

  const activePresetData = FORM_PRESETS.find(p => p.id === activePreset)

  return (
    <div className="flex flex-col h-full gap-0 overflow-hidden">

      {/* ── 상단 타이틀 바 ── */}
      <div className={cn(
        "flex-shrink-0 text-center border-b border-border bg-card/50 transition-all duration-500",
        generatedHtml ? "py-2" : "py-6"
      )}>
        <AnimatePresence>
          {!generatedHtml && (
            <motion.div 
              initial={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3 border border-primary/20"
            >
              <FileText className="w-3.5 h-3.5" /> AI 문서 생성기
            </motion.div>
          )}
        </AnimatePresence>
        
        <h2 className={cn(
          "font-black tracking-tight text-foreground transition-all duration-500",
          generatedHtml ? "text-lg" : "text-3xl"
        )}>
          WorkAI로{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            업무 양식 자동 생성
          </span>
        </h2>
        
        {!generatedHtml && (
          <p className="text-muted-foreground mt-2 text-sm transition-all duration-500">
            양식을 선택하고 요청사항을 입력하면 AI가 완성된 HTML 양식을 즉시 생성합니다.
          </p>
        )}
      </div>

      {/* ── 2-column 메인 ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ══ 왼쪽 패널 — 양식 선택 & 입력 ══ */}
        <div className={cn(
          "flex-shrink-0 border-border bg-card flex flex-col transition-all duration-300 overflow-hidden",
          generatedHtml ? "w-0 border-r-0" : "w-64 border-r"
        )}>

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
                    <p className={['text-xs font-bold leading-tight', // Reduced text size slightly
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

            {/* 고급 설정 */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  고급 설정
                </p>
                <button 
                  onClick={() => setIsHelpOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> 사용 가이드
                </button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setIsCompact(!isCompact)}
                    className={cn(
                      "w-8 h-4.5 rounded-full p-0.5 transition-colors",
                      isCompact ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform",
                      isCompact ? "translate-x-3.5" : "translate-x-0"
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">Compact Layout</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setIsAutoFill(!isAutoFill)}
                    className={cn(
                      "w-8 h-4.5 rounded-full p-0.5 transition-colors",
                      isAutoFill ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform",
                      isAutoFill ? "translate-x-3.5" : "translate-x-0"
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">Auto-fill Toggle</span>
                </label>
              </div>
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

              <AnimatePresence>
                {/* Modifying section moved to top of right panel */}
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
              {/* 미리보기 헤더 (AI 수정 패널 추가) */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 z-20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-foreground">문서 자동 생성 완료</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {activePresetData?.icon} {activePresetData?.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* AI Modify Popover Togller */}
                  <div className="relative">
                     <Button
                       onClick={() => setShowModify(!showModify)}
                       variant={showModify ? 'default' : 'outline'}
                       size="sm"
                       className="h-8 gap-1.5 text-xs font-bold"
                     >
                       <Wand2 className="w-3.5 h-3.5" /> 
                       AI 수정 요청
                     </Button>
                     
                     <AnimatePresence>
                       {showModify && (
                         <motion.div
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 10, scale: 0.95 }}
                           className="absolute top-10 right-0 w-[320px] bg-card border border-border/80 rounded-xl shadow-2xl p-4 z-50 flex flex-col gap-3"
                         >
                           <div className="flex justify-between items-center mb-1">
                             <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                               <Sparkles className="w-3.5 h-3.5 text-primary" /> AI에게 문서 수정 맡기기
                             </h4>
                             <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setShowModify(false)}>
                               <X className="w-3.5 h-3.5 text-muted-foreground" />
                             </Button>
                           </div>
                           <Textarea
                             value={modifyRequest}
                             onChange={e => setModifyRequest(e.target.value)}
                             placeholder="수정 요청사항 예) 결재란 추가, 배경색을 연한 파란색으로 변경..."
                             className="bg-background resize-none text-xs min-h-[80px]"
                             rows={3}
                           />
                           <Button
                             onClick={handleModify}
                             disabled={isModifying || !modifyRequest.trim()}
                             size="sm"
                             className="w-full text-xs font-bold gap-1.5"
                           >
                             {isModifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                             수정 적용
                           </Button>
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </div>
                  
                  <div className="w-px h-5 bg-border mx-1" />
                  
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    title="새 양식 / 설정창 열기"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="flex-1 min-h-0 bg-muted/10">
                <DocumentHtmlEditor
                  initialHtml={generatedHtml}
                  onChange={setGeneratedHtml}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <FormHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
});
