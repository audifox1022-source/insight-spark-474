import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_DIRECTOR_PROMPT = `
You are a senior presentation designer and content strategist.
Analyze the user's material and return only valid JSON.

Return this schema:
{
  "styleName": "string",
  "theme": {
    "backgroundColor": "string",
    "textColor": "string",
    "accent1": "string"
  },
  "slides": [
    {
      "id": "string",
      "slideType": "Title|Detail|Conclusion",
      "layout": "Center|Split_Left|Split_Right|Grid|Horizontal_List",
      "title": "string",
      "subtitle": "string",
      "coreContent": "string",
      "bulletPoints": ["string"],
      "highlightWords": ["string"]
    }
  ]
}
`

const FALLBACK_THEME = {
  backgroundColor: '#0B162C',
  textColor: '#FFFFFF',
  accent1: '#0D9488',
}

function cleanJson(text) {
  return String(text || '').replace(/```json\n?|\n?```/g, '').trim()
}

function normalizeSlide(slide, index) {
  const title = String(slide?.title || `Slide ${index + 1}`)
  const coreContent = String(
    slide?.coreContent ||
    slide?.description ||
    slide?.content ||
    '핵심 내용을 정리했습니다.'
  )

  return {
    id: String(slide?.id || `slide-${index + 1}`),
    slideType: ['Title', 'Detail', 'Conclusion'].includes(slide?.slideType)
      ? slide.slideType
      : (index === 0 ? 'Title' : 'Detail'),
    layout: ['Center', 'Split_Left', 'Split_Right', 'Grid', 'Horizontal_List'].includes(slide?.layout)
      ? slide.layout
      : (index === 0 ? 'Center' : 'Grid'),
    title,
    subtitle: slide?.subtitle ? String(slide.subtitle) : '',
    coreContent,
    bulletPoints: Array.isArray(slide?.bulletPoints)
      ? slide.bulletPoints.map(String).slice(0, 5)
      : [],
    highlightWords: Array.isArray(slide?.highlightWords)
      ? slide.highlightWords.map(String).slice(0, 5)
      : title.split(/\s+/).filter(Boolean).slice(0, 2),
  }
}

function normalizePresentation(parsed, input) {
  const rawSlides = Array.isArray(parsed?.slides) && parsed.slides.length > 0
    ? parsed.slides
    : [
        {
          slideType: 'Title',
          layout: 'Center',
          title: input.slice(0, 60) || 'Presentation',
          coreContent: '입력 내용을 기반으로 발표 구조를 생성했습니다.',
        },
      ]

  return {
    styleName: String(parsed?.styleName || 'Work AI Strategic Brief'),
    theme: {
      ...FALLBACK_THEME,
      ...(parsed?.theme || {}),
    },
    slides: rawSlides.map(normalizeSlide),
  }
}

export async function generateBananaPresentation(apiKey, input) {
  const documentText = String(input || '').trim()
  if (!documentText) {
    const error = new Error('documentText or prompt is required')
    error.statusCode = 400
    throw error
  }

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is missing')
    error.statusCode = 500
    throw error
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_DIRECTOR_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const result = await model.generateContent(documentText)
  const text = result.response.text()
  const parsed = JSON.parse(cleanJson(text))
  return normalizePresentation(parsed, documentText)
}
