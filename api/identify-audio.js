// api/identify-audio.js
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyCorsHeaders, getAuthErrorPayload, requireAuth } from './_auth.js';

// Vercel 하드 리밋(4.5MB)이 존재하지만, 코드 레벨에서는 50MB까지 허용하도록 설정
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

export const config = {
  api: { bodyParser: false },
};

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
    const genAI = new GoogleGenerativeAI(API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const audioData = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype || 'audio/mp3',
      },
    };

    const prompt = '이 오디오 파일을 듣고, 주로 사람들이 말하는 회의/음성 녹음(Speech)인지, 아니면 악기 연주와 노래가 포함된 음악(Music)인지 식별해. "Speech" 또는 "Music" 중 하나의 단어로만 대답해.';
    const result = await model.generateContent([prompt, audioData]);
    const text = (await result.response).text().trim().toLowerCase();

    let resultType = 'Unknown';
    if (text.includes('speech')) resultType = 'Speech';
    else if (text.includes('music')) resultType = 'Music';

    res.status(200).json({ type: resultType });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Error occurred' });
  }
}
