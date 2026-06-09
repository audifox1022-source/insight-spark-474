// api/visitor.js
import { applyCorsHeaders } from './_auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvPipeline(commands) {
  if (!KV_URL || !KV_TOKEN) {
    return [];
  }

  const response = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  return response.json();
}

function resultAt(results, index, fallback = 0) {
  return Number(results?.[index]?.result ?? fallback) || 0;
}

export default async function handler(req, res) {
  applyCorsHeaders(res, req, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const commands = [];

    if (req.method === 'POST') {
      const { type } = req.body ?? {};

      if (type === 'visit') {
        commands.push(['INCR', 'total_visits']);
        commands.push(['INCR', `today_visits:${today}`]);
      }

      if (type === 'unique') {
        commands.push(['INCR', 'unique_users']);
        commands.push(['INCR', `today_unique:${today}`]);
      }
    }

    commands.push(
      ['GET', 'total_visits'],
      ['GET', 'unique_users'],
      ['GET', `today_visits:${today}`],
      ['GET', `today_unique:${today}`],
    );

    const results = await kvPipeline(commands);
    const offset = commands.length - 4;

    return res.status(200).json({
      total_visits: resultAt(results, offset),
      unique_users: resultAt(results, offset + 1),
      today_visits: resultAt(results, offset + 2),
      today_unique: resultAt(results, offset + 3),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
