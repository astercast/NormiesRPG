import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { slot = 'main', data } = req.body || {};
    if (!data || typeof data !== 'object') {
      res.status(400).json({ ok: false, error: 'Missing save payload' });
      return;
    }

    const key = `normies:rpg:${slot}`;
    await redis.set(key, data);
    res.status(200).json({ ok: true, key });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || 'Failed to save' });
  }
}
