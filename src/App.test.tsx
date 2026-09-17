import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('WorkAI 핵심 흐름', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))) })

  it('홈에서 자료를 입력해 발표자료 편집기로 이동한다', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('주제, 회의 메모, 보고서 요약을 붙여넣으세요…'), { target: { value: '분기 실적\n매출이 증가했습니다.' } })
    fireEvent.click(screen.getByRole('button', { name: /구성안 만들기/ }))
    await waitFor(() => expect(screen.getByText('구성안 · 4장')).toBeInTheDocument())
    expect(screen.getAllByDisplayValue('분기 실적').length).toBeGreaterThan(0)
  })

  it('슬라이드 추가와 AI 수정이 현재 슬라이드에만 적용된다', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '발표자료' }))
    fireEvent.click(screen.getAllByRole('button', { name: '슬라이드 추가' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'AI로 수정' }))
    fireEvent.click(screen.getByRole('button', { name: '메시지 선명하게' }))
    expect(screen.getByDisplayValue('새 슬라이드 · 검토 포인트')).toBeInTheDocument()
    expect(screen.getByText('구성안 · 5장')).toBeInTheDocument()
  })

  it('업무 도구 탭을 독립적으로 연다', () => {
    render(<App />)
    fireEvent.click(screen.getAllByRole('button', { name: '업무 번역' })[0])
    expect(screen.getByRole('heading', { name: '업무 문장을 정확히 이해하고 쓰세요.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'PDF 도구' }))
    expect(screen.getByRole('heading', { name: '일상적인 PDF 작업을 한 곳에서 처리하세요.' })).toBeInTheDocument()
  })
})
