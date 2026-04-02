// api/analyze-speech.js
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    await runMiddleware(req, res, upload.single('file'));
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY || '');
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
