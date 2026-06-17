// api/analyze-speech.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createAudioUploadMiddleware } from './_audio-upload.js';
import { applyCorsHeaders, getAuthErrorPayload, requireAuth } from './_auth.js';

const upload = createAudioUploadMiddleware();

const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
};

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  applyCorsHeaders(res, req);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    await requireAuth(req);
  } catch (authError) {
    const { status, body } = getAuthErrorPayload(authError);
    return res.status(status).json(body);
  }

  try {
    await runMiddleware(req, res, upload.single('file'));
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const audioData = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype || 'audio/mp3',
      },
    };

    const prompt = `회의록 분석 전문가로서 오디오를 듣고 아래 JSON 스키마에 맞춰 응답하세요.
{
  "summary": "핵심 요약",
  "actionItems": ["할 일"],
  "sentiment": "감정",
  "speakers": [{ "speaker": "이름", "text": "내용" }],
  "keywords": ["키워드"]
}
반드시 순수 JSON만 반환하세요.`;

    const result = await model.generateContent([prompt, audioData]);
    const text = (await result.response).text().replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(text));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
