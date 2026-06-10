import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import pptxgen from 'pptxgenjs'

const NOTO_SANS_KR_URL = 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf'
let cachedKoreanFontBytes = null

function numberOr(value, fallback) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : fallback
}

function normalizePayload(payload = {}) {
  const canvasSize = payload.canvasSize || {}
  return {
    objects: Array.isArray(payload.objects) ? payload.objects : [],
    canvasSize: {
      width: numberOr(canvasSize.width, 960),
      height: numberOr(canvasSize.height, 540),
    },
    metadata: payload.metadata || {},
  }
}

function parseHexColor(value, fallback = '#0F172A') {
  const raw = String(value || fallback).trim()
  const match = raw.match(/^#?([0-9a-f]{6})$/i)
  const hex = match ? match[1] : fallback.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  return { r, g, b }
}

function toPdfColor(value, fallback) {
  const color = parseHexColor(value, fallback)
  return rgb(color.r, color.g, color.b)
}

function toPptColor(value, fallback = '0F172A') {
  const raw = String(value || fallback).trim()
  const match = raw.match(/^#?([0-9a-f]{6})$/i)
  return match ? match[1].toUpperCase() : fallback
}

function getTextAlign(value) {
  return ['left', 'center', 'right'].includes(value) ? value : 'left'
}

async function fetchKoreanFontBytes() {
  if (cachedKoreanFontBytes) return cachedKoreanFontBytes

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(NOTO_SANS_KR_URL, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Font request failed: ${response.status}`)
    }
    cachedKoreanFontBytes = new Uint8Array(await response.arrayBuffer())
    return cachedKoreanFontBytes
  } finally {
    clearTimeout(timeout)
  }
}

async function getPdfFont(pdfDoc) {
  const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  try {
    pdfDoc.registerFontkit(fontkit)
    const bytes = await fetchKoreanFontBytes()
    return {
      font: await pdfDoc.embedFont(bytes, { subset: true }),
      supportsUnicode: true,
    }
  } catch (error) {
    console.warn('[PDF Export] Korean font load failed, using ASCII fallback:', error.message)
    return {
      font: fallbackFont,
      supportsUnicode: false,
    }
  }
}

function safePdfText(value, supportsUnicode) {
  const text = String(value || '')
  if (supportsUnicode) return text
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?')
}

export async function renderPdfExport(payload) {
  const data = normalizePayload(payload)
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([data.canvasSize.width, data.canvasSize.height])
  const { font, supportsUnicode } = await getPdfFont(pdfDoc)

  page.drawRectangle({
    x: 0,
    y: 0,
    width: data.canvasSize.width,
    height: data.canvasSize.height,
    color: rgb(1, 1, 1),
  })

  for (const item of data.objects) {
    const x = Number(item.x || 0)
    const y = data.canvasSize.height - Number(item.y || 0) - Number(item.height || 0)
    const width = numberOr(item.width, 1)
    const height = numberOr(item.height, 1)

    if (item.type === 'text') {
      page.drawText(safePdfText(item.content, supportsUnicode), {
        x: x + 6,
        y: y + Math.max(6, height - numberOr(item.fontSize, 14) - 6),
        size: numberOr(item.fontSize, 14),
        font,
        color: toPdfColor(item.color, '#0F172A'),
        maxWidth: Math.max(20, width - 12),
        lineHeight: numberOr(item.lineHeight, numberOr(item.fontSize, 14) * 1.2),
      })
      continue
    }

    if (item.type === 'shape' || item.type === 'mask') {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderWidth: numberOr(item.strokeWidth, item.type === 'mask' ? 0 : 1),
        borderColor: toPdfColor(item.color, '#0D9488'),
        color: item.type === 'mask'
          ? rgb(1, 1, 1)
          : (item.fillColor && item.fillColor !== 'transparent' ? toPdfColor(item.fillColor, '#FFFFFF') : undefined),
      })
    }
  }

  return Buffer.from(await pdfDoc.save())
}

export async function renderPptExport(payload) {
  const data = normalizePayload(payload)
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Work AI'
  pptx.subject = data.metadata.fileName || 'PDF editor export'
  pptx.title = data.metadata.fileName || 'Work AI export'

  const slide = pptx.addSlide()
  slide.background = { color: 'FFFFFF' }

  const scaleX = 13.333 / data.canvasSize.width
  const scaleY = 7.5 / data.canvasSize.height

  for (const item of data.objects) {
    const x = Number(item.x || 0) * scaleX
    const y = Number(item.y || 0) * scaleY
    const w = numberOr(item.width, 1) * scaleX
    const h = numberOr(item.height, 1) * scaleY

    if (item.type === 'text') {
      slide.addText(String(item.content || ''), {
        x,
        y,
        w,
        h,
        fontSize: Math.max(6, numberOr(item.fontSize, 14) * 0.75),
        color: toPptColor(item.color, '0F172A'),
        bold: String(item.fontWeight || '').toLowerCase().includes('bold'),
        align: getTextAlign(item.textAlign),
        fit: 'shrink',
      })
      continue
    }

    if (item.type === 'shape' || item.type === 'mask') {
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w,
        h,
        fill: {
          color: item.type === 'mask' || item.fillColor === 'transparent'
            ? 'FFFFFF'
            : toPptColor(item.fillColor, 'FFFFFF'),
          transparency: item.fillColor === 'transparent' ? 100 : 0,
        },
        line: {
          color: toPptColor(item.color, '0D9488'),
          width: numberOr(item.strokeWidth, item.type === 'mask' ? 0 : 1),
          transparency: item.type === 'mask' ? 100 : 0,
        },
      })
    }
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.from(buffer)
}

export async function buildExport(type, payload) {
  if (type === 'pdf') {
    return {
      buffer: await renderPdfExport(payload),
      contentType: 'application/pdf',
      extension: 'pdf',
    }
  }

  if (type === 'ppt') {
    return {
      buffer: await renderPptExport(payload),
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
    }
  }

  const error = new Error('Unsupported export type')
  error.statusCode = 400
  throw error
}
