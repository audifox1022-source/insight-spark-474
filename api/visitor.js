// api/visitor.js
import { applyCorsHeaders } from './_auth.js';
import { getVisitorStats, trackVisitorEvent } from '../server/visitor-store.js';

export default async function handler(req, res) {
  applyCorsHeaders(res, req, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    if (req.method === 'POST') {
      const { type } = req.body ?? {};
      await trackVisitorEvent(type, today);
    }

    return res.status(200).json(await getVisitorStats(today));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
