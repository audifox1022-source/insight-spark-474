// api/identify-audio.js
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const audioData = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype || 'audio/mpeg',
      },
    };

    const prompt =
      'Classify the uploaded audio as either Speech or Music. Return only one English word: Speech or Music.';
    const result = await model.generateContent([prompt, audioData]);
    const text = (await result.response).text().trim().toLowerCase();

    let resultType = 'Unknown';
    if (text.includes('speech')) resultType = 'Speech';
    else if (text.includes('music')) resultType = 'Music';

    return res.status(200).json({ type: resultType });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error occurred' });
  }
}
